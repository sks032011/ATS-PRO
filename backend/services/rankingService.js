const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// candidate Ranking 

exports.rankCandidates = async (jobDescription, candidates) => {
    try {
        // guard===filter out candidates with no usable resume text
        const validCandidates = candidates.filter(c => {
            if (!c.resumeText || typeof c.resumeText !== 'string' || c.resumeText.trim().length < 20) {
                console.warn(`skipping candidate ${c.id || c._id},missing or too short resumeText`);
                return false;
            }
            return true;
        });

        if (validCandidates.length === 0) {
            console.error("No valid candidates to rank.");
            return [];
        }

        const candidatesData = validCandidates.map(c =>
            `ID: ${c.id || c._id}\nResume Snippet: ${c.resumeText.substring(0, 2000)}`
        ).join("\n\n---\n\n");

const prompt =
`You are an expert HR recruiter. Rank the following candidates for the job description below.

JOB DESCRIPTION:
${jobDescription}

CANDIDATES:
${candidatesData}

INSTRUCTIONS:
- Rank all candidates from best to worst match.
- In the "reason" field, explicitly state which JD requirements were matched and which were missing.
- CRITICAL: PDF text is often unstructured. Before stating a skill is missing, you MUST scan the entire resume snippet character-by-character, including "Certifications", "Extra-Curriculars", and "Projects".
- If a skill is listed as a certification or used in a project, you must consider it a match.
- Base all reasoning strictly on resume content — do not infer or assume.
- matchScore must be an integer between 0 and 100.
- candidateId must exactly match the ID provided above.

Return a JSON object with a single key "rankings" containing an array:
{
  "rankings": [
    { "candidateId": "EXACT_ID", "matchScore": 85, "reason": "..." },
    ...
  ]
}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            response_format: { type: "json_object" }, // force valid JSON no bracket scraping
        });

        const rawContent = chatCompletion.choices[0]?.message?.content || "{}";

        let parsed;
        try {
            parsed = JSON.parse(rawContent);
        } catch (parseError) {
            console.error("JSON parse failed in rankCandidates:", parseError.message);
            console.error("Raw content:", rawContent.substring(0, 300));
            return [];
        }

        // validate and sanitize each ranking entry
        const rankings = Array.isArray(parsed.rankings) ? parsed.rankings : [];
      const validatedRankings = rankings
    .filter(r =>
        r &&
        r.candidateId !== undefined &&
        r.candidateId !== null
    )
    .map(r => ({
        candidateId: String(r.candidateId).trim(),

        matchScore: Number.isFinite(Number(r.matchScore))
            ? Math.min(100, Math.max(0, Math.round(Number(r.matchScore))))
            : 0,

        reason:
            typeof r.reason === 'string' && r.reason.trim().length > 0
                ? r.reason.trim()
                : "No reason provided.",
    }))
    .filter(r => r.candidateId.length > 0);

        return validatedRankings;

    } catch (error) {
        console.error("Groq Ranking Error:", error.message);
        return [];
    }
};

// ─── resume Info Extraction 

exports.extractCandidateInfo = async (resumeText) => {
    try {
        const cleanText = resumeText.substring(0, 6000);

const prompt =
`You are an expert ATS parser. Extract structured information from the raw resume text below.

RESUME:
"""
${cleanText}
"""

Return a JSON object with exactly these keys:
{
  "skills":     ["skill1", "skill2"],
  "education":  ["Degree - University (Year)"],
  "experience": ["Role - Company (Duration)"],
  "projects":   ["Project Name - brief one-line description"],
  "summary":    "One concise sentence describing the candidate."
}

CRITICAL PARSING RULES:
1. PDF parsers mash table columns together. Read character-by-character and extract skills hidden in merged sentences.
2. DO NOT just look at the "Skills" section. You MUST deeply scan "Certifications", "Extra-Curriculars", and "Projects" for mentioned technologies.
3. If a technology (e.g., "R", "Django", "Python") is mentioned ANYWHERE in the document, it MUST be included in the "skills" array.
4. "skills" must be a flat array of specific technologies (languages, frameworks, DBs, tools).
5. "education": "Degree - Institution (Graduation Year)" format. Use [] if not found.
6. "experience": "Role - Company (Duration)" format. Include internships. Use [] if not found.
7. "projects": "Project Name - what it does and tech used". Use [] if not found.
8. "summary": One sentence only.
9. No nested objects. No extra keys.`;
        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            response_format: { type: "json_object" }, // guarantee raw JSON no markdown stripping needed
        });

        const rawContent = chatCompletion.choices[0]?.message?.content || "{}";

        let parsed;
        try {
            parsed = JSON.parse(rawContent.trim());
        } catch (parseError) {
            console.error("JSON parse failed in extractCandidateInfo:", parseError.message);
            console.error("Raw content:", rawContent.substring(0, 300));
            throw new Error("Failed to parse AI extraction response");
        }

        // Sanitize every field not trustin model op directly
        const sanitizeStringArray = (val) =>
            Array.isArray(val)
                ? val.filter(s => typeof s === 'string' && s.trim().length > 0).map(s => s.trim())
                : [];

        return {
            skills:          sanitizeStringArray(parsed.skills),
            education:       sanitizeStringArray(parsed.education),
            experience:      sanitizeStringArray(parsed.experience),
            projects:        sanitizeStringArray(parsed.projects),   
            summary:         typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
                                 ? parsed.summary.trim()
                                 : "Profile summary not available.",
            extractionFailed: false,
        };

    } catch (error) {
        console.error("extraction Error:", error.message);

        return {
            skills:          [],
            education:       [],
            experience:      [],
            projects:        [],
            summary:         "AI extraction temporarily unavailable.",
            extractionFailed: true,
        };
    }
};