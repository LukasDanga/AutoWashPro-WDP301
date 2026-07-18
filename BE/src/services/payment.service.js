const mongoose = require('mongoose');
const QRCode = require('qrcode');
const { Payment, Booking } = require('../models');
const notificationService = require('./notification.service');
const sseService = require('./sse.service');
const voucherService = require('./voucher.service');
const loyaltyService = require('./loyalty.service');

const generateTransactionId = () => `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
const VALID_METHODS = ['cash', 'bank'];

const generateQrDataUrl = async (transactionId, amount, method) => {
  let content;
  if (method === 'bank') {
    const bankId = process.env.SEPAY_BANK_ID;
    const acc = process.env.SEPAY_BANK_ACCOUNT;
    if (bankId && acc) {
      return `https://qr.sepay.vn/img?bank=${bankId}&acc=${acc}&amount=${amount}&des=${transactionId}`;
    }
    content = `AUTOWASH\nMã GD: ${transactionId}\nSố tiền: ${amount.toLocaleString('vi-VN')}đ`;
    return QRCode.toDataURL(content, { width: 300, margin: 1 });
  }
  return QRCode.toDataURL('Invalid format', { width: 300, margin: 1 });
};

// Hàm poll SePay transactions
const pollSepayTransaction = async (transactionId, amount) => {
  try {
    const apiKey = process.env.SEPAY_API_KEY;
    if (!apiKey) return false;
    // Tự động poll API của SePay để kiểm tra giao dịch (cho môi trường local/không có webhook)
    const res = await fetch('https://my.sepay.vn/userapi/transactions/list', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data && data.transactions && Array.isArray(data.transactions)) {
      // Tìm giao dịch có chứa mã transactionId và số tiền >= yêu cầu
      const match = data.transactions.find(tx => 
        tx.transaction_content?.includes(transactionId) && 
        Number(tx.amount_in) >= amount
      );
      return !!match;
    }
  } catch (err) {
    console.error('Error polling sepay:', err.message);
  }
  return false;
};

exports.createPayment = async (bookingId, requesterId, userRole, method, paymentType = 'full', overrideAmount) => {
  if (!VALID_METHODS.includes(method)) {
    throw Object.assign(new Error('Invalid payment method'), { statusCode: 400, code: 'INVALID_METHOD' });
  }
  if (!['deposit', 'remaining', 'full'].includes(paymentType)) {
    throw Object.assign(new Error('Invalid payment type'), { statusCode: 400, code: 'INVALID_PAYMENT_TYPE' });
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

  const fullPrice = booking.finalPrice ?? booking.packageId.price;
  const deposit = booking.depositAmount || 0;

  let amount;
  let isDeposit = false;
  if (paymentType === 'deposit') {
    if (deposit <= 0 && !overrideAmount) throw Object.assign(new Error('Đơn này không yêu cầu đặt cọc'), { statusCode: 400, code: 'NO_DEPOSIT_REQUIRED' });
    if (booking.depositPaid) throw Object.assign(new Error('Đã đặt cọc trước đó'), { statusCode: 409, code: 'DEPOSIT_ALREADY_PAID' });
    amount = overrideAmount || deposit;
    isDeposit = true;
  } else {
    amount = booking.depositPaid ? Math.max(0, fullPrice - deposit) : fullPrice;
  }

  const allowedStatuses = isDeposit
    ? ['pending', 'confirmed']
    : ['pending', 'confirmed', 'checked_in', 'in_progress', 'completed'];
  if (!allowedStatuses.includes(booking.status)) {
    throw Object.assign(new Error(`Cannot create payment for booking with status '${booking.status}'`), { statusCode: 400, code: 'INVALID_BOOKING_STATUS' });
  }

  const existingPending = await Payment.findOne({ bookingId, status: 'pending' });
  if (existingPending && method !== 'cash') {
    if (isDeposit && !existingPending.qrCode) {
      existingPending.qrCode = await generateQrDataUrl(existingPending.transactionId, amount, method);
      await existingPending.save();
    }
    return existingPending;
  }

  const targetUserId = booking.userId;

  // Check for existing pending payment first (prevents upsert race on concurrent requests)
  let payment = await Payment.findOne({ bookingId, status: 'pending' });
  if (!payment) {
    payment = new Payment({ bookingId, userId: targetUserId, amount, method, paymentType, transactionId: generateTransactionId(), status: 'pending' });
    await payment.save();
  }

  if (booking.voucherCode) {
    const VoucherUsage = mongoose.model('VoucherUsage');
    const existingUsage = await VoucherUsage.findOne({ bookingId, userId: targetUserId });
    if (!existingUsage) {
      await voucherService.reserveVoucher(booking.voucherCode, targetUserId, bookingId, booking.discountAmount || 0);
    }
  }

  // Cash: auto-confirm ngay lập tức
  if (method === 'cash') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      payment.status = 'paid';
      payment.paidAt = new Date();
      await payment.save({ session });

      if (isDeposit) {
        await Booking.findByIdAndUpdate(
          booking._id,
          { paymentStatus: 'deposit_paid', depositPaid: true, depositPaidAt: new Date(), paymentMethod: method },
          { session }
        );
      } else {
        await Booking.findByIdAndUpdate(
          booking._id,
          { paymentStatus: 'paid', paidAt: new Date(), paymentMethod: method },
          { session }
        );
        await loyaltyService.addPointsFromPayment(targetUserId, fullPrice, bookingId, session);
        await mongoose.model('User').findByIdAndUpdate(targetUserId, { $inc: { spinCount: 1 } }, { session });
        sseService.sendToUser(targetUserId, 'spin_added', { count: 1 });
      }

      await session.commitTransaction();
    } catch (err) {
      if (session.inTransaction()) { await session.abortTransaction(); }
      if (booking.voucherCode) { await voucherService.rollbackVoucher(booking.voucherCode, targetUserId, bookingId).catch(() => {}); }
      throw err;
    } finally {
      session.endSession();
    }

    const label = isDeposit ? 'tiền cọc' : 'phần còn lại';
    notificationService.send(booking.userId, 'Thanh toán thành công', `Đã thanh toán ${label} ${amount.toLocaleString('vi-VN')}đ bằng tiền mặt.`, 'payment_confirmed', { bookingId, paymentId: payment._id }).catch(() => {});
    notificationService.sendToAdminAndManager(booking.branchId, isDeposit ? 'Khách đã đặt cọc' : 'Thanh toán hoàn tất', `Khách hàng đã thanh toán ${label} ${amount.toLocaleString('vi-VN')}đ cho lịch hẹn.`, 'payment_confirmed', { bookingId, branchId: booking.branchId }).catch(() => {});
    sseService.broadcastToManagers(booking.branchId, 'payment_new', { paymentId: payment._id, bookingId: booking._id });
    return payment;
  }

  // Bank: tạo QR code (deposit hoặc full)
  if (method === 'bank') {
    payment.qrCode = await generateQrDataUrl(payment.transactionId, amount, method);
  }
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

    if (payment.paymentType === 'deposit') {
      await Booking.findByIdAndUpdate(booking._id, { paymentStatus: 'deposit_paid', depositPaid: true, depositPaidAt: new Date(), paymentMethod: payment.method }).session(session);
    } else {
      await Booking.findByIdAndUpdate(booking._id, { paymentStatus: 'paid', paidAt: new Date(), paymentMethod: payment.method }).session(session);
      await loyaltyService.addPointsFromPayment(payment.userId, payment.amount, booking._id, session);
      await mongoose.model('User').findByIdAndUpdate(payment.userId, { $inc: { spinCount: 1 } }, { session });
      sseService.sendToUser(payment.userId, 'spin_added', { count: 1 });
    }

    await session.commitTransaction();

    const label = payment.paymentType === 'deposit' ? 'tiền cọc' : 'thanh toán';
    notificationService.send(booking.userId, 'Thanh toán thành công', `${label} ${payment.amount.toLocaleString('vi-VN')}đ bằng ${payment.method.toUpperCase()} đã được xác nhận.`, 'payment_confirmed', { bookingId: booking._id, paymentId: payment._id }).catch(() => {});
    notificationService.sendToAdminAndManager(booking.branchId, `Thanh toán ${payment.method.toUpperCase()}`, `Khách hàng đã ${label} ${payment.amount.toLocaleString('vi-VN')}đ qua ${payment.method.toUpperCase()}.`, 'payment_confirmed', { bookingId: booking._id, branchId: booking.branchId }).catch(() => {});
    sseService.broadcastToManagers(booking.branchId, 'payment_new', { paymentId: payment._id, bookingId: booking._id });
    return payment;
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
  }
};

exports.countUnviewedPayments = async () => {
  const expiry = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await Payment.updateMany({ viewedAt: null, createdAt: { $lte: expiry } }, { viewedAt: expiry });
  return Payment.countDocuments({ viewedAt: null, status: 'paid' });
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

      if (payment.paymentType === 'deposit') {
        await Booking.findByIdAndUpdate(booking._id, { paymentStatus: 'deposit_paid', depositPaid: true, depositPaidAt: new Date(), paymentMethod: payment.method }).session(session);
      } else {
        await Booking.findByIdAndUpdate(booking._id, { paymentStatus: 'paid', paidAt: new Date(), paymentMethod: payment.method }).session(session);
        await loyaltyService.addPointsFromPayment(payment.userId, payment.amount, booking._id, session);
        await mongoose.model('User').findByIdAndUpdate(payment.userId, { $inc: { spinCount: 1 } }, { session });
        sseService.sendToUser(payment.userId, 'spin_added', { count: 1 });
      }
    } else {
      payment.status = 'failed';
      await payment.save({ session });

      if (booking.voucherCode) {
        await voucherService.rollbackVoucher(booking.voucherCode, payment.userId, booking._id, session);
      }
    }

    await session.commitTransaction();

    if (success) {
      sseService.broadcastToManagers(booking.branchId, 'payment_new', { paymentId: payment._id, bookingId: payment.bookingId });
    }

    return payment;
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
  }
};

exports.getPaymentByBooking = async (bookingId, userId, userRole) => {
  let payment = await Payment.findOne({ bookingId })
    .populate({ path: 'bookingId', populate: { path: 'branchId', select: 'name' }, select: 'bookingDate startTime status userId branchId' })
    .populate('userId', 'name email phone');
  if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404, code: 'PAYMENT_NOT_FOUND' });
  if (userRole === 'customer' && String(payment.userId?._id || payment.userId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }

  // Tự động kiểm tra trên SePay nếu chưa thanh toán (để hỗ trợ local testing giống Flutter polling)
  if (payment.status !== 'paid' && payment.method === 'bank') {
    const isPaid = await pollSepayTransaction(payment.transactionId, payment.amount);
    if (isPaid) {
      await exports.confirmPaymentCallback(payment.transactionId, 'SEPAY_POLLED', true);
      // Load lại payment sau khi update
      payment = await Payment.findOne({ bookingId })
        .populate({ path: 'bookingId', populate: { path: 'branchId', select: 'name' }, select: 'bookingDate startTime status userId branchId' })
        .populate('userId', 'name email phone');
    }
  }

  return payment;
};

exports.getPaymentById = async (id) => {
  const payment = await Payment.findById(id);
  if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404, code: 'PAYMENT_NOT_FOUND' });
  return payment;
};

exports.markPaymentViewed = async (id, userRole) => {
  if (userRole === 'customer') {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  const payment = await Payment.findByIdAndUpdate(id, { viewedAt: new Date() }, { new: true });
  if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404, code: 'PAYMENT_NOT_FOUND' });
  return payment;
};

exports.getAllPayments = async (filters = {}, userRole, userId) => {
  const query = {};
  if (userRole === 'customer') {
    query.userId = userId;
  } else {
    if (filters.userId) query.userId = filters.userId;
    if (filters.status) {
      query.status = filters.status;
    } else {
      query.status = { $ne: 'pending' };
    }
    if (filters.method) query.method = filters.method;
    if (filters.today === 'true' || filters.today === true) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (filters.date) {
      const day = new Date(filters.date);
      const start = new Date(day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(day);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }
  }
  // Auto-mark payments older than 24h as viewed
  const expiry = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await Payment.updateMany({ viewedAt: null, createdAt: { $lte: expiry } }, { viewedAt: expiry });

  return Payment.find(query)
    .populate({ path: 'bookingId', populate: [{ path: 'branchId', select: 'name' }, { path: 'packageId', select: 'name price' }], select: 'bookingDate startTime status branchId packageId' })
    .populate('userId', 'name email phone')
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

    if (booking.status === 'in_progress') {
      await session.abortTransaction();
      throw Object.assign(new Error('Cannot refund a booking in progress'), { statusCode: 400, code: 'BOOKING_IN_PROGRESS' });
    }

    await Booking.findByIdAndUpdate(bookingId, { status: 'cancelled', paymentStatus: 'refunded' }).session(session);

    if (booking.voucherCode) {
      await voucherService.rollbackVoucher(booking.voucherCode, payment.userId, bookingId, session);
    }

    await session.commitTransaction();

    notificationService.send(
      payment.userId,
      'Hoàn tiền thành công',
      `Yêu cầu hoàn tiền ${payment.amount.toLocaleString('vi-VN')}đ đã được xử lý.`,
      'refund',
      { bookingId, paymentId: payment._id }
    ).catch(() => {});

    // Notify admin + manager
    notificationService.sendToAdminAndManager(
      booking.branchId,
      'Hoàn tiền',
      `Đã hoàn tiền ${payment.amount.toLocaleString('vi-VN')}đ cho khách hàng.`,
      'refund',
      { bookingId, branchId: booking.branchId }
    ).catch(() => {});

    return payment;
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
  }
};
