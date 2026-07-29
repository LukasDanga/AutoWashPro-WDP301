const notificationService = require('../services/notification.service');
const { catchAsync, success } = require('../utils/helpers');

exports.getMyNotifications = catchAsync(async (req, res) => {
  const result = await notificationService.getByUser(req.userId, req.query);
  success(res, result, 'Đã lấy danh sách thông báo');
});

exports.getUnreadCount = catchAsync(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.userId);
  success(res, { unread: count }, 'Đã lấy số lượng thông báo chưa đọc');
});

exports.markAsRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.userId);
  success(res, notification, 'Đánh dấu thông báo đã đọc');
});

exports.markAllAsRead = catchAsync(async (req, res) => {
  await notificationService.markAllAsRead(req.userId);
  success(res, null, 'Đã đánh dấu đọc tất cả thông báo');
});

exports.deleteNotification = catchAsync(async (req, res) => {
  await notificationService.delete(req.params.id, req.userId);
  success(res, null, 'Đã xóa thông báo');
});

exports.deleteAll = catchAsync(async (req, res) => {
  await notificationService.deleteAll(req.userId);
  success(res, null, 'Đã xóa tất cả thông báo');
});
