const BaseRepository = require('./base.repository');

class FeedbackRepository extends BaseRepository {
  constructor(pool = null) {
    super(pool);
    this.tableName = 'hiring_feedback';
  }

  async submitFeedback(data) {
    const payload = {
      interview_id: data.interview_id,
      interviewer_id: data.interviewer_id || data.submitted_by || null,
      submitted_by: data.submitted_by || data.interviewer_id || null,
      rating: data.rating || data.overall_rating || 3,
      overall_rating: data.overall_rating || data.rating || 3,
      technical_skills: data.technical_skills || data.technical_rating || null,
      technical_rating: data.technical_rating || data.technical_skills || null,
      communication_skills: data.communication_skills || data.communication_rating || null,
      communication_rating: data.communication_rating || data.communication_skills || null,
      problem_solving: data.problem_solving || null,
      culture_rating: data.culture_rating || null,
      recommendation: data.recommendation || data.decision || 'hire',
      decision: data.decision || data.recommendation || 'proceed',
      comments: data.comments || data.additional_notes || null,
      strengths: data.strengths || null,
      concerns: data.concerns || null,
      additional_notes: data.additional_notes || data.comments || null
    };

    return await this.create(this.tableName, payload);
  }

  async findByInterviewId(interviewId) {
    const sql = `
      SELECT f.*,
             u.full_name as submitted_by_name,
             u.email as submitted_by_email
      FROM ${this.tableName} f
      LEFT JOIN hiring_users u ON u.id = f.submitted_by
      WHERE f.interview_id = $1
      ORDER BY f.created_at ASC
    `;
    const result = await this.query(sql, [interviewId]);
    return result.rows;
  }
}

module.exports = FeedbackRepository;
