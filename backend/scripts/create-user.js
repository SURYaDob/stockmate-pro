require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = 'surajdobale29@gmail.com';
  
  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('User already exists:', existing.email, '-', existing.role);
    return;
  }

  // Find the first branch to assign user to it
  const branch = await prisma.branch.findFirst();
  
  // Create user
  const hashedPassword = await bcrypt.hash('Test@123', 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName: 'Suraj',
      lastName: 'Dobale',
      phone: '+919876543210',
      role: 'ADMIN',
      isActive: true,
      branches: branch ? {
        create: { branchId: branch.id, isDefault: true },
      } : undefined,
    },
  });

  // Create notification preferences
  await prisma.notificationPreference.create({
    data: { userId: user.id },
  });

  console.log('User created:', user.email, '-', user.role);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
