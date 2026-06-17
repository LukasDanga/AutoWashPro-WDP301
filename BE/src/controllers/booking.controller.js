const bookingService = require('../services/booking.service');
const paymentService = require('../services/payment.service');
const { catchAsync, success } = require('../utils/helpers');

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
  const bookings = await bookingService.getAllBookings({}, 'customer', req.userId);
  success(res, bookings, 'My bookings retrieved');
});

exports.getBookingById = catchAsync(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id, req.user.role, req.userId);
  success(res, booking, 'Booking retrieved');
});

exports.updateBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.updateBooking(req.params.id, req.body, req.user.role);
  success(res, booking, 'Booking updated');
});

exports.updateBookingStatus = catchAsync(async (req, res) => {
  const updateData = { ...req.body };
  if (req.body.status === 'checked_in') {
    updateData.staffId = req.userId;
  }
  const booking = await bookingService.updateBookingStatus(req.params.id, req.body.status, updateData);
  success(res, booking, 'Booking status updated');
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
  const { bookingId, method } = req.body;
  const payment = await paymentService.createPayment(bookingId, req.userId, req.user.role, method);
  success(res, payment, 'Payment created', 201);
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

exports.refundPayment = catchAsync(async (req, res) => {
  const { bookingId } = req.body;
  const payment = await paymentService.refundPayment(bookingId);
  success(res, payment, 'Payment refunded');
});

// Callback from MoMo/VNPay gateway (no auth — gateway calls this)
exports.confirmPaymentCallback = catchAsync(async (req, res) => {
  const { transactionId, gatewayTransactionId, success } = req.body;
  const payment = await paymentService.confirmPaymentCallback(transactionId, gatewayTransactionId, success);
  success(res, payment, success ? 'Payment confirmed' : 'Payment failed');
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
