const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function connectDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connected successfully');
    return true;
  } catch (error) {
    console.log('Database connection failed:', error.message);
    return false;
  }
}

module.exports = {
  prisma,
  connectDatabase
};
