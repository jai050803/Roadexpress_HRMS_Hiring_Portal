const BaseRepository = require('./base.repository');

class ResumeRepository extends BaseRepository {
  constructor(pool = null) {
    super(pool);
    this.tableName = 'hiring_resumes';
  }

  async createResume(data) {
    const resumePayload = {
      candidate_id: data.candidate_id || null,
      application_id: data.application_id || null,
      file_path: data.file_path,
      file_url: data.file_url || null,
      original_filename: data.original_filename,
      file_name: data.file_name || data.original_filename,
      file_size: data.file_size,
      file_size_bytes: data.file_size_bytes || data.file_size,
      file_hash: data.file_hash || null,
      mime_type: data.mime_type || 'application/pdf',
      parse_status: data.parse_status || 'pending',
      parsed_text: data.parsed_text || null,
      parsed_json: data.parsed_json ? JSON.stringify(data.parsed_json) : null
    };

    return await this.create(this.tableName, resumePayload);
  }

  async findById(id) {
    const sql = `
      SELECT r.*,
             c.name as candidate_name,
             c.email as candidate_email,
             c.phone as candidate_phone
      FROM ${this.tableName} r
      LEFT JOIN hiring_candidates c ON c.id = r.candidate_id
      WHERE r.id = $1
      LIMIT 1
    `;
    const result = await this.query(sql, [id]);
    return result.rows[0] || null;
  }

  async findByApplicationId(applicationId) {
    const sql = `SELECT * FROM ${this.tableName} WHERE application_id = $1 LIMIT 1`;
    const result = await this.query(sql, [applicationId]);
    return result.rows[0] || null;
  }

  async findByCandidateId(candidateId) {
    const sql = `SELECT * FROM ${this.tableName} WHERE candidate_id = $1 ORDER BY created_at DESC LIMIT 1`;
    const result = await this.query(sql, [candidateId]);
    return result.rows[0] || null;
  }

  async findByHash(hash) {
    const sql = `SELECT * FROM ${this.tableName} WHERE file_hash = $1 LIMIT 1`;
    const result = await this.query(sql, [hash]);
    return result.rows[0] || null;
  }

  async updateParseStatus(id, { parse_status, parsed_text = null, parsed_json = null, parse_error = null }) {
    const sql = `
      UPDATE ${this.tableName}
      SET parse_status = $1,
          parsed_text = COALESCE($2, parsed_text),
          parsed_json = COALESCE($3::jsonb, parsed_json),
          parse_error = $4,
          parsed_at = CASE WHEN $1 = 'done' THEN CURRENT_TIMESTAMP ELSE parsed_at END
      WHERE id = $5
      RETURNING *
    `;
    const result = await this.query(sql, [
      parse_status,
      parsed_text,
      parsed_json ? JSON.stringify(parsed_json) : null,
      parse_error,
      id
    ]);
    return result.rows[0] || null;
  }
}

module.exports = ResumeRepository;
