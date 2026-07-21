const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { User } = require('../models');
const config = require('../config');
const loyaltyService = require('./loyalty.service');

const client = new OAuth2Client();

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ id: userId }, config.JWT_REFRESH_SECRET, { expiresIn: config.JWT_REFRESH_EXPIRES_IN });
  return { accessToken, refreshToken };
};

exports.register = async ({ name, email, password, phone }) => {
  const existing = await User.findOne({ email });
  if (existing) throw Object.assign(new Error('Email already registered'), { statusCode: 409, code: 'EMAIL_EXISTS' });

  const user = new User({ name, email, password, phone });
  const tokens = generateTokens(user._id);
  user.refreshToken = tokens.refreshToken;
  await user.save();
  return { user, ...tokens };
};

exports.login = async ({ identifier, password }) => {
  const query = identifier.includes('@')
    ? { email: identifier.toLowerCase().trim() }
    : { phone: identifier.trim() };

  const user = await User.findOne(query).select('+password');
  if (!user) throw Object.assign(new Error('Invalid email or password'), { statusCode: 401, code: 'INVALID_CREDENTIALS' });

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw Object.assign(new Error('Invalid email or password'), { statusCode: 401, code: 'INVALID_CREDENTIALS' });

  if (user.status === 'suspended') throw Object.assign(new Error('Account is suspended'), { statusCode: 403, code: 'ACCOUNT_SUSPENDED' });

  const tokens = generateTokens(user._id);
  user.refreshToken = tokens.refreshToken;
  user.lastLogin = new Date();
  await user.save();
  
  // Kiểm tra điểm hết hạn (chạy bất đồng bộ)
  loyaltyService.checkAndExpirePoints(user._id).catch(err => console.error('Point expiration error:', err));
  
  return { user, ...tokens };
};

exports.loginWithGoogle = async (idToken) => {
  const audiences = [process.env.GOOGLE_WEB_CLIENT_ID, process.env.GOOGLE_ANDROID_CLIENT_ID].filter(Boolean);
  
  if (!audiences.length) {
    throw Object.assign(new Error('Google Auth is not configured on the server'), { statusCode: 500, code: 'CONFIG_ERROR' });
  }

  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: audiences,
    });
  } catch (error) {
    throw Object.assign(new Error('Invalid Google token'), { statusCode: 401, code: 'INVALID_GOOGLE_TOKEN' });
  }

  const payload = ticket.getPayload();
  const { email, name, picture } = payload;

  if (!email) {
    throw Object.assign(new Error('Email not provided by Google'), { statusCode: 400, code: 'MISSING_EMAIL' });
  }

  let user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    // Tự động đăng ký user mới
    const bcrypt = require('bcryptjs');
    const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
    user = new User({
      name: name || 'Người dùng Google',
      email: email.toLowerCase().trim(),
      password: bcrypt.hashSync(randomPassword, 12),
      avatar: picture,
      role: 'customer' // Mặc định là customer
    });
  } else if (user.status === 'suspended') {
    throw Object.assign(new Error('Account is suspended'), { statusCode: 403, code: 'ACCOUNT_SUSPENDED' });
  }

  const tokens = generateTokens(user._id);
  user.refreshToken = tokens.refreshToken;
  user.lastLogin = new Date();
  
  // Update avatar if provided and user doesn't have one
  if (picture && !user.avatar) {
    user.avatar = picture;
  }
  
  await user.save();
  
  // Kiểm tra điểm hết hạn
  loyaltyService.checkAndExpirePoints(user._id).catch(err => console.error('Point expiration error:', err));
  
  return { user, ...tokens };
};

exports.refreshToken = async (token) => {
  if (!token) throw Object.assign(new Error('Refresh token required'), { statusCode: 401, code: 'TOKEN_REQUIRED' });

  let decoded;
  try {
    decoded = jwt.verify(token, config.JWT_REFRESH_SECRET);
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401, code: 'INVALID_REFRESH_TOKEN' });
  }

  const tokens = generateTokens(decoded.id);

  // Atomic: update only if the refresh token matches
  const user = await User.findOneAndUpdate(
    { _id: decoded.id, refreshToken: token },
    { refreshToken: tokens.refreshToken, lastLogin: new Date() },
    { new: true }
  );

  if (!user) {
    throw Object.assign(new Error('Refresh token has been revoked or is invalid'), { statusCode: 401, code: 'INVALID_REFRESH_TOKEN' });
  }

  return tokens;
};

exports.logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

exports.getProfile = async (userId) => {
  // Kiểm tra điểm hết hạn trước khi trả về user
  await loyaltyService.checkAndExpirePoints(userId).catch(err => console.error('Point expiration error:', err));
  
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404, code: 'USER_NOT_FOUND' });
  return user;
};

exports.getCustomerProfile = async (userId) => {
  await loyaltyService.checkAndExpirePoints(userId).catch(err => console.error('Point expiration error:', err));

  const Vehicle = require('../models/vehicle.schema');
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404, code: 'USER_NOT_FOUND' });

  const userObj = user.toJSON();
  userObj.vehicles = await Vehicle.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
  return userObj;
};

exports.updateCustomerProfile = async (userId, updates) => {
  const allowed = ['name', 'phone', 'avatar', 'dateOfBirth'];
  const filtered = {};
  allowed.forEach((k) => { if (updates[k] !== undefined) filtered[k] = updates[k]; });

  const Vehicle = require('../models/vehicle.schema');

  const user = await User.findByIdAndUpdate(userId, filtered, { new: true, runValidators: true });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404, code: 'USER_NOT_FOUND' });

  const userObj = user.toJSON();
  userObj.vehicles = await Vehicle.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
  return userObj;
};

exports.updateProfile = async (userId, updates) => {
  const allowed = ['name', 'phone', 'avatar', 'dateOfBirth'];
  const filtered = {};
  allowed.forEach((k) => { if (updates[k] !== undefined) filtered[k] = updates[k]; });
  const user = await User.findByIdAndUpdate(userId, filtered, { new: true, runValidators: true });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404, code: 'USER_NOT_FOUND' });
  return user;
};

exports.changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404, code: 'USER_NOT_FOUND' });

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw Object.assign(new Error('Current password is incorrect'), { statusCode: 400, code: 'INVALID_PASSWORD' });

  user.password = newPassword;
  const tokens = generateTokens(user._id);
  user.refreshToken = tokens.refreshToken;
  await user.save();
  return tokens;
};

exports.forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404, code: 'USER_NOT_FOUND' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const bcrypt = require('bcryptjs');
  user.forgotPasswordToken = bcrypt.hashSync(otp, 12);
  user.forgotPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  await user.save();

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"AutoWashPro" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Mã xác nhận khôi phục mật khẩu - AutoWashPro',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0f172a;">Khôi phục mật khẩu</h2>
        <p>Xin chào,</p>
        <p>Bạn đã yêu cầu khôi phục mật khẩu cho tài khoản AutoWashPro. Dưới đây là mã xác nhận (OTP) của bạn:</p>
        <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #2563eb; margin: 20px 0; border-radius: 8px; border: 1px dashed #cbd5e1;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 14px;">Mã này sẽ hết hạn sau <strong>15 phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">Nếu bạn không yêu cầu điều này, xin vui lòng bỏ qua email này.</p>
      </div>
    `
  });
};

exports.verifyOtp = async (email, otp) => {
  const user = await User.findOne({ email }).select('+forgotPasswordToken +forgotPasswordExpires');
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404, code: 'USER_NOT_FOUND' });

  if (!user.forgotPasswordToken || !user.forgotPasswordExpires || user.forgotPasswordExpires < Date.now()) {
    throw Object.assign(new Error('OTP has expired or is invalid'), { statusCode: 400, code: 'OTP_EXPIRED' });
  }

  const bcrypt = require('bcryptjs');
  const isMatch = bcrypt.compareSync(otp, user.forgotPasswordToken);
  if (!isMatch) {
    throw Object.assign(new Error('Invalid OTP'), { statusCode: 400, code: 'INVALID_OTP' });
  }

  return { valid: true };
};

exports.resetPassword = async (email, otp, newPassword) => {
  const user = await User.findOne({ email }).select('+forgotPasswordToken +forgotPasswordExpires');
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404, code: 'USER_NOT_FOUND' });

  if (!user.forgotPasswordToken || !user.forgotPasswordExpires || user.forgotPasswordExpires < Date.now()) {
    throw Object.assign(new Error('OTP has expired or is invalid'), { statusCode: 400, code: 'OTP_EXPIRED' });
  }

  const bcrypt = require('bcryptjs');
  const isMatch = bcrypt.compareSync(otp, user.forgotPasswordToken);
  if (!isMatch) {
    throw Object.assign(new Error('Invalid OTP'), { statusCode: 400, code: 'INVALID_OTP' });
  }

  user.password = newPassword;
  user.forgotPasswordToken = undefined;
  user.forgotPasswordExpires = undefined;
  
  const tokens = generateTokens(user._id);
  user.refreshToken = tokens.refreshToken;
  await user.save();
  return tokens;
};

exports.createUser = async ({ name, email, password, phone, role }) => {
  const existing = await User.findOne({ email });
  if (existing) throw Object.assign(new Error('Email already registered'), { statusCode: 409, code: 'EMAIL_EXISTS' });
  const user = new User({ name, email, password, phone, role });
  await user.save();
  return user;
};

exports.getAllUsers = async (filters = {}) => {
  const query = {};
  if (filters.role) query.role = filters.role;
  if (filters.status) query.status = filters.status;

  if (filters.search && filters.search.trim()) {
    const re = new RegExp(filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: re }, { email: re }, { phone: re }];
  }

  if (filters.all === 'true' || filters.all === true) {
    const users = await User.find(query).sort({ createdAt: -1 });
    const total = users.length;
    return { users, pagination: { total } };
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(query),
  ]);

  return {
    users,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPrevPage: page > 1 },
  };
};

exports.getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404, code: 'USER_NOT_FOUND' });
  return user;
};

exports.updateUser = async (id, updates) => {
  const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404, code: 'USER_NOT_FOUND' });
  return user;
};

exports.deleteUser = async (id) => {
  const user = await User.findByIdAndDelete(id);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404, code: 'USER_NOT_FOUND' });
  return user;
};
