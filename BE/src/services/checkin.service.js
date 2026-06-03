const mongoose = require('mongoose');
const { Checkin, Booking } = require('../models');
const notificationService = require('./notification.service');

exports.checkIn = async (bookingId, userId, userRole, data = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findById(bookingId).populate('packageId').session(session);
    if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });

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

    const checkin = new Checkin({
      bookingId,
      customerId: booking.userId,
      staffId: userId,
      branchId: booking.branchId,
      checkInTime: new Date(),
      status: 'checked_in',
      note: data.note,
      scheduledDuration: booking.packageId?.duration,
    });
    await checkin.save({ session });

    const updatedBooking = await Booking.findOneAndUpdate(
      { _id: bookingId, status: 'pending' },
      { status: 'in_progress' },
      { new: true, session }
    );
    if (!updatedBooking) {
      throw Object.assign(new Error('Booking status was changed by another request'), { statusCode: 409, code: 'CONCURRENT_MODIFICATION' });
    }

    await session.commitTransaction();
    return checkin;
  } catch (err) {
    await session.abortTransaction();
    if (err.code === 11000) {
      throw Object.assign(new Error('Check-in already exists for this booking'), { statusCode: 409, code: 'CHECKIN_EXISTS' });
    }
    throw err;
  } finally {
    session.endSession();
  }
};

exports.updateCheckinStatus = async (bookingId, status, userId, userRole, data = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findById(bookingId).session(session);
    if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });

    if (userRole === 'customer') {
      if (String(booking.userId) !== String(userId)) {
        throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
      }
      if (status !== 'completed') {
        throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
      }
    }

    const checkin = await Checkin.findOne({ bookingId }).session(session);
    if (!checkin) throw Object.assign(new Error('Check-in not found'), { statusCode: 404, code: 'CHECKIN_NOT_FOUND' });

    if (status === 'completed') {
      checkin.checkOutTime = new Date();
      checkin.status = 'completed';
      if (data.note) checkin.note = data.note;
      if (data.rating) checkin.rating = data.rating;
      if (data.feedback) checkin.feedback = data.feedback;
      await checkin.save({ session });
      await Booking.findOneAndUpdate(
        { _id: bookingId, status: 'in_progress' },
        { status: 'completed' },
        { session }
      );

      await session.commitTransaction();

      notificationService.send(
        booking.userId,
        'Dịch vụ đã hoàn thành',
        `Dịch vụ rửa xe đã hoàn thành. Vui lòng thanh toán tại quầy.`,
        'booking_completed',
        { bookingId }
      ).catch(() => {});

      return checkin;
    } else if (status === 'in_progress') {
      checkin.status = 'in_progress';
      await checkin.save({ session });
      await session.commitTransaction();
      return checkin;
    } else {
      throw Object.assign(new Error('Invalid status'), { statusCode: 400, code: 'INVALID_STATUS' });
    }
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

exports.getCheckinByBooking = async (bookingId, userId, userRole) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  if (userRole === 'customer' && String(booking.userId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  const checkin = await Checkin.findOne({ bookingId })
    .populate('bookingId', 'bookingDate startTime endTime status')
    .populate('customerId', 'name email phone')
    .populate('staffId', 'name email phone role')
    .populate('branchId', 'name address');
  if (!checkin) throw Object.assign(new Error('Check-in not found'), { statusCode: 404, code: 'CHECKIN_NOT_FOUND' });
  return checkin;
};

exports.getCheckinById = async (id, userId, userRole) => {
  const checkin = await Checkin.findById(id)
    .populate('bookingId')
    .populate('customerId', 'name email phone')
    .populate('staffId', 'name email phone role')
    .populate('branchId', 'name address');
  if (!checkin) throw Object.assign(new Error('Check-in not found'), { statusCode: 404, code: 'CHECKIN_NOT_FOUND' });
  if (userRole === 'customer' && String(checkin.customerId?._id || checkin.customerId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  return checkin;
};

exports.getAllCheckins = async (filters = {}, userRole, userId) => {
  const query = {};
  if (userRole === 'customer') {
    query.customerId = userId;
  } else {
    if (filters.customerId) query.customerId = filters.customerId;
    if (filters.branchId) query.branchId = filters.branchId;
  }
  if (filters.status) query.status = filters.status;
  if (filters.date) {
    const d = new Date(filters.date);
    const dateStr = d.toISOString().split('T')[0];
    query.checkInTime = {
      $gte: new Date(`${dateStr}T00:00:00.000Z`),
      $lte: new Date(`${dateStr}T23:59:59.999Z`),
    };
  }
  return Checkin.find(query)
    .populate('bookingId', 'bookingDate startTime endTime status')
    .populate('customerId', 'name email phone')
    .populate('staffId', 'name email phone role')
    .populate('branchId', 'name address')
    .sort({ checkInTime: -1 });
};

exports.getCheckinStats = async (filters = {}) => {
  const match = {};
  if (filters.branchId) match.branchId = filters.branchId;
  if (filters.date) {
    const d = new Date(filters.date);
    const dateStr = d.toISOString().split('T')[0];
    match.checkInTime = {
      $gte: new Date(`${dateStr}T00:00:00.000Z`),
      $lte: new Date(`${dateStr}T23:59:59.999Z`),
    };
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
