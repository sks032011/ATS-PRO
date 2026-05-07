const pdfParse = require('pdf-parse');
const { extractCandidateInfo } = require('../services/rankingService');

// ─── rate limiting ───────────────────────────────────────────────────────

const rateLimitMap = new Map(); 

const checkRateLimit = (ip) => {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + 60 * 60 * 1000 });
        return true;
    }
    if (record.count >= 10) return false;
    record.count++;
    return true;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

const MODERN_TECH_SKILLS = new Set([
    // Languages
    'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust',
    'kotlin', 'swift', 'ruby', 'php', 'scala', 'dart', 'r',
    // Frontend
    'react', 'vue', 'angular', 'nextjs', 'next.js', 'svelte', 'html', 'css',
    'tailwind', 'redux', 'graphql', 'webpack', 'vite',
    // Backend
    'node', 'nodejs', 'express', 'django', 'flask', 'fastapi', 'spring',
    'laravel', 'rails', 'nestjs', 'rest', 'api',
    // DB
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'firebase', 'supabase',
    'dynamodb', 'elasticsearch', 'prisma',
    // DevOps / Cloud
    'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'ci/cd', 'github actions',
    'jenkins', 'terraform', 'linux', 'nginx',
    // ML / Data
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas',
    'numpy', 'scikit-learn', 'nlp', 'computer vision', 'llm',
    // Tools
    'git', 'figma', 'postman', 'jest', 'selenium', 'jira', 'agile', 'scrum',
]);

const ACTION_VERBS = [
    'developed', 'built', 'created', 'designed', 'implemented', 'led', 'managed',
    'achieved', 'delivered', 'optimized', 'improved', 'launched', 'architected',
    'engineered', 'deployed', 'automated', 'reduced', 'increased', 'scaled',
    'integrated', 'migrated', 'refactored', 'collaborated', 'mentored', 'owned',
];

const countModernSkills = (skills) => {
    if (!Array.isArray(skills)) return 0;
    return skills.filter(s =>
        MODERN_TECH_SKILLS.has(s.toLowerCase().trim())
    ).length;
};

const detectDuplicateSkills = (skills) => {
    if (!Array.isArray(skills)) return 0;
    const normalized = skills.map(s => s.toLowerCase().trim());
    const unique = new Set(normalized);
    return normalized.length - unique.size; // number of dupes
};

const countActionVerbs = (text) => {
    return ACTION_VERBS.filter(v => new RegExp(`\\b${v}\\b`, 'i').test(text)).length;
};

const countQuantifiedAchievements = (text) => {
    // patterns like 40%, 3x, 10K users, $5M, 200+ customers, top 5
    const patterns = [
        /\d+%/g,
        /\d+x\b/g,
        /\$[\d,.]+[kmb]?/gi,
        /\d[\d,]*\+?\s*(users|customers|clients|requests|transactions|projects|people|engineers|students|issues)/gi,
        /top\s*\d+/gi,
        /\d+\s*(ms|seconds?|minutes?)\s*(faster|reduction|improvement)/gi,
    ];
    let count = 0;
    for (const p of patterns) {
        const matches = text.match(p);
        if (matches) count += matches.length;
    }
    return count;
};

const detectSectionHeaders = (text) => {
    // chek for actual section headers on their own line/ followed by colon
    const sectionPatterns = [
        /^\s*(experience|work experience|employment)\s*:?\s*$/im,
        /^\s*(education|academic)\s*:?\s*$/im,
        /^\s*(skills|technical skills|core competencies)\s*:?\s*$/im,
        /^\s*(projects|personal projects|side projects)\s*:?\s*$/im,
        /^\s*(summary|objective|profile|about)\s*:?\s*$/im,
        /^\s*(achievements|accomplishments|awards)\s*:?\s*$/im,
        /^\s*(certifications?|courses?)\s*:?\s*$/im,
    ];
    return sectionPatterns.filter(p => p.test(text)).length;
};

//
// max 100 points, distributed across 7 weighted factors:
//
// 1 contact Info          →  10 pts
// 2 skills Quality        →  25 pts  relvance + diversity, penalise dupes
// 3 experience Depth      →  20 pts  (posns + action verbs + quantificn)
// 4 projects              →  15 pts
// 5 education             →  10 pts
// 6 content Quality       →  15 pts  (ac. v., quantified impact, semantic richness
// 7 structure & Format    →  5  pts

const calculateATSScore = (resumeText, structuredData) => {
    let score = 0;
    const breakdown = {};

    // ──  contact info (10 pts) ──────────────────────────────────────
    let contactScore = 0;
    const hasEmail    = /\b[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/.test(resumeText);
    const hasPhone    = /(\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(resumeText);
    const hasLinkedIn = /linkedin\.com\/in\//i.test(resumeText);          // full profile URL, not just mention
    const hasGitHub   = /github\.com\/[a-zA-Z0-9_-]+/i.test(resumeText); // actual username URL

    if (hasEmail)    contactScore += 4;
    if (hasPhone)    contactScore += 3;
    if (hasLinkedIn) contactScore += 2;
    if (hasGitHub)   contactScore += 1;
    breakdown.contact = contactScore;
    score += contactScore;

    // ── 2. skills quality (25 pts) ───────────────────────────────────────────
    let skillScore = 0;
    const skills        = structuredData.skills || [];
    const totalSkills   = skills.length;
    const modernSkills  = countModernSkills(skills);
    const dupeCount     = detectDuplicateSkills(skills);

    // relevnce ratio (modern / total) weighted by count
    if (totalSkills > 0) {
        const relevanceRatio = modernSkills / totalSkills;
        // Base: up to 15 pts for having 6+ modern skills
        skillScore += Math.min(modernSkills * 2.5, 15);
        // Diversity bonus: up to 10 pts based on relevance ratio
        skillScore += Math.round(relevanceRatio * 10);
    }
    // keyword stuffing / duplication penalty
    skillScore -= dupeCount * 2;
    skillScore = Math.max(0, Math.min(Math.round(skillScore), 25));
    breakdown.skills = skillScore;
    score += skillScore;

    // ── 3. experience depth (20 pts) ─────────────────────────────────────────
    let expScore = 0;
    const expCount = (structuredData.experience || []).length;

    // positions (up to 12 pts=== first job = 6, each additional = 3, cap 12
    if (expCount >= 1) expScore += 6;
    if (expCount >= 2) expScore += 3;
    if (expCount >= 3) expScore += 3;

    // Action verbs used in text (up to 5 pts)
    const verbCount = countActionVerbs(resumeText);
    expScore += Math.min(verbCount, 5);

    // Quantified achievements in experience context (up to 3 pts)
    const quantCount = countQuantifiedAchievements(resumeText);
    expScore += Math.min(quantCount, 3);

    expScore = Math.min(Math.round(expScore), 20);
    breakdown.experience = expScore;
    score += expScore;

    // ── Projects (15 pts) ─────────────────────────────────────────────────
    let projectScore = 0;
    const projects = structuredData.projects || [];
    const projectCount = projects.length;

    // Also detect projects section in raw text if extractor missed them
    const hasProjectsSection = /\bprojects?\b/i.test(resumeText);
    const rawProjectMentions = (resumeText.match(/\bproject\b/gi) || []).length;

    if (projectCount >= 1 || hasProjectsSection) {
        projectScore += Math.min((projectCount || Math.min(rawProjectMentions, 3)) * 4, 10);
        // Bonus: projects with GitHub links
        const projectsWithLinks = (resumeText.match(/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/gi) || []).length;
        projectScore += Math.min(projectsWithLinks * 2, 5);
    }

    projectScore = Math.min(Math.round(projectScore), 15);
    breakdown.projects = projectScore;
    score += projectScore;

    // ── 5. Education (10 pts) ────────────────────────────────────────────────
    let eduScore = 0;
    const eduCount = (structuredData.education || []).length;
    if (eduCount >= 1) eduScore += 7;
    if (eduCount >= 2) eduScore += 3;

    // Bonus for CGPA / GPA mention (shows strong academic record)
    if (/\b(cgpa|gpa|grade point)\s*[:\-]?\s*[0-9.]+/i.test(resumeText)) eduScore += 0; // neutral, already counted
    // Minor bonus for top-tier institution keywords
    if (/\b(iit|nit|bits|iiit|iim|vit|srm|manipal|delhi university)\b/i.test(resumeText)) eduScore = Math.min(eduScore + 1, 10);

    eduScore = Math.min(Math.round(eduScore), 10);
    breakdown.education = eduScore;
    score += eduScore;

    // ── 6. Content Quality (15 pts) ──────────────────────────────────────────
    let contentScore = 0;

    // Action verb density (up to 6 pts) 
    contentScore += Math.min(verbCount * 0.6, 6);

    // quantified impact (up to 6 pts)
    contentScore += Math.min(quantCount * 2, 6);

    // semantic richness -==unique nonstopword word cnt rltive to length
    const words = resumeText.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const uniqueWords = new Set(words);
    const richness = uniqueWords.size / Math.max(words.length, 1);
    contentScore += richness > 0.55 ? 3 : richness > 0.45 ? 1.5 : 0;

    contentScore = Math.min(Math.round(contentScore), 15);
    breakdown.content = contentScore;
    score += contentScore;

    // structure & Formatting (5 pts) ────────────────────────────────────
    let formatScore = 0;
    const sectionCount = detectSectionHeaders(resumeText);
    formatScore += Math.min(sectionCount, 4); // 1 pt per proper section, up to 4
    // reasonable length (250–900 words is good)
    const wordCount = resumeText.split(/\s+/).length;
    if (wordCount >= 250 && wordCount <= 900) formatScore += 1;

    formatScore = Math.min(Math.round(formatScore), 5);
    breakdown.format = formatScore;
    score += formatScore;

    return {
        total: Math.min(Math.round(score), 100),
        breakdown,
    };
};

// ─── suggestions ──────────────────────────────────────────────────────────────

const generateSuggestions = (resumeText, structuredData, scoreResult) => {
    const suggestions = [];
    const { breakdown } = scoreResult;

    // contact
    if (!/linkedin\.com\/in\//i.test(resumeText))
        suggestions.push("Add a full LinkedIn profile URL (linkedin.com/in/yourname),many ATS systems specifically parse this.");
    if (!/github\.com\/[a-zA-Z0-9_-]+/i.test(resumeText))
        suggestions.push("Add a GitHub profile link (github.com/yourusername) to demonstrate actual code.");

    // skills
    const skills = structuredData.skills || [];
    const modernSkills = countModernSkills(skills);
    const dupes = detectDuplicateSkills(skills);
    if (dupes > 0)
        suggestions.push(`Remove ${dupes} duplicate skill(s) — keyword stuffing can hurt your ATS ranking.`);
    if (modernSkills < 5)
        suggestions.push("Your skills section is thin on industry-relevant tech. Add specific frameworks, tools, and languages you actually use.");
    else if (skills.length > 0 && modernSkills / skills.length < 0.5)
        suggestions.push("Many listed skills are vague or generic. Replace them with specific technologies (e.g., 'React' instead of 'Web Development').");

    // experience
    if ((structuredData.experience || []).length === 0)
        suggestions.push("Add work experience, internships, or freelance work — even a 2-month stint counts.");

    // oprojects
    const hasProjects = (structuredData.projects || []).length > 0 || /\bproject\b/i.test(resumeText);
    if (!hasProjects)
        suggestions.push("Add a Projects section. For students and early-career devs this is often more important than experience.");
    const repoLinks = (resumeText.match(/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/gi) || []).length;
    if (hasProjects && repoLinks === 0)
        suggestions.push("Link your projects to GitHub repos. Interviewers and ATS systems both check this.");

    // Eed.
    if ((structuredData.education || []).length === 0)
        suggestions.push("Include your educational background with degree, institution, and graduation year.");

    // Action verbs
    const verbCount = countActionVerbs(resumeText);
    if (verbCount < 3)
        suggestions.push("Use strong action verbs to start bullet points: 'Built', 'Deployed', 'Optimised', 'Reduced', 'Led'. Avoid passive voice.");

    // quantification
    const quantCount = countQuantifiedAchievements(resumeText);
    if (quantCount === 0)
        suggestions.push("Quantify your impact: 'Reduced load time by 40%', 'Handled 10K daily requests', 'Built for 500+ users'. Numbers stand out.");
    else if (quantCount < 2)
        suggestions.push("Good start on quantification — try to add metrics to 2–3 more bullet points.");

    // Structure
    const sectionCount = detectSectionHeaders(resumeText);
    if (sectionCount < 3)
        suggestions.push("Use clear section headers on their own line: EXPERIENCE, EDUCATION, SKILLS, PROJECTS. ATS parsers rely on these.");

    // Length
    const wordCount = resumeText.split(/\s+/).length;
    if (wordCount < 250)
        suggestions.push("Resume is too sparse. Expand your project descriptions and experience bullet points.");
    else if (wordCount > 1000)
        suggestions.push("Resume may be too long. Aim for 1 page (250–600 words) for students, 2 pages max for experienced devs.");

    return suggestions;
};

// ─── Strengths ────────────────────────────────────────────────────────────────

const identifyStrengths = (resumeText, structuredData, scoreResult) => {
    const strengths = [];
    const skills = structuredData.skills || [];
    const modernSkills = countModernSkills(skills);

    if (modernSkills >= 6)
        strengths.push(`Strong tech stack: ${modernSkills} industry-relevant skills identified (frameworks, languages, tools).`);
    else if (modernSkills >= 3)
        strengths.push(`Decent technical skills section with ${modernSkills} relevant technologies.`);

    if ((structuredData.experience || []).length >= 2)
        strengths.push(`Solid experience section with ${structuredData.experience.length} positions listed.`);
    else if ((structuredData.experience || []).length === 1)
        strengths.push("Has at least one work experience or internship entry.");

    const repoLinks = (resumeText.match(/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/gi) || []).length;
    if (repoLinks > 0)
        strengths.push(`${repoLinks} project repo link(s) found — demonstrates real, verifiable work.`);
    else if (/github\.com\/[a-zA-Z0-9_-]+/i.test(resumeText))
        strengths.push("GitHub profile linked — good for portfolio visibility.");

    if (/linkedin\.com\/in\//i.test(resumeText))
        strengths.push("Proper LinkedIn profile URL present.");

    const quantCount = countQuantifiedAchievements(resumeText);
    if (quantCount >= 3)
        strengths.push(`Well quantified: ${quantCount} measurable achievements found,this directly improves ATS ranking.`);
    else if (quantCount >= 1)
        strengths.push("Has at least one quantified achievement — expand this to more bullet points.");

    const verbCount = countActionVerbs(resumeText);
    if (verbCount >= 5)
        strengths.push(`Strong use of action verbs (${verbCount} found),bullet points read actively and clearly.`);

    const sectionCount = detectSectionHeaders(resumeText);
    if (sectionCount >= 4)
        strengths.push("Well structured resume with clear section headers — ATS parsers will have no trouble.");

    const wordCount = resumeText.split(/\s+/).length;
    if (wordCount >= 250 && wordCount <= 900)
        strengths.push(`Good length (${wordCount} words),within the optimal ATS parsing range.`);

    if (strengths.length === 0)
        strengths.push("Resume was parsed successfully. Work through the suggestions below to improve your score.");

    return strengths;
};

// ─── Main Handler ─────────────────────────────────────────────────────────────

exports.analyzeResume = async (req, res) => {
    try {
        const ip = req.ip || req.connection.remoteAddress;

        if (!checkRateLimit(ip)) {
            return res.status(429).json({
                error: "Rate limit exceeded. You can analyse up to 10 resumes per hour. Please try again later."
            });
        }

        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: "No PDF file uploaded." });
        }

        const pdfData = await pdfParse(file.buffer);
        const resumeText = pdfData.text;

        if (resumeText.length < 50) {
            return res.status(400).json({ error: "PDF is too short or unreadable. Please upload a valid resume." });
        }

        console.log(`Analysing resume (${resumeText.length} chars)...`);

        const structuredData = await extractCandidateInfo(resumeText);

        if (structuredData.extractionFailed) {
            console.warn("structured extraction failed,scoring from raw text only.");
        }

        const scoreResult   = calculateATSScore(resumeText, structuredData);
        const strengths     = identifyStrengths(resumeText, structuredData, scoreResult);
        const suggestions   = generateSuggestions(resumeText, structuredData, scoreResult);

        console.log(`analysis complete: ${scoreResult.total}/100`);

        res.json({
            atsScore:       scoreResult.total,
            scoreBreakdown: scoreResult.breakdown, // shows factor level scores to the frontend
            structuredData,
            strengths,
            suggestions,
            analysis: {
                wordCount:    resumeText.split(/\s+/).length,
                hasEmail:     /\b[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/.test(resumeText),
                hasPhone:     /(\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(resumeText),
                hasLinkedIn:  /linkedin\.com\/in\//i.test(resumeText),
                hasGitHub:    /github\.com\/[a-zA-Z0-9_-]+/i.test(resumeText),
                modernSkills: countModernSkills(structuredData.skills || []),
                verbCount:    countActionVerbs(resumeText),
                quantCount:   countQuantifiedAchievements(resumeText),
            }
        });

    } catch (error) {
        console.error("Analyse Error:", error);
        res.status(500).json({
            error: "Analysis failed. Please try again.",
            details: error.message
        });
    }
};