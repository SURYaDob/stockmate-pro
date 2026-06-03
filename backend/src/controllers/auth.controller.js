const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../utils/prisma');
const { AppError, catchAsync } = require('../middleware/error.middleware');
const { generateTokens } = require('../middleware/auth.middleware');
const { sendSuccess } = require('../utils/response');
const { sendEmail } = require('../utils/mail');
const {
  buildOtpEmailHtml,
  buildOtpEmailText,
  buildResetPasswordHtml,
  buildResetPasswordText,
} = require('../templates/otpEmail');

const register = catchAsync(async (req, res) => {
  const { email, password, firstName, lastName, phone, role, branchId } = req.body;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new AppError('Email already registered', 409, 'DUPLICATE_EMAIL');

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role: role || 'STAFF',
      branches: branchId ? {
        create: { branchId, isDefault: true },
      } : undefined,
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });

  // Create notification preferences
  await prisma.notificationPreference.create({
    data: { userId: user.id },
  });

  const tokens = generateTokens(user.id, user.role);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
    },
  });

  sendSuccess(res, { user, ...tokens }, 'Registration successful', 201);
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      branches: { include: { branch: true } },
    },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated', 401, 'ACCOUNT_INACTIVE');
  }

  const tokens = generateTokens(user.id, user.role);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken, lastLogin: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.ip,
    },
  });

  const { password: _, refreshToken: __, otp, otpExpiry, resetToken, resetTokenExp, ...safeUser } = user;

  sendSuccess(res, { user: safeUser, ...tokens }, 'Login successful');
});

const sendOtp = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('User not found', 404);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  await prisma.user.update({
    where: { id: user.id },
    data: { otp, otpExpiry },
  });

  // Send OTP via email
  try {
    await sendEmail({
      to: email,
      subject: `Your OTP Code: ${otp}`,
      html: buildOtpEmailHtml({ otp, firstName: user.firstName }),
      text: buildOtpEmailText({ otp, firstName: user.firstName }),
    });
  } catch (err) {
    console.error('[Auth] Failed to send OTP email:', err.message);
    // In production, let the user know the email didn't go through
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('Failed to send OTP email. Please check your email configuration or try again later.', 500, 'EMAIL_FAILED');
    }
  }

  // Always log to console for fallback/debug
  console.log(`\x1b[33m[DEV] OTP for ${email}: ${otp}\x1b[0m`);

  sendSuccess(res, { otp: process.env.NODE_ENV === 'development' ? otp : undefined }, 'OTP sent successfully');
});

const verifyOtp = catchAsync(async (req, res) => {
  const { email, otp } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      branches: { include: { branch: true } },
    },
  });
  if (!user) throw new AppError('User not found', 404);
  if (user.otp !== otp || user.otpExpiry < new Date()) {
    throw new AppError('Invalid or expired OTP', 401, 'INVALID_OTP');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { otp: null, otpExpiry: null },
  });

  const tokens = generateTokens(user.id, user.role);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  const { password: _, refreshToken: __, otp: _otp, otpExpiry: _oe, resetToken: _rt, resetTokenExp: _rte, ...safeUser } = user;

  sendSuccess(res, { user: safeUser, ...tokens }, 'OTP verified successfully');
});

const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError('Refresh token required', 401);

  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

  if (!user || user.refreshToken !== refreshToken) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  const tokens = generateTokens(user.id, user.role);
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  sendSuccess(res, { ...tokens }, 'Token refreshed');
});

const logout = catchAsync(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { refreshToken: null },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'LOGOUT',
      entity: 'User',
      entityId: req.user.id,
    },
  });

  sendSuccess(res, null, 'Logged out successfully');
});

const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('User not found', 404);

  const resetToken = jwt.sign({ userId: user.id }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExp },
  });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  // Send reset link via email
  try {
    await sendEmail({
      to: email,
      subject: 'Reset your StockMate Pro password',
      html: buildResetPasswordHtml({ resetUrl, firstName: user.firstName }),
      text: buildResetPasswordText({ resetUrl, firstName: user.firstName }),
    });
  } catch (err) {
    console.error('[Auth] Failed to send password reset email:', err.message);
    // In production, let the user know the email didn't go through
    if (process.env.NODE_ENV === 'production') {
      throw new AppError('Failed to send password reset email. Please check your email configuration or try again later.', 500, 'EMAIL_FAILED');
    }
  }

  console.log(`\x1b[33m[DEV] Reset URL: ${resetUrl}\x1b[0m`);

  sendSuccess(res, { resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined }, 'Password reset link sent');
});

const resetPassword = catchAsync(async (req, res) => {
  const { token, password } = req.body;

  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

  if (!user || user.resetToken !== token || user.resetTokenExp < new Date()) {
    throw new AppError('Invalid or expired reset token', 401);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword, resetToken: null, resetTokenExp: null },
  });

  sendSuccess(res, null, 'Password reset successful');
});

const getMe = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      branches: {
        include: { branch: true },
      },
    },
    select: {
      id: true, email: true, firstName: true, lastName: true, phone: true,
      role: true, avatar: true, theme: true, language: true, isActive: true,
      lastLogin: true, createdAt: true,
      branches: {
        include: {
          branch: true,
        },
      },
    },
  });
  sendSuccess(res, user);
});

const updateProfile = catchAsync(async (req, res) => {
  const { firstName, lastName, phone, theme, language } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { firstName, lastName, phone, theme, language },
    select: {
      id: true, email: true, firstName: true, lastName: true, phone: true,
      role: true, avatar: true, theme: true, language: true,
    },
  });
  sendSuccess(res, user, 'Profile updated');
});

module.exports = { register, login, sendOtp, verifyOtp, refreshToken, logout, forgotPassword, resetPassword, getMe, updateProfile };
