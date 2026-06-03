const notificationService = require('../services/notification.service');
const { catchAsync, success } = require('../utils/helpers');

exports.getMyNotifications = catchAsync(async (req, res) => {
  const result = await notificationService.getByUser(req.userId, req.query);
  success(res, result, 'Notifications retrieved');
});

exports.getUnreadCount = catchAsync(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.userId);
  success(res, { unread: count }, 'Unread count retrieved');
});

exports.markAsRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.id, req.userId);
  success(res, notification, 'Notification marked as read');
});

exports.markAllAsRead = catchAsync(async (req, res) => {
  await notificationService.markAllAsRead(req.userId);
  success(res, null, 'All notifications marked as read');
});

exports.deleteNotification = catchAsync(async (req, res) => {
  await notificationService.delete(req.params.id, req.userId);
  success(res, null, 'Notification deleted');
});

exports.deleteAll = catchAsync(async (req, res) => {
  await notificationService.deleteAll(req.userId);
  success(res, null, 'All notifications deleted');
});
