const { prisma } = require('../utils/prisma');
const { AppError, catchAsync } = require('../middleware/error.middleware');
const { sendSuccess, getPagination } = require('../utils/response');

const getAll = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search, isActive } = req.query;
  const branchId = req.branchId;

  const where = { branchId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.employee.count({ where }),
  ]);

  sendSuccess(res, employees, 'Employees fetched', 200, getPagination(total, parseInt(page), parseInt(limit)));
});

const getById = catchAsync(async (req, res) => {
  const employee = await prisma.employee.findUnique({
    where: { id: req.params.id },
    include: {
      attendance: { orderBy: { date: 'desc' }, take: 30 },
    },
  });
  if (!employee) throw new AppError('Employee not found', 404);
  sendSuccess(res, employee);
});

const create = catchAsync(async (req, res) => {
  const { name, phone, email, role, salary } = req.body;

  const employee = await prisma.employee.create({
    data: {
      name,
      phone,
      email,
      role: role || 'Helper',
      branchId: req.branchId,
      salary: salary ? Math.round(salary * 100) : null,
    },
  });

  sendSuccess(res, employee, 'Employee created', 201);
});

const update = catchAsync(async (req, res) => {
  const { name, phone, email, role, salary, isActive } = req.body;
  const existing = await prisma.employee.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Employee not found', 404);

  const employee = await prisma.employee.update({
    where: { id: req.params.id },
    data: {
      name: name || existing.name,
      phone: phone || existing.phone,
      email: email !== undefined ? email : existing.email,
      role: role || existing.role,
      salary: salary !== undefined ? Math.round(salary * 100) : existing.salary,
      isActive: isActive !== undefined ? isActive : existing.isActive,
    },
  });

  sendSuccess(res, employee, 'Employee updated');
});

const clockIn = catchAsync(async (req, res) => {
  const employeeId = req.params.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.employeeAttendance.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });

  if (existing?.clockIn) {
    throw new AppError('Already clocked in today', 400);
  }

  const attendance = await prisma.employeeAttendance.upsert({
    where: { employeeId_date: { employeeId, date: today } },
    create: {
      employeeId,
      userId: req.user.id,
      clockIn: new Date(),
      status: 'PRESENT',
    },
    update: {
      clockIn: new Date(),
      status: 'PRESENT',
    },
  });

  sendSuccess(res, attendance, 'Clocked in successfully');
});

const clockOut = catchAsync(async (req, res) => {
  const employeeId = req.params.id;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendance = await prisma.employeeAttendance.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });

  if (!attendance) throw new AppError('Not clocked in today', 400);
  if (attendance.clockOut) throw new AppError('Already clocked out today', 400);

  const clockOut = new Date();
  const hoursWorked = (clockOut - attendance.clockIn) / (1000 * 60 * 60);

  const updated = await prisma.employeeAttendance.update({
    where: { id: attendance.id },
    data: { clockOut, hoursWorked },
  });

  sendSuccess(res, updated, 'Clocked out successfully');
});

const getAttendance = catchAsync(async (req, res) => {
  const { month, year } = req.query;
  const employeeId = req.params.id;

  const startDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth()) - 1, 1);
  const endDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth()), 0, 23, 59, 59, 999);

  const attendance = await prisma.employeeAttendance.findMany({
    where: {
      employeeId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: 'asc' },
  });

  sendSuccess(res, attendance);
});

const attendanceSummary = catchAsync(async (req, res) => {
  const { month, year } = req.query;
  const branchId = req.branchId;

  const m = parseInt(month) || new Date().getMonth() + 1;
  const y = parseInt(year) || new Date().getFullYear();
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 0, 23, 59, 59, 999);

  const employees = await prisma.employee.findMany({
    where: { branchId, isActive: true },
    include: {
      attendance: {
        where: { date: { gte: startDate, lte: endDate } },
        orderBy: { date: 'asc' },
      },
    },
  });

  const data = employees.map((emp) => {
    const present = emp.attendance.filter((a) => a.status === 'PRESENT').length;
    const totalHours = emp.attendance.reduce((s, a) => s + (a.hoursWorked || 0), 0);
    return {
      id: emp.id,
      name: emp.name,
      role: emp.role,
      totalDays: emp.attendance.length,
      presentDays: present,
      absentDays: emp.attendance.filter((a) => a.status === 'ABSENT').length,
      halfDays: emp.attendance.filter((a) => a.status === 'HALF_DAY').length,
      totalHours: Math.round(totalHours * 100) / 100,
      averageHours: emp.attendance.length > 0 ? Math.round((totalHours / emp.attendance.length) * 100) / 100 : 0,
    };
  });

  sendSuccess(res, data);
});

module.exports = { getAll, getById, create, update, clockIn, clockOut, getAttendance, attendanceSummary };
