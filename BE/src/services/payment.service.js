const { Payment, Booking } = require('../models');

const generateTransactionId = () => `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
const VALID_METHODS = ['cash', 'momo', 'vnpay'];

const simulateMomoPayment = (amount, transactionId) => `https://momo.vn/pay?amount=${amount}&txn=${transactionId}`;
const simulateVNPayPayment = (amount, transactionId) => `https://vnpay.vn/pay?amount=${amount}&txn=${transactionId}`;

exports.createPayment = async (bookingId, userId, method) => {
  if (!VALID_METHODS.includes(method)) {
    throw Object.assign(new Error('Invalid payment method'), { statusCode: 400, code: 'INVALID_METHOD' });
  }

  const booking = await Booking.findById(bookingId).populate('packageId');
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  if (String(booking.userId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  if (booking.status === 'cancelled') {
    throw Object.assign(new Error('Booking is cancelled'), { statusCode: 400, code: 'BOOKING_CANCELLED' });
  }
  if (!booking.packageId) {
    throw Object.assign(new Error('Package not found'), { statusCode: 400, code: 'PACKAGE_NOT_FOUND' });
  }

  let payment = await Payment.findOne({ bookingId, status: 'paid' });

  if (!['pending', 'confirmed'].includes(booking.status)) {
    throw Object.assign(new Error(`Cannot create payment for booking with status '${booking.status}'`), { statusCode: 400, code: 'INVALID_BOOKING_STATUS' });
  }

  if (booking.paymentStatus === 'paid') {
    throw Object.assign(new Error('Booking already paid'), { statusCode: 409, code: 'ALREADY_PAID' });
  }

  const amount = booking.finalPrice || booking.packageId.price;
  const transactionId = generateTransactionId();

  // Atomic create-or-find to prevent double-payment race
  payment = await Payment.findOneAndUpdate(
    { bookingId, status: { $ne: 'paid' } },
    { bookingId, userId, amount, method, transactionId, status: 'pending' },
    { new: true, upsert: true, runValidators: true }
  );

  if (payment.status === 'paid') {
    throw Object.assign(new Error('Booking already paid'), { statusCode: 409, code: 'ALREADY_PAID' });
  }

  if (method === 'cash') {
    return payment;
  }

  const paymentUrl = method === 'momo'
    ? simulateMomoPayment(amount, transactionId)
    : simulateVNPayPayment(amount, transactionId);

  payment.paymentUrl = paymentUrl;
  await payment.save();
  return payment;
};

exports.confirmPayment = async (transactionId, method, gatewayTransactionId) => {
  const payment = await Payment.findOneAndUpdate(
    { transactionId, status: { $ne: 'paid' } },
    { status: 'paid', paidAt: new Date(), gatewayTransactionId: gatewayTransactionId || undefined },
    { new: true }
  ).populate('bookingId');

  if (!payment) {
    const existing = await Payment.findOne({ transactionId, status: 'paid' });
    if (existing) return existing;
    throw Object.assign(new Error('Payment not found'), { statusCode: 404, code: 'PAYMENT_NOT_FOUND' });
  }

  if (!VALID_METHODS.includes(method)) {
    throw Object.assign(new Error('Invalid payment method'), { statusCode: 400, code: 'INVALID_METHOD' });
  }
  if (payment.method !== method) {
    throw Object.assign(new Error('Payment method mismatch'), { statusCode: 400, code: 'METHOD_MISMATCH' });
  }

  const booking = payment.bookingId;
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  if (booking.status === 'cancelled' || booking.status === 'completed') {
    throw Object.assign(new Error('Cannot confirm payment for this booking'), { statusCode: 400, code: 'INVALID_BOOKING_STATUS' });
  }

  await Booking.findByIdAndUpdate(booking._id, { status: 'confirmed', paymentStatus: 'paid', paidAt: new Date() });
  return payment;
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
  const payment = await Payment.findOneAndUpdate(
    { bookingId, status: 'paid' },
    { status: 'refunded', refundedAt: new Date() },
    { new: true }
  );
  if (!payment) throw Object.assign(new Error('Only paid payments can be refunded'), { statusCode: 400, code: 'INVALID_REFUND' });

  const booking = await Booking.findById(bookingId);
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  if (booking.status === 'completed') {
    throw Object.assign(new Error('Cannot refund a completed booking'), { statusCode: 400, code: 'BOOKING_COMPLETED' });
  }
  if (booking.status === 'in_progress') {
    throw Object.assign(new Error('Cannot refund a booking in progress'), { statusCode: 400, code: 'BOOKING_IN_PROGRESS' });
  }

  await Booking.findByIdAndUpdate(bookingId, { status: 'cancelled', paymentStatus: 'refunded' });
  return payment;
};
