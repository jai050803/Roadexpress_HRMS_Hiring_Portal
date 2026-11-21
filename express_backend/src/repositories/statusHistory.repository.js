const BaseRepository = require('./base.repository');

class StatusHistoryRepository extends BaseRepository {
  constructor(pool = null) {
    super(pool);
    this.tableName = 'hiring_status_history';
  }

  async recordStatusChange({
    applicationId,
    oldStatus = null,
    newStatus,
    changedById = null,
    changedByType = 'hr',
    reason = null,
    remarks = null
  }) {
    const payload = {
      application_id: applicationId,
      old_status: oldStatus,
      from_status: oldStatus,
      new_status: newStatus,
      to_status: newStatus,
      changed_by_id: changedById,
      changed_by_type: changedByType,
      reason,
      remarks
    };

    return await this.create(this.tableName, payload);
  }

  async findByApplicationId(applicationId) {
    const sql = `
      SELECT h.*,
             u.full_name as changed_by_name,
             u.email as changed_by_email
      FROM ${this.tableName} h
      LEFT JOIN hiring_users u ON u.id = h.changed_by_id
      WHERE h.application_id = $1
      ORDER BY h.created_at DESC
    `;
    const result = await this.query(sql, [applicationId]);
    return result.rows;
  }
}

module.exports = StatusHistoryRepository;
