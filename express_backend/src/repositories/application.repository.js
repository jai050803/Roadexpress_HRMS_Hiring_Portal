const BaseRepository = require('./base.repository');

class ApplicationRepository extends BaseRepository {
  constructor(pool = null) {
    super(pool);
    this.tableName = 'hiring_applications';
  }

  generateReferenceNumber() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `APP-${dateStr}-${randomHex}`;
  }

  async createApplication(data) {
    const payload = {
      job_id: data.job_id,
      candidate_id: data.candidate_id,
      resume_id: data.resume_id || null,
      reference_number: data.reference_number || this.generateReferenceNumber(),
      source: data.source || 'portal',
      status: data.status || 'APPLIED',
      current_status: data.status || 'APPLIED',
      match_score: data.match_score || null,
      recruiter_notes: data.recruiter_notes || null,
      rejection_reason: data.rejection_reason || null
    };

    return await this.create(this.tableName, payload);
  }

  async findById(id) {
    const sql = `
      SELECT a.*,
             c.name as candidate_name,
             c.email as candidate_email,
             c.phone as candidate_phone,
             c.skills as candidate_skills,
             c.location as candidate_location,
             c.current_title as candidate_title,
             c.total_experience_years as candidate_experience,
             j.title as job_title,
             j.department as job_department,
             j.location as job_location,
             j.salary_band as job_salary_band,
             j.min_salary as job_min_salary,
             j.max_salary as job_max_salary,
             r.file_url as resume_url,
             r.original_filename as resume_filename,
             r.parsed_json as resume_parsed_data,
             s.score as screening_score,
             s.matched_skills as screening_matched_skills,
             s.missing_skills as screening_missing_skills,
             s.llm_rationale as screening_rationale,
             s.hard_filter_passed as screening_hard_filter_passed
      FROM ${this.tableName} a
      INNER JOIN hiring_candidates c ON c.id = a.candidate_id
      INNER JOIN hiring_jobs j ON j.id = a.job_id
      LEFT JOIN hiring_resumes r ON r.id = a.resume_id
      LEFT JOIN hiring_screening_results s ON s.application_id = a.id
      WHERE a.id = $1
      LIMIT 1
    `;
    const result = await this.query(sql, [id]);
    return result.rows[0] || null;
  }

  async findByReferenceNumber(referenceNumber) {
    const sql = `
      SELECT a.*,
             c.name as candidate_name,
             c.email as candidate_email,
             c.phone as candidate_phone,
             j.title as job_title,
             j.department as job_department
      FROM ${this.tableName} a
      INNER JOIN hiring_candidates c ON c.id = a.candidate_id
      INNER JOIN hiring_jobs j ON j.id = a.job_id
      WHERE UPPER(a.reference_number) = UPPER($1)
      LIMIT 1
    `;
    const result = await this.query(sql, [referenceNumber]);
    return result.rows[0] || null;
  }

  async findByJobAndCandidate(jobId, candidateId) {
    const sql = `SELECT * FROM ${this.tableName} WHERE job_id = $1 AND candidate_id = $2 LIMIT 1`;
    const result = await this.query(sql, [jobId, candidateId]);
    return result.rows[0] || null;
  }

  async listApplications({ jobId = null, status = null, minScore = null, search = null, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT a.id, a.reference_number, a.source, a.status, a.current_status, a.match_score,
             a.created_at as applied_at, a.updated_at,
             c.id as candidate_id, c.name as candidate_name, c.email as candidate_email,
             c.phone as candidate_phone, c.current_title as candidate_title,
             j.id as job_id, j.title as job_title, j.department as job_department,
             s.hard_filter_passed, s.matched_skills, s.missing_skills
      FROM ${this.tableName} a
      INNER JOIN hiring_candidates c ON c.id = a.candidate_id
      INNER JOIN hiring_jobs j ON j.id = a.job_id
      LEFT JOIN hiring_screening_results s ON s.application_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (jobId) {
      params.push(jobId);
      sql += ` AND a.job_id = $${params.length}`;
    }

    if (status) {
      params.push(status.toUpperCase());
      sql += ` AND UPPER(a.status) = $${params.length}`;
    }

    if (minScore !== null && minScore !== undefined) {
      params.push(parseFloat(minScore));
      sql += ` AND a.match_score >= $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(c.name) LIKE $${params.length} OR LOWER(c.email) LIKE $${params.length} OR LOWER(a.reference_number) LIKE $${params.length})`;
    }

    sql += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.query(sql, params);
    return result.rows;
  }

  async countApplications({ jobId = null, status = null, minScore = null, search = null } = {}) {
    let sql = `
      SELECT COUNT(*)::int as total
      FROM ${this.tableName} a
      INNER JOIN hiring_candidates c ON c.id = a.candidate_id
      WHERE 1=1
    `;
    const params = [];

    if (jobId) {
      params.push(jobId);
      sql += ` AND a.job_id = $${params.length}`;
    }

    if (status) {
      params.push(status.toUpperCase());
      sql += ` AND UPPER(a.status) = $${params.length}`;
    }

    if (minScore !== null && minScore !== undefined) {
      params.push(parseFloat(minScore));
      sql += ` AND a.match_score >= $${params.length}`;
    }

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(c.name) LIKE $${params.length} OR LOWER(c.email) LIKE $${params.length} OR LOWER(a.reference_number) LIKE $${params.length})`;
    }

    const result = await this.query(sql, params);
    return result.rows[0].total;
  }

  async updateStatus(id, newStatus, matchScore = null) {
    let sql = `
      UPDATE ${this.tableName}
      SET status = $1,
          current_status = $1,
          updated_at = CURRENT_TIMESTAMP
    `;
    const params = [newStatus.toUpperCase()];

    if (matchScore !== null && matchScore !== undefined) {
      params.push(matchScore);
      sql += `, match_score = $${params.length}`;
    }

    params.push(id);
    sql += ` WHERE id = $${params.length} RETURNING *`;

    const result = await this.query(sql, params);
    return result.rows[0] || null;
  }

  async updateNotes(id, { notes = null, rejectionReason = null }) {
    const sql = `
      UPDATE ${this.tableName}
      SET recruiter_notes = COALESCE($1, recruiter_notes),
          rejection_reason = COALESCE($2, rejection_reason),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await this.query(sql, [notes, rejectionReason, id]);
    return result.rows[0] || null;
  }

  async getPipelineCounts(jobId = null) {
    let sql = `
      SELECT
        status,
        COUNT(*)::int as count
      FROM ${this.tableName}
      WHERE 1=1
    `;
    const params = [];

    if (jobId) {
      params.push(jobId);
      sql += ` AND job_id = $1`;
    }

    sql += ` GROUP BY status`;
    const result = await this.query(sql, params);

    const counts = {
      APPLIED: 0,
      SCREENING: 0,
      SHORTLISTED: 0,
      INTERVIEW_SCHEDULED: 0,
      INTERVIEW_COMPLETED: 0,
      OFFER_EXTENDED: 0,
      HIRED: 0,
      REJECTED: 0
    };

    for (const row of result.rows) {
      const key = row.status.toUpperCase();
      if (counts[key] !== undefined) {
        counts[key] = row.count;
      }
    }

    return counts;
  }
}

module.exports = ApplicationRepository;
