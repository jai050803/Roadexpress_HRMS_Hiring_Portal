const { prisma } = require('../database/prisma');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class BaseRepository {
  constructor(client = null) {
    this.prisma = client || prisma;
  }

  prepareSql(text, params) {
    if (!params || params.length === 0) return text;
    let modified = text;
    params.forEach((param, index) => {
      if (typeof param === 'string' && UUID_REGEX.test(param.trim())) {
        const regex = new RegExp(`\\$${index + 1}(?![a-zA-Z0-9_:])`, 'g');
        modified = modified.replace(regex, `$${index + 1}::uuid`);
      }
    });
    return modified;
  }

  async query(text, params = []) {
    const start = Date.now();
    const preparedText = this.prepareSql(text, params);
    let rows;
    if (params && params.length > 0) {
      rows = await this.prisma.$queryRawUnsafe(preparedText, ...params);
    } else {
      rows = await this.prisma.$queryRawUnsafe(preparedText);
    }
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development' && duration > 500) {
      console.warn(`Slow Query [${duration}ms]: ${text}`);
    }

    return {
      rows: Array.isArray(rows) ? rows : [],
      rowCount: Array.isArray(rows) ? rows.length : 0
    };
  }

  async transaction(callback) {
    return await this.prisma.$transaction(async (tx) => {
      return await callback(tx);
    });
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
