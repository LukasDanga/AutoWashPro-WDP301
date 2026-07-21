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

exports.loginWithGoogle = catchAsync(async (req, res) => {
  const result = await authService.loginWithGoogle(req.body.idToken);
  success(res, result, 'Google login successful');
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

exports.getCustomerProfile = catchAsync(async (req, res) => {
  const user = await authService.getCustomerProfile(req.userId);
  success(res, user, 'Customer profile retrieved');
});

exports.updateCustomerProfile = catchAsync(async (req, res) => {
  const user = await authService.updateCustomerProfile(req.userId, req.body);
  success(res, user, 'Customer profile updated');
});

exports.updateProfile = catchAsync(async (req, res) => {
  const user = await authService.updateProfile(req.userId, req.body);
  success(res, user, 'Profile updated');
});

exports.changePassword = catchAsync(async (req, res) => {
  const tokens = await authService.changePassword(req.userId, req.body);
  success(res, tokens, 'Password changed successfully');
});

exports.forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  success(res, null, 'OTP sent to email');
});

exports.verifyOtp = catchAsync(async (req, res) => {
  const result = await authService.verifyOtp(req.body.email, req.body.otp);
  success(res, result, 'OTP verified');
});

exports.resetPassword = catchAsync(async (req, res) => {
  const result = await authService.resetPassword(req.body.email, req.body.otp, req.body.newPassword);
  success(res, result, 'Password reset successful');
});

exports.createUser = catchAsync(async (req, res) => {
  const user = await authService.createUser(req.body);
  success(res, user, 'User created', 201);
});

exports.getAllUsers = catchAsync(async (req, res) => {
  const users = await authService.getAllUsers(req.query);
  success(res, users, 'Users retrieved');
});

exports.getUserById = catchAsync(async (req, res) => {
  const user = await authService.getUserById(req.params.id);
  success(res, user, 'User retrieved');
});

exports.updateUser = catchAsync(async (req, res) => {
  const user = await authService.updateUser(req.params.id, req.body);
  success(res, user, 'User updated');
});

exports.deleteUser = catchAsync(async (req, res) => {
  await authService.deleteUser(req.params.id);
  success(res, null, 'User deleted');
});
