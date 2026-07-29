const authService = require('../services/auth.service');
const { catchAsync, success } = require('../utils/helpers');
const notificationService = require('../services/notification.service');

exports.register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  success(res, result, 'Đăng ký thành công', 201);
});

exports.login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  success(res, result, 'Đăng nhập thành công');
});

exports.loginWithGoogle = catchAsync(async (req, res) => {
  const result = await authService.loginWithGoogle(req.body.idToken);
  success(res, result, 'Đăng nhập Google thành công');
});

exports.refreshToken = catchAsync(async (req, res) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ success: false, message: 'Refresh token required' });
  const tokens = await authService.refreshToken(token);
  success(res, tokens, 'Đã làm mới token');
});

exports.logout = catchAsync(async (req, res) => {
  await authService.logout(req.userId);
  success(res, null, 'Đăng xuất thành công');
});

exports.getProfile = catchAsync(async (req, res) => {
  const user = await authService.getProfile(req.userId);
  success(res, user, 'Đã lấy thông tin hồ sơ');
});

exports.getCustomerProfile = catchAsync(async (req, res) => {
  const user = await authService.getCustomerProfile(req.userId);
  success(res, user, 'Đã lấy hồ sơ khách hàng');
});

exports.updateCustomerProfile = catchAsync(async (req, res) => {
  const user = await authService.updateCustomerProfile(req.userId, req.body);
  notificationService.send(
    req.userId,
    'Cập nhật thông tin',
    'Thông tin cá nhân của bạn đã được cập nhật thành công.',
    'profile_updated'
  ).catch(err => console.error('Error sending profile notification:', err));
  success(res, user, 'Cập nhật hồ sơ thành công');
});

exports.updateProfile = catchAsync(async (req, res) => {
  const user = await authService.updateProfile(req.userId, req.body);
  notificationService.send(
    req.userId,
    'Cập nhật thông tin',
    'Thông tin cá nhân của bạn đã được cập nhật thành công.',
    'profile_updated'
  ).catch(err => console.error('Error sending profile notification:', err));
  success(res, user, 'Cập nhật hồ sơ thành công');
});

exports.changePassword = catchAsync(async (req, res) => {
  const tokens = await authService.changePassword(req.userId, req.body);
  success(res, tokens, 'Đổi mật khẩu thành công');
});

exports.forgotPassword = catchAsync(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  success(res, null, 'OTP đã được gửi đến email');
});

exports.verifyOtp = catchAsync(async (req, res) => {
  const result = await authService.verifyOtp(req.body.email, req.body.otp);
  success(res, result, 'Xác thực OTP thành công');
});

exports.resetPassword = catchAsync(async (req, res) => {
  const result = await authService.resetPassword(req.body.email, req.body.otp, req.body.newPassword);
  success(res, result, 'Đặt lại mật khẩu thành công');
});

exports.createUser = catchAsync(async (req, res) => {
  const user = await authService.createUser(req.body);
  success(res, user, 'Tạo người dùng thành công', 201);
});

exports.getAllUsers = catchAsync(async (req, res) => {
  const users = await authService.getAllUsers(req.query);
  success(res, users, 'Đã lấy danh sách người dùng');
});

exports.getUserById = catchAsync(async (req, res) => {
  const user = await authService.getUserById(req.params.id);
  success(res, user, 'Đã lấy thông tin người dùng');
});

exports.updateUser = catchAsync(async (req, res) => {
  const user = await authService.updateUser(req.params.id, req.body);
  success(res, user, 'Cập nhật người dùng thành công');
});

exports.deleteUser = catchAsync(async (req, res) => {
  await authService.deleteUser(req.params.id);
  success(res, null, 'Đã xóa người dùng');
});
