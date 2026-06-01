const { Checkin, Booking, Package } = require('../models');

exports.checkIn = async (bookingId, userId, userRole, data = {}) => {
  const booking = await Booking.findById(bookingId).populate('packageId');
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });

  // Authorization: customer can only check in their own bookings
  if (userRole === 'customer' && String(booking.userId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }

  if (booking.status === 'cancelled') {
    throw Object.assign(new Error('Cannot check in a cancelled booking'), { statusCode: 400, code: 'BOOKING_CANCELLED' });
  }
  if (booking.status === 'completed') {
    throw Object.assign(new Error('Booking already completed'), { statusCode: 400, code: 'ALREADY_COMPLETED' });
  }
  if (booking.status === 'in_progress') {
    throw Object.assign(new Error('Booking already in progress'), { statusCode: 400, code: 'ALREADY_IN_PROGRESS' });
  }

  // Atomic: try to create, unique index prevents duplicates
  try {
    const checkin = new Checkin({
      bookingId,
      userId: booking.userId,
      branchId: booking.branchId,
      checkInTime: new Date(),
      status: 'checked_in',
      note: data.note,
      scheduledDuration: booking.packageId?.duration || booking.packageId?.serviceDuration,
    });
    await checkin.save();
    await Booking.findByIdAndUpdate(bookingId, { status: 'in_progress' });
    return checkin;
  } catch (err) {
    if (err.code === 11000) {
      throw Object.assign(new Error('Check-in already exists for this booking'), { statusCode: 409, code: 'CHECKIN_EXISTS' });
    }
    throw err;
  }
};

exports.updateCheckinStatus = async (bookingId, status, userId, userRole, data = {}) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });

  // Authorization: customer can only update their own bookings
  if (userRole === 'customer') {
    if (String(booking.userId) !== String(userId)) {
      throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
    }
    // Customer can only add rating/feedback when completed
    if (status !== 'completed') {
      throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
    }
  }

  const checkin = await Checkin.findOne({ bookingId });
  if (!checkin) throw Object.assign(new Error('Check-in not found'), { statusCode: 404, code: 'CHECKIN_NOT_FOUND' });

  if (status === 'completed') {
    checkin.checkOutTime = new Date();
    checkin.status = 'completed';
    if (data.note) checkin.note = data.note;
    if (data.rating) checkin.rating = data.rating;
    if (data.feedback) checkin.feedback = data.feedback;
    await Booking.findByIdAndUpdate(bookingId, { status: 'completed' });
  } else if (status === 'in_progress') {
    checkin.status = 'in_progress';
  } else {
    throw Object.assign(new Error('Invalid status'), { statusCode: 400, code: 'INVALID_STATUS' });
  }

  await checkin.save();
  return checkin;
};

exports.getCheckinByBooking = async (bookingId, userId, userRole) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });

  // Customer can only see their own check-in
  if (userRole === 'customer' && String(booking.userId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }

  const checkin = await Checkin.findOne({ bookingId })
    .populate('bookingId', 'bookingDate startTime endTime status')
    .populate('userId', 'name email phone')
    .populate('branchId', 'name address');
  if (!checkin) throw Object.assign(new Error('Check-in not found'), { statusCode: 404, code: 'CHECKIN_NOT_FOUND' });
  return checkin;
};

exports.getCheckinById = async (id, userId, userRole) => {
  const checkin = await Checkin.findById(id)
    .populate('bookingId')
    .populate('userId', 'name email phone')
    .populate('branchId', 'name address');
  if (!checkin) throw Object.assign(new Error('Check-in not found'), { statusCode: 404, code: 'CHECKIN_NOT_FOUND' });

  if (userRole === 'customer' && String(checkin.userId?._id || checkin.userId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  return checkin;
};

exports.getAllCheckins = async (filters = {}, userRole, userId) => {
  const query = {};
  if (userRole === 'customer') {
    query.userId = userId;
  } else {
    if (filters.userId) query.userId = filters.userId;
    if (filters.branchId) query.branchId = filters.branchId;
  }
  if (filters.status) query.status = filters.status;
  if (filters.date) {
    const d = new Date(filters.date);
    query.checkInTime = { $gte: new Date(d.toISOString().split('T')[0] + 'T00:00:00Z'), $lte: new Date(d.toISOString().split('T')[0] + 'T23:59:59Z') };
  }

  return Checkin.find(query)
    .populate('bookingId', 'bookingDate startTime endTime status')
    .populate('userId', 'name email phone')
    .populate('branchId', 'name address')
    .sort({ checkInTime: -1 });
};

exports.getCheckinStats = async (filters = {}) => {
  const match = {};
  if (filters.branchId) match.branchId = filters.branchId;
  if (filters.date) {
    const d = new Date(filters.date);
    match.checkInTime = { $gte: new Date(d.toISOString().split('T')[0] + 'T00:00:00Z'), $lte: new Date(d.toISOString().split('T')[0] + 'T23:59:59Z') };
  }

  const stats = await Checkin.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const total = stats.reduce((sum, s) => sum + s.count, 0);
  const avgRating = await Checkin.aggregate([
    { $match: { ...match, rating: { $exists: true, $ne: null } } },
    { $group: { _id: null, avgRating: { $avg: '$rating' } } },
  ]);

  return {
    total,
    checked_in: stats.find((s) => s._id === 'checked_in')?.count || 0,
    in_progress: stats.find((s) => s._id === 'in_progress')?.count || 0,
    completed: stats.find((s) => s._id === 'completed')?.count || 0,
    avgRating: avgRating[0]?.avgRating ? Math.round(avgRating[0].avgRating * 10) / 10 : null,
  };
};
