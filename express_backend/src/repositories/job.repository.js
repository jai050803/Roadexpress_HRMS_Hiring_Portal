const BaseRepository = require('./base.repository');

class JobRepository extends BaseRepository {
  constructor(pool = null) {
    super(pool);
    this.tableName = 'hiring_jobs';
  }

  async listPublished({ department = null, work_mode = null, limit = 50, offset = 0 } = {}) {
    let sql = `
      SELECT id, title, department, location, work_mode, employment_type,
             education_qualification, min_experience_years, required_skills,
             responsibilities_text, salary_band, min_salary, max_salary,
             jd_text, application_deadline, max_applications, status, created_at
      FROM ${this.tableName}
      WHERE status = 'published'
    `;
    const params = [];

    if (department) {
      params.push(department);
      sql += ` AND department = $${params.length}`;
    }

    if (work_mode) {
      params.push(work_mode);
      sql += ` AND work_mode = $${params.length}`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.query(sql, params);
    return result.rows;
  }

  async listAll({ status = null, department = null, limit = 100, offset = 0 } = {}) {
    let sql = `
      SELECT j.*,
             COUNT(a.id)::int as calculated_applications_count
      FROM ${this.tableName} j
      LEFT JOIN hiring_applications a ON a.job_id = j.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status.toLowerCase());
      sql += ` AND j.status = $${params.length}`;
    }

    if (department) {
      params.push(department);
      sql += ` AND j.department = $${params.length}`;
    }

    sql += ` GROUP BY j.id ORDER BY j.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.query(sql, params);
    return result.rows;
  }

  async findById(id) {
    const sql = `
      SELECT j.*,
             COUNT(a.id)::int as calculated_applications_count
      FROM ${this.tableName} j
      LEFT JOIN hiring_applications a ON a.job_id = j.id
      WHERE j.id = $1
      GROUP BY j.id
      LIMIT 1
    `;
    const result = await this.query(sql, [id]);
    return result.rows[0] || null;
  }

  async createJob(jobData) {
    return await this.create(this.tableName, jobData);
  }

  async updateJob(id, jobData) {
    return await this.update(this.tableName, id, jobData);
  }

  async updateStatus(id, newStatus) {
    const sql = `
      UPDATE ${this.tableName}
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.query(sql, [newStatus.toLowerCase(), id]);
    return result.rows[0] || null;
  }

  async incrementApplicationsCount(id) {
    const sql = `
      UPDATE ${this.tableName}
      SET applications_count = applications_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING applications_count
    `;
    const result = await this.query(sql, [id]);
    return result.rows[0]?.applications_count || 0;
  }

  async markLinkedInPosted(id) {
    const sql = `
      UPDATE ${this.tableName}
      SET linkedin_posted = true,
          linkedin_posted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.query(sql, [id]);
    return result.rows[0] || null;
  }

  async getJobMetrics() {
    const sql = `
      SELECT
        COUNT(*)::int as total_jobs,
        COUNT(CASE WHEN status = 'published' THEN 1 END)::int as published_jobs,
        COUNT(CASE WHEN status = 'draft' THEN 1 END)::int as draft_jobs,
        COUNT(CASE WHEN status = 'closed' THEN 1 END)::int as closed_jobs,
        COALESCE(SUM(applications_count), 0)::int as total_applications
      FROM ${this.tableName}
    `;
    const result = await this.query(sql);
    return result.rows[0];
  }
}

module.exports = JobRepository;
