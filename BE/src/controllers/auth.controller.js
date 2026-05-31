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
