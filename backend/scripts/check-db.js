require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function main() {
  const p = new PrismaClient();
  try {
    await p.$connect();
    console.log('DB_CONNECTED');
    
    const userCount = await p.user.count();
    console.log('USERS:', userCount);
    
    const users = await p.user.findMany({ 
      select: { email: true, firstName: true, lastName: true, role: true } 
    });
    console.log('USER_LIST:', JSON.stringify(users, null, 2));
  } catch (e) {
    console.log('DB_ERROR:', e.message);
  } finally {
    await p.$disconnect();
  }
}

main();
