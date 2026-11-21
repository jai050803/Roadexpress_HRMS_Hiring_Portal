const BaseRepository = require('./base.repository');

class CandidateRepository extends BaseRepository {
  constructor(pool = null) {
    super(pool);
    this.tableName = 'hiring_candidates';
  }

  async findByEmail(email) {
    const sql = `SELECT * FROM ${this.tableName} WHERE LOWER(email) = LOWER($1) LIMIT 1`;
    const result = await this.query(sql, [email.trim()]);
    return result.rows[0] || null;
  }

  async findById(id) {
    const sql = `
      SELECT c.*,
             COALESCE(
               json_agg(
                 json_build_object(
                   'application_id', a.id,
                   'job_id', j.id,
                   'job_title', j.title,
                   'department', j.department,
                   'status', a.status,
                   'match_score', a.match_score,
                   'applied_at', a.created_at
                 ) ORDER BY a.created_at DESC
               ) FILTER (WHERE a.id IS NOT NULL), '[]'
             ) as application_history
      FROM ${this.tableName} c
      LEFT JOIN hiring_applications a ON a.candidate_id = c.id
      LEFT JOIN hiring_jobs j ON j.id = a.job_id
      WHERE c.id = $1
      GROUP BY c.id
      LIMIT 1
    `;
    const result = await this.query(sql, [id]);
    return result.rows[0] || null;
  }

  async upsertCandidate(data) {
    const normalizedEmail = data.email.toLowerCase().trim();
    const candidateName = (data.name || data.full_name || '').trim();

    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      const updateData = {
        name: candidateName || existing.name,
        full_name: candidateName || existing.full_name,
        phone: data.phone ? data.phone.trim() : existing.phone,
        location: data.location || existing.location,
        current_title: data.current_title || existing.current_title,
        total_experience_years: data.total_experience_years !== undefined ? data.total_experience_years : existing.total_experience_years,
        skills: data.skills || existing.skills,
        linkedin_url: data.linkedin_url || existing.linkedin_url,
        portfolio_url: data.portfolio_url || existing.portfolio_url
      };
      return await this.update(this.tableName, existing.id, updateData);
    }

    return await this.create(this.tableName, {
      name: candidateName,
      full_name: candidateName,
      email: normalizedEmail,
      phone: data.phone ? data.phone.trim() : null,
      location: data.location || null,
      current_title: data.current_title || null,
      total_experience_years: data.total_experience_years || 0,
      skills: data.skills || [],
      linkedin_url: data.linkedin_url || null,
      portfolio_url: data.portfolio_url || null
    });
  }

  async listCandidates({ search = null, skill = null, limit = 20, offset = 0 } = {}) {
    let sql = `
      SELECT c.*,
             COUNT(a.id)::int as total_applications
      FROM ${this.tableName} c
      LEFT JOIN hiring_applications a ON a.candidate_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(c.name) LIKE $${params.length} OR LOWER(c.email) LIKE $${params.length} OR LOWER(COALESCE(c.current_title, '')) LIKE $${params.length})`;
    }

    if (skill) {
      params.push(skill.trim());
      sql += ` AND $${params.length} = ANY(c.skills)`;
    }

    sql += ` GROUP BY c.id ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.query(sql, params);
    return result.rows;
  }

  async countCandidates({ search = null, skill = null } = {}) {
    let sql = `SELECT COUNT(*)::int as total FROM ${this.tableName} WHERE 1=1`;
    const params = [];

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length} OR LOWER(COALESCE(current_title, '')) LIKE $${params.length})`;
    }

    if (skill) {
      params.push(skill.trim());
      sql += ` AND $${params.length} = ANY(skills)`;
    }

    const result = await this.query(sql, params);
    return result.rows[0].total;
  }
}

module.exports = CandidateRepository;
