const { Pool } = require('pg');
const config = require('../config');

let globalPool = null;

function createPool(customConfig = null) {
  if (customConfig && typeof customConfig.query === 'function') {
    globalPool = customConfig;
    return globalPool;
  }

  const poolConfig = customConfig || (config.database.connectionString
    ? { connectionString: config.database.connectionString }
    : {
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database,
        max: config.database.maxConnections,
        idleTimeoutMillis: config.database.idleTimeoutMillis,
        connectionTimeoutMillis: config.database.connectionTimeoutMillis
      });

  globalPool = new Pool(poolConfig);

  globalPool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
  });

  return globalPool;
}

function getPool() {
  if (!globalPool) {
    return createPool();
  }
  return globalPool;
}

async function checkConnection() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW() as current_time');
    return {
      connected: true,
      time: result.rows[0].current_time
    };
  } finally {
    client.release();
  }
}

async function closePool() {
  if (globalPool && typeof globalPool.end === 'function') {
    await globalPool.end();
    globalPool = null;
  }
}

module.exports = {
  createPool,
  getPool,
  checkConnection,
  closePool
};
