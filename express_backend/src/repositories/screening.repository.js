const BaseRepository = require('./base.repository');

class ScreeningRepository extends BaseRepository {
  constructor(pool = null) {
    super(pool);
    this.tableName = 'hiring_screening_results';
  }

  async saveResult({
    applicationId,
    score,
    matchedSkills = [],
    missingSkills = [],
    llmRationale = '',
    hardFilterPassed = true,
    rawResponse = null
  }) {
    const existing = await this.findByApplicationId(applicationId);

    const payload = {
      application_id: applicationId,
      score: Math.round(score),
      overall_score: score,
      matched_skills: matchedSkills,
      missing_skills: missingSkills,
      strengths: matchedSkills,
      weaknesses: missingSkills,
      llm_rationale: llmRationale,
      summary: llmRationale,
      recommendations: hardFilterPassed ? 'Recommend for interview evaluation' : 'Candidate does not satisfy minimum criteria',
      hard_filter_passed: hardFilterPassed,
      raw_response: rawResponse ? JSON.stringify(rawResponse) : null
    };

    if (existing) {
      return await this.update(this.tableName, existing.id, payload);
    }

    return await this.create(this.tableName, payload);
  }

  async findByApplicationId(applicationId) {
    const sql = `SELECT * FROM ${this.tableName} WHERE application_id = $1 LIMIT 1`;
    const result = await this.query(sql, [applicationId]);
    return result.rows[0] || null;
  }
}

module.exports = ScreeningRepository;
