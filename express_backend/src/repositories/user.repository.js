const BaseRepository = require('./base.repository');

class UserRepository extends BaseRepository {
  constructor(pool = null) {
    super(pool);
    this.tableName = 'hiring_users';
  }

  async findByEmail(email) {
    const sql = `SELECT * FROM ${this.tableName} WHERE email = $1 LIMIT 1`;
    const result = await this.query(sql, [email.toLowerCase().trim()]);
    return result.rows[0] || null;
  }

  async createUser(userData) {
    return await this.create(this.tableName, {
      ...userData,
      email: userData.email.toLowerCase().trim()
    });
  }

  async findActiveById(id) {
    const sql = `SELECT id, email, full_name, role, is_active, created_at FROM ${this.tableName} WHERE id = $1 AND is_active = true LIMIT 1`;
    const result = await this.query(sql, [id]);
    return result.rows[0] || null;
  }

  async listActiveUsers() {
    const sql = `SELECT id, full_name as name, email, role FROM ${this.tableName} WHERE is_active = true ORDER BY full_name ASC`;
    const result = await this.query(sql);
    return result.rows;
  }
}

module.exports = UserRepository;
