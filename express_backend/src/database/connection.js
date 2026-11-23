const { prisma } = require('./prisma');

function createPool() {
  return prisma;
}

function getPool() {
  return prisma;
}

async function checkConnection() {
  const result = await prisma.$queryRaw`SELECT NOW() as current_time`;
  return {
    connected: true,
    time: result[0]?.current_time
  };
}

async function closePool() {
  await prisma.$disconnect().catch(() => {});
}

module.exports = {
  prisma,
  createPool,
  getPool,
  checkConnection,
  closePool
};
