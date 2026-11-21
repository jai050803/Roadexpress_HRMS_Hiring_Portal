const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { getPool, closePool } = require('./connection');

async function runMigrations() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Running database migrations for hiring module...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migrations executed successfully.');

    const checkAdmin = await client.query(
      "SELECT id FROM hiring_users WHERE email = 'admin@roadexpress.com' LIMIT 1"
    );

    if (checkAdmin.rows.length === 0) {
      const passwordHash = await bcrypt.hash('Admin@123456', 10);
      await client.query(
        `INSERT INTO hiring_users (email, password_hash, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, $5)`,
        ['admin@roadexpress.com', passwordHash, 'HR System Administrator', 'admin', true]
      );
      console.log('Default admin seeded: admin@roadexpress.com / Admin@123456');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigrations()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async () => {
      await closePool();
      process.exit(1);
    });
}

module.exports = { runMigrations };
