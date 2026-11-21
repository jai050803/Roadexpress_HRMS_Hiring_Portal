const { getPool } = require('../database/connection');

class BaseRepository {
  constructor(pool = null) {
    this.pool = pool || getPool();
  }

  async query(text, params = []) {
    const start = Date.now();
    const res = await this.pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development' && duration > 500) {
      console.warn(`Slow Query [${duration}ms]: ${text}`);
    }

    return res;
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(tableName, id) {
    const sql = `SELECT * FROM ${tableName} WHERE id = $1 LIMIT 1`;
    const result = await this.query(sql, [id]);
    return result.rows[0] || null;
  }

  async create(tableName, data) {
    const keys = Object.keys(data).filter((k) => data[k] !== undefined);
    const values = keys.map((k) => data[k]);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.map((k) => `"${k}"`).join(', ');

    const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = await this.query(sql, values);
    return result.rows[0];
  }

  async update(tableName, id, data) {
    const keys = Object.keys(data).filter((k) => data[k] !== undefined);
    if (keys.length === 0) {
      return this.findById(tableName, id);
    }

    const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = [...keys.map((k) => data[k]), id];
    const idPlaceholder = `$${values.length}`;

    const sql = `UPDATE ${tableName} SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ${idPlaceholder} RETURNING *`;
    const result = await this.query(sql, values);
    return result.rows[0] || null;
  }

  async delete(tableName, id) {
    const sql = `DELETE FROM ${tableName} WHERE id = $1 RETURNING id`;
    const result = await this.query(sql, [id]);
    return result.rowCount > 0;
  }
}

module.exports = BaseRepository;
