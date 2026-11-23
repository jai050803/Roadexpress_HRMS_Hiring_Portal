const { PrismaClient } = require('@prisma/client');

if (!BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function () {
    return Number(this);
  };
}

let prismaInstance = null;

function getPrisma() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
    });
  }
  return prismaInstance;
}

module.exports = {
  prisma: getPrisma(),
  getPrisma
};

