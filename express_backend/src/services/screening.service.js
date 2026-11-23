const config = require('../config');
const BaseService = require('./base.service');

class ScreeningService extends BaseService {
  constructor(repositories = {}, integrations = {}) {
    super(repositories, integrations);
    this.screeningRepo = repositories.screeningRepository;
    this.apiKey = config.gemini.apiKey || process.env.GEMINI_API_KEY || '';
    this.modelName = config.gemini.model || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  }

  generateFallbackHeuristicScreening(job, parsedResume) {
    const rawText = (parsedResume.raw_text || parsedResume.rawText || '').toLowerCase();
    const candSkills = (parsedResume.skills || []).map((s) => s.toLowerCase().trim());
    const reqSkills = (job.required_skills || []).map((s) => s.trim()).filter(Boolean);

    const matched = [];
    const missing = [];

    // Helper to normalize and check skill in resume
    const checkSkillMatch = (reqSkill) => {
      const lowerReq = reqSkill.toLowerCase();
      // Direct exact or substring match in parsed skills
      if (candSkills.some((cs) => cs.includes(lowerReq) || lowerReq.includes(cs))) {
        return true;
      }
      // Direct match in full resume text
      if (rawText.includes(lowerReq)) {
        return true;
      }
      // Clean filler words (good, strong, skills, knowledge, of, in)
      const cleanTokens = lowerReq
        .replace(/\b(good|strong|excellent|basic|advanced|skills?|knowledge|of|in|and|the|with)\b/gi, '')
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 2);

      if (cleanTokens.length > 0 && cleanTokens.every((token) => rawText.includes(token))) {
        return true;
      }

      // Domain synonyms
      const synonymMap = {
        communication: ['communicat', 'interpersonal', 'present', 'collaborat', 'lead', 'client'],
        logistics: ['logistics', 'linehaul', 'freight', 'transport', 'dispatch', 'fleet', 'carrier'],
        'supply chain': ['supply chain', 'scm', 'procurement', 'inventory', 'warehouse', 'vendor'],
        excel: ['excel', 'spreadsheet', 'sheets', 'vlookup', 'pivot', 'mis'],
        operations: ['operations', 'operational', 'hub', 'first mile', 'last mile', 'middle mile', 'sla']
      };

      for (const [key, terms] of Object.entries(synonymMap)) {
        if (lowerReq.includes(key)) {
          if (terms.some((term) => rawText.includes(term) || candSkills.some((cs) => cs.includes(term)))) {
            return true;
          }
        }
      }

      return false;
    };

    for (const req of reqSkills) {
      if (checkSkillMatch(req)) {
        matched.push(req);
      } else {
        missing.push(req);
      }
    }

    const candExp = parsedResume.total_experience_years !== undefined ? parsedResume.total_experience_years : 0;
    const minExp = job.min_experience_years !== undefined ? job.min_experience_years : 0;
    const hardFilterPassed = minExp <= 0 || candExp >= minExp;

    let baseScore = 40;
    if (reqSkills.length > 0) {
      const ratio = matched.length / reqSkills.length;
      baseScore = Math.round(ratio * 60) + 20;
    } else {
      baseScore = 70;
    }

    if (hardFilterPassed) {
      baseScore += 10;
    }
    if (candSkills.length >= 3 || rawText.length > 1500) {
      baseScore += 10;
    }

    const score = Math.max(10, Math.min(100, baseScore));
    const candName = parsedResume.name || 'Candidate';
    const rationale = `${candName} matches ${matched.length} of ${reqSkills.length} required competencies for the ${job.title} role. ${hardFilterPassed ? 'Candidate satisfies the minimum experience requirement.' : 'Candidate does not satisfy minimum experience criteria.'} Key demonstrated competencies include ${matched.slice(0, 3).join(', ') || 'general domain background'}.`;

    return {
      score,
      matched_skills: Array.from(new Set(matched)),
      missing_skills: Array.from(new Set(missing)),
      llm_rationale: rationale,
      hard_filter_passed: hardFilterPassed,
      source: 'heuristic_fallback'
    };
  }

  async screenResumeWithGemini(job, parsedResume) {
    if (!this.apiKey) {
      return this.generateFallbackHeuristicScreening(job, parsedResume);
    }

    const candidateModels = [
      this.modelName,
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash'
    ].filter((m, i, arr) => m && arr.indexOf(m) === i);

    const fullResumeText = (parsedResume.raw_text || parsedResume.rawText || '').trim();
    const skillsList = Array.isArray(parsedResume.skills) && parsedResume.skills.length > 0
      ? parsedResume.skills.join(', ')
      : 'Parsed from resume context';

    const prompt = `You are a strict, objective talent acquisition and screening evaluator for Road Express Freight.
Evaluate the candidate's resume strictly against the target job role.

CRITICAL EVALUATION RULES:
1. FUNCTIONAL ROLE & DOMAIN ALIGNMENT (MOST CRITICAL RULE):
   - Assess whether the candidate's primary career track, education, and professional identity match the functional day-to-day nature of the role.
   - If a candidate with a Software Engineering / IT / Data Science background applies for an Operational, Logistics, Fleet, or Supply Chain role without hands-on operational experience, identify this as a DOMAIN MISMATCH. Writing software, algorithms, or ML scripts that touch on logistics/supply chain does NOT qualify a software engineer as an operational Supply Chain Executive or Dispatcher.
   - For domain mismatches where a software engineer/developer applies for an operations role (or vice versa), award a low fit score (between 25 and 45) and explicitly state in the rationale that the candidate is a software/data science profile fundamentally suited for engineering roles, and lacks hands-on logistics and physical operations execution experience.
2. NO ASSUMING SOFT SKILLS:
   - Do NOT assume communication, client management, or interpersonal skills without explicit evidence in their past roles or leadership experience.
3. DO NOT INVENT JOB NEEDS:
   - Do not rationalize fit by claiming the role "requires technical integration" or "coding" unless explicitly specified in the Job Description.

Target Job Role:
- Title: ${job.title}
- Department: ${job.department}
- Experience Required: ${job.min_experience_years || 0} years
- Required Skills: ${(job.required_skills || []).join(', ') || 'Relevant domain skills'}
- Responsibilities / JD: ${job.responsibilities_text || job.description || 'Logistics operations and freight management'}

Candidate Profile:
- Key Skills: ${skillsList}
- Total Experience Claimed: ${parsedResume.total_experience_years || 0} years
- Education: ${(parsedResume.education || []).join(', ') || 'N/A'}

Candidate Resume Text:
${fullResumeText ? fullResumeText.slice(0, 7000) : 'Skills: ' + skillsList}

Output MUST be strictly valid JSON matching this schema:
{
  "score": integer between 0 and 100,
  "matched_skills": [string],
  "missing_skills": [string],
  "llm_rationale": "2-4 sentence executive evaluation explaining functional fit, strengths, domain alignment or mismatch",
  "hard_filter_passed": boolean
}`;

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(this.apiKey);

    for (const modelToTry of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelToTry,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        return {
          score: Math.max(0, Math.min(100, Math.round(parsed.score || 0))),
          matched_skills: Array.isArray(parsed.matched_skills) ? parsed.matched_skills : [],
          missing_skills: Array.isArray(parsed.missing_skills) ? parsed.missing_skills : [],
          llm_rationale: parsed.llm_rationale || 'Evaluation completed via Gemini AI.',
          hard_filter_passed: Boolean(parsed.hard_filter_passed),
          source: `gemini_ai (${modelToTry})`
        };
      } catch (err) {
        console.warn(`Gemini AI screening attempt with ${modelToTry} encountered error:`, err.message);
      }
    }

    console.warn('All Gemini AI model screening attempts failed. Utilizing enhanced heuristic fallback.');
    return this.generateFallbackHeuristicScreening(job, parsedResume);
  }

  async evaluateAndSave(application, job, resume) {
    const parsedData = (resume && resume.parsed_json) ? { ...resume.parsed_json } : {};
    if (resume && resume.parsed_text && !parsedData.raw_text) {
      parsedData.raw_text = resume.parsed_text;
    }

    const evaluation = await this.screenResumeWithGemini(job, parsedData);

    const saved = await this.screeningRepo.saveResult({
      applicationId: application.id,
      score: evaluation.score,
      matchedSkills: evaluation.matched_skills,
      missingSkills: evaluation.missing_skills,
      llmRationale: evaluation.llm_rationale,
      hardFilterPassed: evaluation.hard_filter_passed,
      rawResponse: evaluation
    });

    return {
      screening: saved,
      score: evaluation.score
    };
  }
}

module.exports = ScreeningService;
