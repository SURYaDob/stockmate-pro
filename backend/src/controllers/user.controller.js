const bcrypt = require('bcryptjs');
const { prisma } = require('../utils/prisma');
const { AppError, catchAsync } = require('../middleware/error.middleware');
const { sendSuccess, getPagination } = require('../utils/response');

const getAll = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, role, isActive, search } = req.query;
  const where = {};
  if (role) where.role = role;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        role: true, isActive: true, lastLogin: true, createdAt: true,
        branches: { include: { branch: { select: { id: true, name: true } } } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  sendSuccess(res, users, 'Users fetched', 200, getPagination(total, parseInt(page), parseInt(limit)));
});

const getById = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, email: true, firstName: true, lastName: true, phone: true,
      role: true, isActive: true, theme: true, language: true, lastLogin: true,
      createdAt: true,
      branches: { include: { branch: true } },
    },
  });
  if (!user) throw new AppError('User not found', 404);
  sendSuccess(res, user);
});

const create = catchAsync(async (req, res) => {
  const { email, password, firstName, lastName, phone, role, branchIds } = req.body;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new AppError('Email already registered', 409);

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: role || 'STAFF',
      branches: {
        create: branchIds?.map((branchId, i) => ({
          branchId,
          isDefault: i === 0,
        })) || [],
      },
    },
    select: {
      id: true, email: true, firstName: true, lastName: true, role: true,
      branches: { include: { branch: { select: { id: true, name: true } } } },
    },
  });

  // Create notification preferences
  await prisma.notificationPreference.create({
    data: { userId: user.id },
  });

  sendSuccess(res, user, 'User created', 201);
});

const update = catchAsync(async (req, res) => {
  const { firstName, lastName, phone, role, isActive, theme, language, branchIds } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new AppError('User not found', 404);

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      phone: phone !== undefined ? phone : user.phone,
      role: role || user.role,
      isActive: isActive !== undefined ? isActive : user.isActive,
      theme: theme || user.theme,
      language: language || user.language,
    },
    select: {
      id: true, email: true, firstName: true, lastName: true, phone: true,
      role: true, isActive: true, theme: true, language: true,
    },
  });

  // Update branch assignments
  if (branchIds) {
    await prisma.userBranch.deleteMany({ where: { userId: req.params.id } });
    await prisma.userBranch.createMany({
      data: branchIds.map((branchId, i) => ({
        userId: req.params.id,
        branchId,
        isDefault: i === 0,
      })),
    });
  }

  sendSuccess(res, updated, 'User updated');
});

const deactivate = catchAsync(async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false },
    select: { id: true, email: true, isActive: true },
  });
  sendSuccess(res, user, 'User deactivated');
});

module.exports = { getAll, getById, create, update, deactivate };
