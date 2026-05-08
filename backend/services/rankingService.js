const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Candidate Ranking ────────────────────────────────────────────────────────

exports.rankCandidates = async (jobDescription, candidates) => {
    try {
        const validCandidates = candidates.filter(c => {
            if (!c.resumeText || typeof c.resumeText !== 'string' || c.resumeText.trim().length < 20) {
                console.warn(`Skipping candidate ${c.id || c._id} - missing or too short resumeText`);
                return false;
            }
            return true;
        });

        if (validCandidates.length === 0) {
            console.error("No valid candidates to rank.");
            return [];
        }

        
        // Problem: i saw substring(0, 6000) cuts off page 2 where skills/certs often live
        // Solution: Take first 8000 chars BUT also always append the LAST 2000 chars
        // This ensures skills sections at the bottom of long resumes are never lost
        const getSmartSnippet = (text) => {
            const MAX_TOTAL = 8000;
            const TAIL_SIZE = 2000; 

            if (text.length <= MAX_TOTAL) return text; // short enough, send all

            const head = text.substring(0, MAX_TOTAL - TAIL_SIZE);
            const tail = text.substring(text.length - TAIL_SIZE);

            return `${head}\n\n[...middle section omitted for brevity...]\n\n${tail}`;
        };

        const candidatesData = validCandidates.map(c =>
            `ID: ${c.id || c._id}\nResume:\n${getSmartSnippet(c.resumeText)}`
        ).join("\n\n---\n\n");

        const prompt =
`You are a strict, objective HR ATS system. Rank the candidates based ONLY on the exact requirements in the JOB DESCRIPTION.

JOB DESCRIPTION:
${jobDescription}

CANDIDATES:
${candidatesData}

STRICT INSTRUCTIONS:
1. NO HALLUCINATIONS: Do not say a skill is missing unless you have scanned the ENTIRE resume text above, including the Technical Skills, Certifications, Projects, and Extracurriculars sections.
2. DEEP SCAN: Skills are often listed at the BOTTOM of resumes. The tail section is always included — check it carefully.
3. If a skill appears ANYWHERE in the resume — in projects, coursework, tools, or certifications — it counts as a match.
4. SCORING RUBRIC:
   - 80-100: Exact match on the specific requested skill or certificate, clearly present in resume.
   - 50-79:  Partial match (has related skills but missing the core specific requirement).
   - 0-49:   Missing the primary requested skill or certificate entirely after full scan.
5. matchScore must be an integer between 0 and 100.
6. candidateId must exactly match the ID provided above.

Return a JSON object with a single key "rankings" containing an array:
{
  "rankings": [
    { "candidateId": "EXACT_ID", "matchScore": 85, "reason": "Explicitly state what was found and where (e.g., 'MATLAB found in Technical Skills section')" },
    ...
  ]
}`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.1,
            response_format: { type: "json_object" },
        });

        const rawContent = chatCompletion.choices[0]?.message?.content || "{}";

        let parsed;
        try {
            parsed = JSON.parse(rawContent);
        } catch (parseError) {
            console.error("JSON parse failed in rankCandidates:", parseError.message);
            return [];
        }

        const rankings = Array.isArray(parsed.rankings) ? parsed.rankings : [];

        const validatedRankings = rankings
            .filter(r => r && r.candidateId !== undefined && r.candidateId !== null)
            .map(r => ({
                candidateId: String(r.candidateId).trim(),
                matchScore: Number.isFinite(Number(r.matchScore))
                    ? Math.min(100, Math.max(0, Math.round(Number(r.matchScore))))
                    : 0,
                reason: typeof r.reason === 'string' && r.reason.trim().length > 0
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

// ─── Resume Info Extraction ───────────────────────────────────────────────────

exports.extractCandidateInfo = async (resumeText) => {
    try {
        // if Skills/certs are at the bottom never cut them off
        const MAX_TOTAL = 8000;
        const TAIL_SIZE = 2000;

        let textToExtract;
        if (resumeText.length <= MAX_TOTAL) {
            textToExtract = resumeText;
        } else {
            const head = resumeText.substring(0, MAX_TOTAL - TAIL_SIZE);
            const tail = resumeText.substring(resumeText.length - TAIL_SIZE);
            textToExtract = `${head}\n\n[...middle omitted...]\n\n${tail}`;
        }

        const prompt =
`You are an expert ATS parser. Extract structured information from the raw resume text below.

RESUME:
"""
${textToExtract}
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
2. DO NOT just look at the "Skills" section. You MUST deeply scan "Certifications", "Extra-Curriculars", "Courses", and "Projects" for mentioned technologies.
3. If a technology (e.g., "MATLAB", "R", "Django", "Python") is mentioned ANYWHERE in the document, it MUST be in the "skills" array.
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
            response_format: { type: "json_object" },
        });

        const rawContent = chatCompletion.choices[0]?.message?.content || "{}";

        let parsed;
        try {
            parsed = JSON.parse(rawContent.trim());
        } catch (parseError) {
            console.error("JSON parse failed in extractCandidateInfo:", parseError.message);
            throw new Error("Failed to parse AI extraction response");
        }

        const sanitizeStringArray = (val) =>
            Array.isArray(val)
                ? val.filter(s => typeof s === 'string' && s.trim().length > 0).map(s => s.trim())
                : [];

        return {
            skills:           sanitizeStringArray(parsed.skills),
            education:        sanitizeStringArray(parsed.education),
            experience:       sanitizeStringArray(parsed.experience),
            projects:         sanitizeStringArray(parsed.projects),
            summary:          typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
                                  ? parsed.summary.trim()
                                  : "Profile summary not available.",
            extractionFailed: false,
        };

    } catch (error) {
        console.error("Extraction Error:", error.message);
        return {
            skills:           [],
            education:        [],
            experience:       [],
            projects:         [],
            summary:          "AI extraction temporarily unavailable.",
            extractionFailed: true,
        };
    }
};