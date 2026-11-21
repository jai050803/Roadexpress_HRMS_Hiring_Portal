const config = require('../config');
const BaseService = require('./base.service');

class ScreeningService extends BaseService {
  constructor(repositories = {}, integrations = {}) {
    super(repositories, integrations);
    this.screeningRepo = repositories.screeningRepository;
    this.apiKey = config.gemini.apiKey || process.env.GEMINI_API_KEY || '';
  }

  generateFallbackHeuristicScreening(job, parsedResume) {
    const candSkills = (parsedResume.skills || []).map((s) => s.toLowerCase().trim());
    const reqSkills = (job.required_skills || []).map((s) => s.toLowerCase().trim());

    const matched = [];
    const missing = [];

    for (const req of reqSkills) {
      if (candSkills.some((cs) => cs.includes(req) || req.includes(cs))) {
        matched.push(req);
      } else {
        missing.push(req);
      }
    }

    const candExp = parsedResume.total_experience_years !== undefined ? parsedResume.total_experience_years : 0;
    const minExp = job.min_experience_years !== undefined ? job.min_experience_years : 0;
    const hardFilterPassed = minExp <= 0 || candExp >= minExp;

    let baseScore = 0;
    if (reqSkills.length > 0) {
      const ratio = matched.length / reqSkills.length;
      baseScore = Math.round(ratio * 70);
    } else {
      baseScore = 65;
    }

    if (hardFilterPassed) {
      baseScore += 20;
    }
    if (candSkills.length >= 5) {
      baseScore += 10;
    }

    const score = Math.max(0, Math.min(100, baseScore));
    const candName = parsedResume.name || 'Candidate';
    const rationale = `${candName} matches ${matched.length} of ${reqSkills.length} required skills for ${job.title} with ${candExp} years of domain experience. ${hardFilterPassed ? 'Candidate satisfies minimum experience criteria.' : 'Candidate does not meet minimum experience criteria.'}`;

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

    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
You are an expert talent screening evaluator for Road Express Freight.
Evaluate the candidate's resume against the job role and return strictly valid JSON matching this schema:
{
  "score": integer between 0 and 100,
  "matched_skills": [string],
  "missing_skills": [string],
  "llm_rationale": "2-4 sentences explaining evaluation, strengths, and gaps",
  "hard_filter_passed": boolean
}

Target Job Role:
- Title: ${job.title}
- Department: ${job.department}
- Experience Required: ${job.min_experience_years || 0} years
- Required Skills: ${(job.required_skills || []).join(', ')}
- Description: ${job.responsibilities_text || job.description || 'N/A'}

Candidate Profile:
- Skills: ${(parsedResume.skills || []).join(', ')}
- Experience: ${parsedResume.total_experience_years || 0} years
- Education: ${(parsedResume.education || []).join(', ')}
- Resume Text Snippet: ${(parsedResume.raw_text || '').slice(0, 3000)}

Output strictly valid JSON with no markdown formatting.
`;

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
        source: 'gemini_ai'
      };
    } catch (err) {
      console.warn('Gemini AI screening failed or unconfigured, utilizing heuristic scoring engine:', err.message);
      return this.generateFallbackHeuristicScreening(job, parsedResume);
    }
  }

  async evaluateAndSave(application, job, resume) {
    const parsedData = (resume && resume.parsed_json) ? resume.parsed_json : {};
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
