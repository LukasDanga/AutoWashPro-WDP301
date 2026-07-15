const { Notification, User, Branch } = require('../models');
const sseService = require('./sse.service');

const create = async (userId, title, message, type, data = {}) => {
  const user = await User.findById(userId);
  if (!user) return null;
  const notification = new Notification({ userId, title, message, type, data });
  await notification.save();
  // Push real-time to connected client
  sseService.sendToUser(userId, 'notification', { title, message, type });
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
  const existing = await User.find({ _id: { $in: userIds } }).select('_id');
  const validIds = new Set(existing.map((u) => String(u._id)));
  const notifications = userIds
    .filter((uid) => validIds.has(String(uid)))
    .map((uid) => ({ userId: uid, title, message, type, data }));
  if (notifications.length === 0) return [];
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

// ─── Admin / Manager notification helpers ────────────────────────────────────
// Send notification to all admin users
exports.sendToAdmins = async (title, message, type, data) => {
  const admins = await User.find({ role: 'admin', status: 'active' }).select('_id');
  if (admins.length === 0) return;
  const docs = admins.map(a => ({ userId: a._id, title, message, type, data: data || {} }));
  await Notification.insertMany(docs);
  // Push SSE to each connected admin
  for (const admin of admins) {
    sseService.sendToUser(String(admin._id), 'notification', { title, message, type });
  }
};

// Send notification to the manager of a specific branch
exports.sendToBranchManager = async (branchId, title, message, type, data) => {
  if (!branchId) return;
  const branch = await Branch.findById(branchId).select('managerId');
  if (!branch || !branch.managerId) return;
  const notification = new Notification({ userId: branch.managerId, title, message, type, data: data || {} });
  await notification.save();
  sseService.sendToUser(String(branch.managerId), 'notification', { title, message, type });
};

// Send notification to admin + manager of a branch
exports.sendToAdminAndManager = async (branchId, title, message, type, data) => {
  await Promise.all([
    exports.sendToAdmins(title, message, type, data),
    exports.sendToBranchManager(branchId, title, message, type, data),
  ]);
};
