const pdfParse = require('pdf-parse');
const Candidate = require('../models/Candidate');
const { getEmbedding } = require('../services/embeddingService');
const { rankCandidates, extractCandidateInfo } = require('../services/rankingService');
const { Pinecone } = require('@pinecone-database/pinecone');

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index(process.env.PINECONE_INDEX);

//  email regex
const extractEmail = (text) => {
    const emailRegex = /\b[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/;
    const match = text.match(emailRegex);
    return match ? match[0] : null;
}

// ======================================================
// HANDLE RESUME UPLOAD 
// ======================================================
exports.handleResumeUpload = async (req, res) => {
    try {
        const { jobDescription, email } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "No PDF file uploaded" });
        }

        // 1. PARSE PDF
        const pdfData = await pdfParse(file.buffer);
        const resumeText = pdfData.text;

        if (resumeText.length < 50) {
            return res.status(400).json({ error: "PDF too short or unreadable" });
        }

        // 2. EXTRACT STRUCTURED DATA (NEW)
        console.log("extracting structured data...");
        const structuredData = await extractCandidateInfo(resumeText);
        
        if (structuredData.extractionFailed) {
            console.warn("extraction failed, using fallback data");
        } else {
            console.log(`extracted: ${structuredData.skills.length} skills, ${structuredData.education.length} education, ${structuredData.experience.length} experience`);
        }

        // 3. DETERMINE EMAIL AND NAME
        const candidateEmail = email || extractEmail(resumeText) || "";
        const cleanName = file.originalname.replace('.pdf', '');
        const uniqueName = `${cleanName}_${Date.now()}`;

        // 4. GENERATE VECTOR
        const vector = await getEmbedding(resumeText);

        // 5.save to Pinecone before Mongo
        // Generate MongoDB ID ahead of time
        const mongoose = require('mongoose');
        const mongoId = new mongoose.Types.ObjectId().toString();

        try {
            await index.upsert([{
                id: mongoId,
                values: vector,
                metadata: { textSnippet: resumeText.substring(0, 4000) }
            }]);
        } catch (err) {
            console.error("vector DB Failed:", err);
            throw new Error("Vector DB Failed - Upload Cancelled");
        }

        // 6. NOW save to mongoDB (safe because pinecone succeeded)
        const newCandidate = new Candidate({
            _id: mongoId,
            name: uniqueName,
            email: candidateEmail,
            resumeText: resumeText,
            pdfData: file.buffer,
            contentType: file.mimetype,
            pineconeId: mongoId,
            structuredData: structuredData, 
            status: 'New'
        });

        const savedCandidate = await newCandidate.save();
        console.log(`✅ Uploaded candidate: ${mongoId}`);

        // 7. AI RANKING (if JD provided)
        let finalResponse = savedCandidate.toObject();
        delete finalResponse.pdfData;

        if (jobDescription) {
            const ranking = await rankCandidates(jobDescription, [{
                id: mongoId,
                resumeText: resumeText
            }]);

            if (ranking.length > 0) {
                savedCandidate.groqAnalysis = {
                    matchScore: ranking[0].matchScore,
                    reason: ranking[0].reason
                };
                await savedCandidate.save();

                finalResponse.matchScore = ranking[0].matchScore;
                finalResponse.reason = ranking[0].reason;
            }
        }

        res.json({ message: "upload complete", candidate: finalResponse });

    } catch (error) {
        console.error("upload Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// ======================================================
// C2. SEARCH CANDIDATES (WITH STRUCTURED DATA
// ======================================================
exports.searchCandidates = async (req, res) => {
    try {
        const { jobDescription } = req.body;
        if (!jobDescription) {
            return res.status(400).json({ error: "Job description is required" });
        }

        const jdVector = await getEmbedding(jobDescription);
        const searchResult = await index.query({
            vector: jdVector,
            topK: 3,
            includeMetadata: true
        });

        const matchIds = searchResult.matches.map(match => match.id);
        if (matchIds.length === 0) return res.json({ matches: [] });

        const candidates = await Candidate.find({
            pineconeId: { $in: matchIds }
        });

        if (candidates.length === 0) {
            return res.json({ matches: [] });
        }

        console.log(`Ranking ${candidates.length} candidates...`);
        const aiRanking = await rankCandidates(jobDescription, candidates);

        const enrichedResults = candidates.map(candidate => {
            const aiVerdict = aiRanking.find(r =>
                r.candidateId === candidate._id.toString() ||
                r.candidateId === candidate.pineconeId
            );

            return {
                id: candidate._id,
                name: candidate.name,
                email: candidate.email,
                matchScore: aiVerdict ? aiVerdict.matchScore : 0,
                reason: aiVerdict ? aiVerdict.reason : "Could not analyze",
                structuredData: candidate.structuredData //  include struc dat
            };
        });

        enrichedResults.sort((a, b) => b.matchScore - a.matchScore);
        res.json({ matches: enrichedResults });

    } catch (error) {
        console.error("search Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// ======================================================
// C3. GET ALL CANDIDATES
// ======================================================
exports.getAllCandidates = async (req, res) => {
    try {
        const candidates = await Candidate.find()
            .select('-pdfData')
            .sort({ createdAt: -1 });

        res.json(candidates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ======================================================
// C4. DELETE CANDIDATE
// ======================================================
exports.deleteCandidate = async (req, res) => {
    try {
        const { id } = req.params;
        const candidate = await Candidate.findById(id);

        if (!candidate) {
            return res.status(404).json({ error: "Candidate not found" });
        }

        if (candidate.pineconeId && candidate.pineconeId !== 'pending') {
            try {
                await index.deleteOne(candidate.pineconeId);
            } catch (e) {
                console.warn("pinecone delete failed, continuing...");
            }
        }

        await Candidate.findByIdAndDelete(id);
        res.json({ message: "Deleted successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ======================================================
// C5. SERVE ORIGINAL PDF FILE
// ======================================================
exports.getCandidatePdf = async (req, res) => {
    try {
        const candidate = await Candidate.findById(req.params.id);

        if (!candidate || !candidate.pdfData || !candidate.pdfData.length) {
            return res.status(404).json({ error: "PDF not found" });
        }

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline'
        });

        res.send(candidate.pdfData);

    } catch (error) {
        res.status(500).send("Error fetching PDF");
    }
};