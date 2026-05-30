const authService = require('../services/auth.service');
const { catchAsync, success } = require('../utils/helpers');

exports.register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  success(res, result, 'Registration successful', 201);
});

exports.login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  success(res, result, 'Login successful');
});

exports.refreshToken = catchAsync(async (req, res) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ success: false, message: 'Refresh token required' });
  const tokens = await authService.refreshToken(token);
  success(res, tokens, 'Token refreshed');
});

exports.logout = catchAsync(async (req, res) => {
  await authService.logout(req.userId);
  success(res, null, 'Logout successful');
});

exports.getProfile = catchAsync(async (req, res) => {
  const user = await authService.getProfile(req.userId);
  success(res, user, 'Profile retrieved');
});

exports.updateProfile = catchAsync(async (req, res) => {
  const user = await authService.updateProfile(req.userId, req.body);
  success(res, user, 'Profile updated');
});

exports.changePassword = catchAsync(async (req, res) => {
  const tokens = await authService.changePassword(req.userId, req.body);
  success(res, tokens, 'Password changed successfully');
});
