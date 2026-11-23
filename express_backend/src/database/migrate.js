const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { prisma } = require('./prisma');
const { closePool } = require('./connection');

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inString = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const next = sql[i + 1];

    if (inString) {
      current += char;
      if (char === "'" && sql[i - 1] !== '\\') {
        inString = false;
      }
    } else if (inBlockComment) {
      current += char;
      if (char === '*' && next === '/') {
        current += next;
        i++;
        inBlockComment = false;
      }
    } else {
      if (char === "'") {
        inString = true;
        current += char;
      } else if (char === '/' && next === '*') {
        inBlockComment = true;
        current += char + next;
        i++;
      } else if (char === '-' && next === '-') {
        const nl = sql.indexOf('\n', i);
        if (nl === -1) break;
        i = nl;
      } else if (char === ';') {
        if (current.trim().length > 0) {
          statements.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }
  }
  if (current.trim().length > 0) {
    statements.push(current.trim());
  }
  return statements;
}

async function runMigrations() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Running database migrations for hiring module via Prisma...');
  const statements = splitSqlStatements(sql);

  for (const stmt of statements) {
    await prisma.$executeRawUnsafe(stmt);
  }
  console.log('Migrations executed successfully.');

  const checkAdmin = await prisma.$queryRaw`
    SELECT id FROM hiring_users WHERE email = 'admin@roadexpress.com' LIMIT 1
  `;

  if (!checkAdmin || checkAdmin.length === 0) {
    const passwordHash = await bcrypt.hash('Admin@123456', 10);
    await prisma.$executeRaw`
      INSERT INTO hiring_users (email, password_hash, full_name, role, is_active)
      VALUES ('admin@roadexpress.com', ${passwordHash}, 'HR System Administrator', 'admin', true)
    `;
    console.log('Default admin seeded: admin@roadexpress.com / Admin@123456');
  }
}

if (require.main === module) {
  runMigrations()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('Migration failed:', err);
      await closePool();
      process.exit(1);
    });
}

module.exports = { runMigrations };
