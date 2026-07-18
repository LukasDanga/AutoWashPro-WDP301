const bookingService = require('../services/booking.service');
const paymentService = require('../services/payment.service');
const { catchAsync, success } = require('../utils/helpers');
const QRCode = require('qrcode');

exports.createBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.createBooking({ ...req.body, userId: req.userId });
  success(res, booking, 'Booking created', 201);
});

exports.createRecurringBooking = catchAsync(async (req, res) => {
  const result = await bookingService.createRecurringBooking({ ...req.body, userId: req.userId });
  success(res, result, `Recurring booking created: ${result.totalCreated} bookings`, 201);
});

exports.cancelRecurringGroup = catchAsync(async (req, res) => {
  const result = await bookingService.cancelRecurringGroup(req.params.groupId, req.userId, req.user.role);
  success(res, result, `Cancelled ${result.cancelled} bookings in recurring group`);
});

exports.getAllBookings = catchAsync(async (req, res) => {
  const bookings = await bookingService.getAllBookings(req.query, req.user.role, req.userId);
  success(res, bookings, 'Bookings retrieved');
});

exports.getMyBookings = catchAsync(async (req, res) => {
  const result = await bookingService.getAllBookings(req.query, 'customer', req.userId);
  success(res, result, 'My bookings retrieved');
});

exports.getBookingById = catchAsync(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id, req.user.role, req.userId, req.user.branchId);
  success(res, booking, 'Booking retrieved');
});

exports.updateBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.updateBooking(req.params.id, req.body, req.user.role, req.userId);
  success(res, booking, 'Booking updated');
});

exports.updateBookingStatus = catchAsync(async (req, res) => {
  const updateData = { ...req.body };
  if (req.body.status === 'checked_in') {
    updateData.staffId = req.userId;
  }
  const booking = await bookingService.updateBookingStatus(req.params.id, req.body.status, updateData, req.user.role, req.user.branchId);
  success(res, booking, 'Booking status updated');
});

exports.extendGracePeriod = catchAsync(async (req, res) => {
  const booking = await bookingService.extendGracePeriod(req.params.id, req.user.role, req.user.branchId);
  success(res, booking, 'Đã gia hạn thời gian check-in cho đơn');
});

exports.cancelBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.cancelBooking(req.params.id, req.userId, req.user.role, req.body.cancellationReason);
  success(res, booking, 'Booking cancelled');
});

exports.deleteBooking = catchAsync(async (req, res) => {
  await bookingService.deleteBooking(req.params.id, req.user.role);
  success(res, null, 'Booking deleted');
});

exports.getAvailableSlots = catchAsync(async (req, res) => {
  const { branchId, date, packageId } = req.query;
  const slots = await bookingService.getAvailableSlots(branchId, date, packageId);
  success(res, slots, 'Available slots retrieved');
});

exports.createPayment = catchAsync(async (req, res) => {
  const { bookingId, method, paymentType } = req.body;
  const payment = await paymentService.createPayment(bookingId, req.userId, req.user.role, method, paymentType || 'full');
  success(res, payment, 'Payment created', 201);
});

exports.confirmBookings = catchAsync(async (req, res) => {
  const { ids } = req.body;
  const result = await bookingService.confirmBookings(ids, req.user.role, req.userId);
  const parts = [`Đã xác nhận ${result.confirmed} đơn`];
  if (result.skippedCount > 0) {
    parts.push(`${result.skippedCount} đơn bị bỏ qua vì chưa đặt cọc`);
  }
  success(res, result, parts.join(' — '));
});

exports.confirmPayment = catchAsync(async (req, res) => {
  const { transactionId, method, gatewayTransactionId } = req.body;
  const payment = await paymentService.confirmPayment(transactionId, method, gatewayTransactionId);
  success(res, payment, 'Payment confirmed');
});

exports.getPaymentByBooking = catchAsync(async (req, res) => {
  const payment = await paymentService.getPaymentByBooking(req.params.bookingId, req.userId, req.user.role);
  success(res, payment, 'Payment retrieved');
});

exports.getAllPayments = catchAsync(async (req, res) => {
  const payments = await paymentService.getAllPayments(req.query, req.user.role, req.userId);
  success(res, payments, 'Payments retrieved');
});

exports.getMyPayments = catchAsync(async (req, res) => {
  const payments = await paymentService.getAllPayments({}, 'customer', req.userId);
  success(res, payments, 'My payments retrieved');
});

exports.markPaymentViewed = catchAsync(async (req, res) => {
  const payment = await paymentService.markPaymentViewed(req.params.id, req.user.role);
  success(res, payment, 'Payment marked as viewed');
});

exports.countUnviewedPayments = catchAsync(async (req, res) => {
  const count = await paymentService.countUnviewedPayments();
  success(res, { count }, 'Unviewed payments count');
});

exports.refundPayment = catchAsync(async (req, res) => {
  const { bookingId } = req.body;
  const payment = await paymentService.refundPayment(bookingId);
  success(res, payment, 'Payment refunded');
});


exports.getFeedbacks = catchAsync(async (req, res) => {
  const feedbacks = await bookingService.getFeedbacks(req.user, req.query);
  success(res, feedbacks, 'Feedbacks retrieved');
});

exports.getCustomers = catchAsync(async (req, res) => {
  const customers = await bookingService.getCustomers(req.user, req.query);
  success(res, customers, 'Customers retrieved');
});

exports.submitFeedback = catchAsync(async (req, res) => {
  const { rating, feedback } = req.body;
  const booking = await bookingService.submitFeedback(req.params.id, req.userId, { rating, feedback });
  success(res, booking, 'Feedback submitted');
});

exports.replyToFeedback = catchAsync(async (req, res) => {
  const booking = await bookingService.replyToFeedback(req.params.id, req.userId, req.body.reply);
  success(res, booking, 'Reply submitted');
});

exports.rebookBooking = catchAsync(async (req, res) => {
  const { bookingDate, startTime } = req.body;
  const booking = await bookingService.rebookBooking(req.params.id, req.userId, req.user.role, { bookingDate, startTime });
  success(res, booking, 'Booking rebooked', 201);
});

exports.getBookingQR = catchAsync(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id, req.user.role, req.userId);
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  // QR payload: JSON with bookingId + branchId for cross-validation
  const payload = JSON.stringify({ bookingId: String(booking._id), branchId: String(booking.branchId?._id || booking.branchId) });
  const dataUrl = await QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 2, width: 300 });
  success(res, { qrDataUrl: dataUrl, bookingId: booking._id }, 'QR generated');
});

exports.sepayWebhook = catchAsync(async (req, res) => {
  const apiKey = req.headers.authorization;
  if (process.env.SEPAY_API_KEY && apiKey !== `Apikey ${process.env.SEPAY_API_KEY}`) {
    return res.status(401).json({ success: false, message: 'Invalid API Key' });
  }

  const { content, referenceCode, transferType } = req.body;
  
  // Chỉ xử lý giao dịch nhận tiền
  if (transferType !== 'in') {
    return res.json({ success: true, message: 'Ignored outbound transaction' });
  }

  // Tìm mã giao dịch trong nội dung (ví dụ: TXN123456ABC)
  // content có thể là "WASHPRO TXN123456ABC"
  const match = content ? content.match(/TXN\d+[A-Z0-9]+/) : null;
  if (!match) {
    return res.json({ success: true, message: 'No transaction ID found in content' });
  }

  const transactionId = match[0];
  
  try {
    const payment = await paymentService.confirmPaymentCallback(transactionId, referenceCode || 'SEPAY', true);
    success(res, payment, 'SePay webhook processed successfully');
  } catch (err) {
    // Trả về 200 để SePay không gửi lại webhook nếu giao dịch đã được xử lý hoặc không hợp lệ
    console.error('SePay Webhook error:', err.message);
    res.json({ success: true, message: err.message });
  }
});

exports.simulatePayment = catchAsync(async (req, res) => {
  const { transactionId, gatewayTransactionId } = req.body;
  const payment = await paymentService.confirmPaymentCallback(transactionId, gatewayTransactionId || 'SIMULATED', true);
  success(res, payment, 'Payment simulated successfully');
});
