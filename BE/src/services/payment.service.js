const mongoose = require('mongoose');
const { Payment, Booking } = require('../models');
const notificationService = require('./notification.service');
const voucherService = require('./voucher.service');
const loyaltyService = require('./loyalty.service');

const generateTransactionId = () => `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
const VALID_METHODS = ['cash', 'momo', 'vnpay'];

const simulateMomoPayment = (amount, transactionId) => `https://momo.vn/pay?amount=${amount}&txn=${transactionId}`;
const simulateVNPayPayment = (amount, transactionId) => `https://vnpay.vn/pay?amount=${amount}&txn=${transactionId}`;

exports.createPayment = async (bookingId, requesterId, userRole, method) => {
  if (!VALID_METHODS.includes(method)) {
    throw Object.assign(new Error('Invalid payment method'), { statusCode: 400, code: 'INVALID_METHOD' });
  }

  const booking = await Booking.findById(bookingId).populate('packageId');
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  if (userRole === 'customer' && String(booking.userId) !== String(requesterId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  if (booking.status === 'cancelled') {
    throw Object.assign(new Error('Booking is cancelled'), { statusCode: 400, code: 'BOOKING_CANCELLED' });
  }
  if (!booking.packageId) {
    throw Object.assign(new Error('Package not found'), { statusCode: 400, code: 'PACKAGE_NOT_FOUND' });
  }

  if (booking.paymentStatus === 'paid') {
    throw Object.assign(new Error('Booking already paid'), { statusCode: 409, code: 'ALREADY_PAID' });
  }

  if (!['pending', 'in_progress', 'completed'].includes(booking.status)) {
    throw Object.assign(new Error(`Cannot create payment for booking with status '${booking.status}'`), { statusCode: 400, code: 'INVALID_BOOKING_STATUS' });
  }

  const existingPending = await Payment.findOne({ bookingId, status: 'pending' });
  if (existingPending) return existingPending;

  const targetUserId = booking.userId;

  let payment = await Payment.findOneAndUpdate(
    { bookingId, status: { $nin: ['paid', 'refunded'] } },
    { bookingId, userId: targetUserId, amount: booking.finalPrice || booking.packageId.price, method, transactionId: generateTransactionId(), status: 'pending' },
    { new: true, upsert: true, runValidators: true }
  );

  const amount = payment.amount;

  if (booking.voucherCode) {
    await voucherService.reserveVoucher(booking.voucherCode, targetUserId, bookingId, booking.discountAmount || 0);
  }

  if (method === 'cash') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      payment.status = 'paid';
      payment.paidAt = new Date();
      await payment.save({ session });
      await Booking.findByIdAndUpdate(booking._id, { paymentStatus: 'paid', paidAt: new Date(), paymentMethod: method }).session(session);
      
      // Tích điểm
      await loyaltyService.addPointsFromPayment(targetUserId, amount, bookingId, session);

      
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      if (booking.voucherCode) {
        await voucherService.rollbackVoucher(booking.voucherCode, userId, bookingId).catch(() => {});
      }
      throw err;
    } finally {
      session.endSession();
    }

    notificationService.send(
      booking.userId,
      'Thanh toán thành công',
      `Thanh toán ${amount.toLocaleString('vi-VN')}đ bằng tiền mặt đã được xác nhận.`,
      'payment_confirmed',
      { bookingId, paymentId: payment._id }
    ).catch(() => {});

    return payment;
  }

  const paymentUrl = method === 'momo'
    ? simulateMomoPayment(amount, payment.transactionId)
    : simulateVNPayPayment(amount, payment.transactionId);

  payment.paymentUrl = paymentUrl;
  await payment.save();
  return payment;
};

exports.confirmPayment = async (transactionId, method, gatewayTransactionId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await Payment.findOne({ transactionId }).session(session);
    if (!payment) {
      await session.abortTransaction();
      throw Object.assign(new Error('Payment not found'), { statusCode: 404, code: 'PAYMENT_NOT_FOUND' });
    }
    if (payment.status === 'paid') {
      await session.commitTransaction();
      return payment;
    }

    const booking = await Booking.findById(payment.bookingId).session(session);
    if (!booking) {
      await session.abortTransaction();
      throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
    }
    if (!VALID_METHODS.includes(method)) {
      await session.abortTransaction();
      throw Object.assign(new Error('Invalid payment method'), { statusCode: 400, code: 'INVALID_METHOD' });
    }
    if (payment.method !== method) {
      await session.abortTransaction();
      throw Object.assign(new Error('Payment method mismatch'), { statusCode: 400, code: 'METHOD_MISMATCH' });
    }
    if (booking.status === 'cancelled') {
      await session.abortTransaction();
      throw Object.assign(new Error('Cannot confirm payment for a cancelled booking'), { statusCode: 400, code: 'BOOKING_CANCELLED' });
    }

    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.gatewayTransactionId = gatewayTransactionId || payment.gatewayTransactionId;
    await payment.save({ session });
    await Booking.findByIdAndUpdate(booking._id, { paymentStatus: 'paid', paidAt: new Date(), paymentMethod: payment.method }).session(session);

    // Tích điểm
    await loyaltyService.addPointsFromPayment(payment.userId, payment.amount, booking._id, session);

    await session.commitTransaction();

    notificationService.send(
      booking.userId,
      'Thanh toán thành công',
      `Thanh toán ${booking.finalPrice?.toLocaleString('vi-VN') || payment.amount.toLocaleString('vi-VN')}đ bằng ${payment.method.toUpperCase()} đã được xác nhận.`,
      'payment_confirmed',
      { bookingId: booking._id, paymentId: payment._id }
    ).catch(() => {});

    return payment;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

exports.confirmPaymentCallback = async (transactionId, gatewayTransactionId, success) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await Payment.findOne({ transactionId }).session(session);
    if (!payment) {
      await session.abortTransaction();
      throw Object.assign(new Error('Payment not found'), { statusCode: 404, code: 'PAYMENT_NOT_FOUND' });
    }

    const booking = await Booking.findById(payment.bookingId).session(session);
    if (!booking) {
      await session.abortTransaction();
      throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
    }

    if (success) {
      payment.status = 'paid';
      payment.paidAt = new Date();
      payment.gatewayTransactionId = gatewayTransactionId || payment.gatewayTransactionId;
      await payment.save({ session });
      await Booking.findByIdAndUpdate(booking._id, { paymentStatus: 'paid', paidAt: new Date(), paymentMethod: payment.method }).session(session);
      
      // Tích điểm
      await loyaltyService.addPointsFromPayment(payment.userId, payment.amount, booking._id, session);
    } else {
      payment.status = 'failed';
      await payment.save({ session });

      if (booking.voucherCode) {
        await voucherService.rollbackVoucher(booking.voucherCode, payment.userId, booking._id);
      }
    }

    await session.commitTransaction();
    return payment;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

exports.getPaymentByBooking = async (bookingId, userId, userRole) => {
  const payment = await Payment.findOne({ bookingId })
    .populate('bookingId', 'bookingDate startTime status userId')
    .populate('userId', 'name email');
  if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404, code: 'PAYMENT_NOT_FOUND' });
  if (userRole === 'customer' && String(payment.userId?._id || payment.userId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  return payment;
};

exports.getPaymentById = async (id) => {
  const payment = await Payment.findById(id);
  if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404, code: 'PAYMENT_NOT_FOUND' });
  return payment;
};

exports.getAllPayments = async (filters = {}, userRole, userId) => {
  const query = {};
  if (userRole === 'customer') {
    query.userId = userId;
  } else {
    if (filters.userId) query.userId = filters.userId;
    if (filters.status) query.status = filters.status;
    if (filters.method) query.method = filters.method;
  }
  return Payment.find(query)
    .populate('bookingId', 'bookingDate startTime status')
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });
};

exports.refundPayment = async (bookingId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findById(bookingId).session(session);
    if (!booking) {
      await session.abortTransaction();
      throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
    }

    const payment = await Payment.findOneAndUpdate(
      { bookingId, status: 'paid' },
      { status: 'refunded', refundedAt: new Date() },
      { new: true, session }
    );
    if (!payment) {
      await session.abortTransaction();
      throw Object.assign(new Error('Only paid payments can be refunded'), { statusCode: 400, code: 'INVALID_REFUND' });
    }

    if (booking.status === 'completed') {
      await session.abortTransaction();
      throw Object.assign(new Error('Cannot refund a completed booking'), { statusCode: 400, code: 'BOOKING_COMPLETED' });
    }
    if (booking.status === 'in_progress') {
      await session.abortTransaction();
      throw Object.assign(new Error('Cannot refund a booking in progress'), { statusCode: 400, code: 'BOOKING_IN_PROGRESS' });
    }

    await Booking.findByIdAndUpdate(bookingId, { status: 'cancelled', paymentStatus: 'refunded' }).session(session);

    if (booking.voucherCode) {
      await voucherService.rollbackVoucher(booking.voucherCode, payment.userId, bookingId);
    }

    await session.commitTransaction();

    notificationService.send(
      payment.userId,
      'Hoàn tiền thành công',
      `Yêu cầu hoàn tiền ${payment.amount.toLocaleString('vi-VN')}đ đã được xử lý.`,
      'refund',
      { bookingId, paymentId: payment._id }
    ).catch(() => {});

    return payment;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
