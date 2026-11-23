const BaseRepository = require('./base.repository');

class InterviewRepository extends BaseRepository {
  constructor(pool = null) {
    super(pool);
    this.tableName = 'hiring_interviews';
  }

  async createInterview(data) {
    const payload = {
      application_id: data.application_id,
      job_role_id: data.job_role_id || null,
      round_number: data.round_number || 1,
      round_name: data.round_name || 'Technical Round',
      scheduled_at: data.scheduled_at,
      duration_minutes: data.duration_minutes || 45,
      mode: data.mode || 'video',
      location: data.location || null,
      meeting_link: data.meeting_link || null,
      interviewer_id: data.interviewer_id || null,
      interviewer_name: data.interviewer_name || null,
      interviewer_email: data.interviewer_email || null,
      interviewer_ids: data.interviewer_ids || [],
      status: data.status || 'scheduled',
      hr_notes: data.hr_notes || null,
      created_by_id: data.created_by_id || null
    };

    return await this.create(this.tableName, payload);
  }

  async findById(id) {
    const sql = `
      SELECT i.*,
             a.reference_number as application_reference,
             a.status as application_status,
             c.id as candidate_id,
             c.name as candidate_name,
             c.email as candidate_email,
             c.phone as candidate_phone,
             j.id as job_id,
             j.title as job_title,
             j.department as job_department,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', f.id,
                   'overall_rating', f.overall_rating,
                   'technical_rating', f.technical_rating,
                   'communication_rating', f.communication_rating,
                   'decision', f.decision,
                   'recommendation', f.recommendation,
                   'comments', f.comments,
                   'submitted_at', f.created_at
                 )
               ) FILTER (WHERE f.id IS NOT NULL), '[]'
             ) as feedback_entries
      FROM ${this.tableName} i
      INNER JOIN hiring_applications a ON a.id = i.application_id
      INNER JOIN hiring_candidates c ON c.id = a.candidate_id
      INNER JOIN hiring_jobs j ON j.id = a.job_id
      LEFT JOIN hiring_feedback f ON f.interview_id = i.id
      WHERE i.id = $1
      GROUP BY i.id, a.id, c.id, j.id
      LIMIT 1
    `;
    const result = await this.query(sql, [id]);
    return result.rows[0] || null;
  }

  async listInterviews({
    jobRoleId = null,
    status = null,
    dateFrom = null,
    dateTo = null,
    interviewerId = null,
    limit = 50,
    offset = 0
  } = {}) {
    let sql = `
      SELECT i.*,
             c.name as candidate_name,
             c.email as candidate_email,
             c.phone as candidate_phone,
             j.title as job_title,
             j.department as job_department
      FROM ${this.tableName} i
      INNER JOIN hiring_applications a ON a.id = i.application_id
      INNER JOIN hiring_candidates c ON c.id = a.candidate_id
      INNER JOIN hiring_jobs j ON j.id = a.job_id
      WHERE 1=1
    `;
    const params = [];

    if (jobRoleId) {
      params.push(jobRoleId);
      sql += ` AND a.job_id = $${params.length}`;
    }

    if (status) {
      params.push(status.toLowerCase());
      sql += ` AND LOWER(i.status) = $${params.length}`;
    }

    if (dateFrom) {
      params.push(dateFrom);
      sql += ` AND i.scheduled_at >= $${params.length}::timestamptz`;
    }

    if (dateTo) {
      params.push(dateTo);
      sql += ` AND i.scheduled_at <= $${params.length}::timestamptz`;
    }

    if (interviewerId) {
      params.push(interviewerId);
      sql += ` AND (i.interviewer_id = $${params.length} OR $${params.length} = ANY(i.interviewer_ids))`;
    }

    sql += ` ORDER BY i.scheduled_at ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.query(sql, params);
    return result.rows;
  }

  async listTodayInterviews() {
    const sql = `
      SELECT i.*,
             c.name as candidate_name,
             c.email as candidate_email,
             c.phone as candidate_phone,
             j.title as job_title,
             j.department as job_department
      FROM ${this.tableName} i
      INNER JOIN hiring_applications a ON a.id = i.application_id
      INNER JOIN hiring_candidates c ON c.id = a.candidate_id
      INNER JOIN hiring_jobs j ON j.id = a.job_id
      WHERE DATE(i.scheduled_at) = CURRENT_DATE
        AND i.status != 'cancelled'
      ORDER BY i.scheduled_at ASC
    `;
    const result = await this.query(sql);
    return result.rows;
  }

  async listByApplicationId(applicationId) {
    const sql = `
      SELECT i.*,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', f.id,
                   'overall_rating', f.overall_rating,
                   'decision', f.decision,
                   'comments', f.comments,
                   'submitted_at', f.created_at
                 )
               ) FILTER (WHERE f.id IS NOT NULL), '[]'
             ) as feedback_entries
      FROM ${this.tableName} i
      LEFT JOIN hiring_feedback f ON f.interview_id = i.id
      WHERE i.application_id = $1
      GROUP BY i.id
      ORDER BY i.scheduled_at ASC
    `;
    const result = await this.query(sql, [applicationId]);
    return result.rows;
  }

  async updateStatus(id, newStatus, reason = null) {
    const sql = `
      UPDATE ${this.tableName}
      SET status = $1,
          cancellation_reason = COALESCE($2, cancellation_reason),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await this.query(sql, [newStatus.toLowerCase(), reason, id]);
    return result.rows[0] || null;
  }

  async reschedule(id, { scheduled_at, meeting_link = null, hr_notes = null }) {
    const sql = `
      UPDATE ${this.tableName}
      SET scheduled_at = $1,
          meeting_link = COALESCE($2, meeting_link),
          hr_notes = COALESCE($3, hr_notes),
          status = 'scheduled',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    const result = await this.query(sql, [scheduled_at, meeting_link, hr_notes, id]);
    return result.rows[0] || null;
  }
}

module.exports = InterviewRepository;
