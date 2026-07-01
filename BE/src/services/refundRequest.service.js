const { RefundRequest, Booking } = require('../models');
const paymentService = require('./payment.service');
const notificationService = require('./notification.service');

exports.createRequest = async (bookingId, userId, userRole, reason) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  if (userRole === 'customer' && String(booking.userId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  if (!['paid', 'deposit_paid'].includes(booking.paymentStatus)) {
    throw Object.assign(new Error('Chỉ có thể yêu cầu hoàn tiền cho đơn đã thanh toán'), { statusCode: 400, code: 'NOT_PAID' });
  }

  const existingPending = await RefundRequest.findOne({ bookingId, status: 'pending' });
  if (existingPending) {
    throw Object.assign(new Error('Đơn này đã có yêu cầu hoàn tiền đang chờ xử lý'), { statusCode: 409, code: 'REQUEST_ALREADY_PENDING' });
  }

  const request = await RefundRequest.create({ bookingId, userId: booking.userId, reason });

  notificationService.sendToAdminAndManager(
    booking.branchId,
    'Yêu cầu hoàn tiền mới',
    `Khách hàng đã gửi yêu cầu hoàn tiền cho một đơn đặt lịch.`,
    'refund_request',
    { bookingId, refundRequestId: request._id, branchId: booking.branchId }
  ).catch(() => {});

  return request;
};

exports.getAll = async (filters = {}, userRole, userId) => {
  const query = {};
  if (userRole === 'customer') {
    query.userId = userId;
  } else if (filters.status) {
    query.status = filters.status;
  }
  return RefundRequest.find(query)
    .populate({ path: 'bookingId', populate: { path: 'branchId', select: 'name' }, select: 'bookingDate startTime status paymentStatus finalPrice branchId' })
    .populate('userId', 'name email phone')
    .populate('reviewedBy', 'name')
    .sort({ createdAt: -1 });
};

exports.getById = async (id, userRole, userId) => {
  const request = await RefundRequest.findById(id)
    .populate({ path: 'bookingId', populate: { path: 'branchId', select: 'name' } })
    .populate('userId', 'name email phone')
    .populate('reviewedBy', 'name');
  if (!request) throw Object.assign(new Error('Refund request not found'), { statusCode: 404, code: 'NOT_FOUND' });
  if (userRole === 'customer' && String(request.userId?._id || request.userId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  return request;
};

exports.reviewRequest = async (id, reviewerId, decision, reviewNote) => {
  if (!['approved', 'rejected'].includes(decision)) {
    throw Object.assign(new Error('Invalid decision'), { statusCode: 400, code: 'INVALID_DECISION' });
  }

  const request = await RefundRequest.findById(id);
  if (!request) throw Object.assign(new Error('Refund request not found'), { statusCode: 404, code: 'NOT_FOUND' });
  if (request.status !== 'pending') {
    throw Object.assign(new Error('Yêu cầu này đã được xử lý'), { statusCode: 409, code: 'ALREADY_REVIEWED' });
  }

  if (decision === 'approved') {
    await paymentService.refundPayment(request.bookingId);
  } else {
    notificationService.send(
      request.userId,
      'Yêu cầu hoàn tiền bị từ chối',
      reviewNote || 'Yêu cầu hoàn tiền của bạn đã bị từ chối.',
      'refund_request_rejected',
      { bookingId: request.bookingId, refundRequestId: request._id }
    ).catch(() => {});
  }

  request.status = decision;
  request.reviewedBy = reviewerId;
  request.reviewNote = reviewNote;
  request.reviewedAt = new Date();
  await request.save();

  return request;
};
