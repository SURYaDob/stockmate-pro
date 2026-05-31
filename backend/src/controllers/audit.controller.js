const { prisma } = require('../utils/prisma');
const { AppError, catchAsync } = require('../middleware/error.middleware');
const { sendSuccess, getPagination } = require('../utils/response');

const getAll = catchAsync(async (req, res) => {
  const { page = 1, limit = 50, entity, action, startDate, endDate } = req.query;

  const where = {};
  if (entity) where.entity = entity;
  if (action) where.action = action;
  if (startDate) where.createdAt = { gte: new Date(startDate) };
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { ...where.createdAt, lte: end };
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        branch: { select: { id: true, name: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  sendSuccess(res, logs, 'Audit logs fetched', 200, getPagination(total, parseInt(page), parseInt(limit)));
});

const getById = catchAsync(async (req, res) => {
  const log = await prisma.auditLog.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      branch: { select: { id: true, name: true } },
    },
  });
  if (!log) throw new AppError('Audit log not found', 404);
  sendSuccess(res, log);
});

module.exports = { getAll, getById };
