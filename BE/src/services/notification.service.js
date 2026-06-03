const { Notification } = require('../models');

const create = async (userId, title, message, type, data = {}) => {
  const notification = new Notification({ userId, title, message, type, data });
  await notification.save();
  return notification;
};

const createMany = async (notifications) => {
  if (!notifications || notifications.length === 0) return [];
  const docs = notifications.map((n) => ({
    userId: n.userId,
    title: n.title,
    message: n.message,
    type: n.type,
    data: n.data || {},
  }));
  return Notification.insertMany(docs);
};

exports.send = async (userId, title, message, type, data) => {
  return create(userId, title, message, type, data);
};

exports.sendToMany = async (userIds, title, message, type, data) => {
  const notifications = userIds.map((uid) => ({ userId: uid, title, message, type, data }));
  return createMany(notifications);
};

exports.getByUser = async (userId, filters = {}) => {
  const query = { userId };
  if (filters.isRead !== undefined) query.isRead = filters.isRead;
  if (filters.type) query.type = filters.type;

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(query),
  ]);

  return { notifications, total, page, limit, totalPages: Math.ceil(total / limit) };
};

exports.getUnreadCount = async (userId) => {
  return Notification.countDocuments({ userId, isRead: false });
};

exports.markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { new: true }
  );
  if (!notification) throw Object.assign(new Error('Notification not found'), { statusCode: 404, code: 'NOT_FOUND' });
  return notification;
};

exports.markAllAsRead = async (userId) => {
  await Notification.updateMany({ userId, isRead: false }, { isRead: true });
};

exports.delete = async (notificationId, userId) => {
  const notification = await Notification.findOneAndDelete({ _id: notificationId, userId });
  if (!notification) throw Object.assign(new Error('Notification not found'), { statusCode: 404, code: 'NOT_FOUND' });
  return notification;
};

exports.deleteAll = async (userId) => {
  return Notification.deleteMany({ userId });
};
