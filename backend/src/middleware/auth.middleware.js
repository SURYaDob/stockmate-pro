const jwt = require('jsonwebtoken');
const { prisma } = require('../utils/prisma');
const { AppError, catchAsync } = require('./error.middleware');

const authenticate = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('Access denied. No token provided.', 401, 'NO_TOKEN');
  }

  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: {
      branches: {
        include: { branch: true },
      },
    },
  });

  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401, 'USER_INACTIVE');
  }

  req.user = user;
  req.userBranches = user.branches.map((ub) => ub.branch);
  
  // Set default branch
  const defaultBranch = user.branches.find((ub) => ub.isDefault);
  req.branchId = req.headers['x-branch-id'] || defaultBranch?.branchId || user.branches[0]?.branchId;

  next();
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN');
    }
    next();
  };
};

const optionalAuth = catchAsync(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (user && user.isActive) {
        req.user = user;
        req.userBranches = await prisma.userBranch.findMany({
          where: { userId: user.id },
          include: { branch: true },
        });
      }
    } catch (e) {
      // silently fail
    }
  }
  next();
});

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId, role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
  return { accessToken, refreshToken };
};

module.exports = { authenticate, authorize, optionalAuth, generateTokens };
