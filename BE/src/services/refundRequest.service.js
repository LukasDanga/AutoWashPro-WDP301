const { RefundRequest, Booking } = require('../models');
const paymentService = require('./payment.service');
const notificationService = require('./notification.service');
const sseService = require('./sse.service');

exports.createRequest = async (bookingId, userId, userRole, reason) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  if (userRole === 'customer' && String(booking.userId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  if (!['paid', 'deposit_paid'].includes(booking.paymentStatus)) {
    throw Object.assign(new Error('Chỉ có thể yêu cầu hoàn tiền cho đơn đã thanh toán'), { statusCode: 400, code: 'NOT_PAID' });
  }

    if (booking.status === 'completed' && booking.updatedAt) {
    const hoursSinceCompletion = (Date.now() - new Date(booking.updatedAt).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCompletion > 24) {
      throw Object.assign(new Error('Chỉ có thể yêu cầu hoàn tiền trong vòng 24 giờ kể từ khi hoàn thành đơn'), { statusCode: 400, code: 'TIME_EXPIRED' });
    }
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

  // Real-time broadcasts
  const customerId = String(booking.userId);
  const bId = String(booking._id);
  const rId = String(request._id);

  sseService.sendToUser(customerId, 'refund_request_updated', {
    bookingId: bId,
    refundRequestId: rId,
    status: 'pending',
    reason,
  });
  if (booking.branchId) {
    sseService.broadcastToManagers(String(booking.branchId), 'refund_request_new', {
      bookingId: bId,
      refundRequestId: rId,
      branchId: String(booking.branchId),
      status: 'pending',
    });
  }
  sseService.broadcastToAll('refund_requests_updated', {
    bookingId: bId,
    refundRequestId: rId,
    status: 'pending',
  });

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
    .populate({ path: 'bookingId', populate: { path: 'branchId', select: 'name' }, select: 'bookingDate startTime status paymentStatus finalPrice depositAmount deposit depositPaid branchId' })
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

  const request = await RefundRequest.findById(id).populate('bookingId');
  if (!request) throw Object.assign(new Error('Refund request not found'), { statusCode: 404, code: 'NOT_FOUND' });
  if (request.status !== 'pending') {
    throw Object.assign(new Error('Yêu cầu này đã được xử lý'), { statusCode: 409, code: 'ALREADY_REVIEWED' });
  }

  const booking = request.bookingId;
  const bookingId = booking?._id || request.bookingId;
  const branchId = booking?.branchId;

  if (decision === 'approved') {
    await paymentService.refundPayment(bookingId);
  } else {
    notificationService.send(
      request.userId,
      'Yêu cầu hoàn tiền bị từ chối',
      reviewNote || 'Yêu cầu hoàn tiền của bạn đã bị từ chối.',
      'refund_request_rejected',
      { bookingId, refundRequestId: request._id }
    ).catch(() => {});
  }

  request.status = decision;
  request.reviewedBy = reviewerId;
  request.reviewNote = reviewNote;
  request.reviewedAt = new Date();
  await request.save();

  // Real-time broadcasts
  const userIdStr = String(request.userId?._id || request.userId);
  const bookingIdStr = String(bookingId);
  const requestIdStr = String(request._id);

  sseService.sendToUser(userIdStr, 'refund_request_updated', {
    bookingId: bookingIdStr,
    refundRequestId: requestIdStr,
    status: decision,
    reviewNote,
  });
  sseService.sendToUser(userIdStr, 'my_bookings_updated', { bookingId: bookingIdStr });

  if (decision === 'approved') {
    sseService.sendToUser(userIdStr, 'wallet_topup_success', { bookingId: bookingIdStr });
  }

  if (branchId) {
    sseService.broadcastToManagers(String(branchId), 'refund_request_updated', {
      bookingId: bookingIdStr,
      refundRequestId: requestIdStr,
      status: decision,
    });
  }
  sseService.broadcastToAll('refund_requests_updated', {
    bookingId: bookingIdStr,
    refundRequestId: requestIdStr,
    status: decision,
  });

  return request;
};
