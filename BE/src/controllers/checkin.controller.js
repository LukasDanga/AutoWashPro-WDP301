const checkinService = require('../services/checkin.service');
const { catchAsync, success } = require('../utils/helpers');

exports.checkIn = catchAsync(async (req, res) => {
  const bookingId = req.body.bookingId || req.params.bookingId;
  const { note } = req.body;
  const checkin = await checkinService.checkIn(bookingId, req.userId, req.user.role, { note });
  success(res, checkin, 'Checked in successfully', 201);
});

exports.updateCheckinStatus = catchAsync(async (req, res) => {
  const { status, note, rating, feedback } = req.body;
  const checkin = await checkinService.updateCheckinStatus(req.params.bookingId, status, req.userId, req.user.role, { note, rating, feedback });
  success(res, checkin, 'Check-in status updated');
});

exports.getCheckinByBooking = catchAsync(async (req, res) => {
  const checkin = await checkinService.getCheckinByBooking(req.params.bookingId, req.userId, req.user.role);
  success(res, checkin, 'Check-in retrieved');
});

exports.getCheckinById = catchAsync(async (req, res) => {
  const checkin = await checkinService.getCheckinById(req.params.id, req.userId, req.user.role);
  success(res, checkin, 'Check-in retrieved');
});

exports.getAllCheckins = catchAsync(async (req, res) => {
  const checkins = await checkinService.getAllCheckins(req.query, req.user.role, req.userId);
  success(res, checkins, 'Check-ins retrieved');
});

exports.getCheckinStats = catchAsync(async (req, res) => {
  const stats = await checkinService.getCheckinStats(req.query);
  success(res, stats, 'Stats retrieved');
});
