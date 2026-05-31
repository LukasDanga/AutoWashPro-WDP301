const bookingService = require('../services/booking.service');
const paymentService = require('../services/payment.service');
const { catchAsync, success } = require('../utils/helpers');

exports.createBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.createBooking({ ...req.body, userId: req.userId });
  success(res, booking, 'Booking created', 201);
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
  const booking = await bookingService.updateBookingStatus(req.params.id, req.body.status);
  success(res, booking, 'Booking status updated');
});

exports.cancelBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.cancelBooking(req.params.id, req.userId, req.user.role);
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
  const payment = await paymentService.createPayment(bookingId, req.userId, method);
  success(res, payment, 'Payment created', 201);
});

exports.confirmPayment = catchAsync(async (req, res) => {
  const { transactionId, method } = req.body;
  const payment = await paymentService.confirmPayment(transactionId, method);
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
