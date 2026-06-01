const bookingService = require('../services/booking.service');
const { catchAsync, success } = require('../utils/helpers');

exports.createBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.createBooking(req.userId, req.body);
  success(res, booking, 'Booking created', 201);
});

exports.getMyBookings = catchAsync(async (req, res) => {
  const bookings = await bookingService.getMyBookings(req.userId);
  success(res, bookings, 'Bookings retrieved');
});

exports.getBookingById = catchAsync(async (req, res) => {
  const booking = await bookingService.getBookingById(req.userId, req.params.id);
  success(res, booking, 'Booking retrieved');
});