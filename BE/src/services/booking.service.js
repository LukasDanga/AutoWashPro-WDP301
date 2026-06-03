const mongoose = require('mongoose');
const { Booking, Package, Branch, Vehicle, Payment } = require('../models');
const notificationService = require('./notification.service');
const voucherService = require('./voucher.service');

const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

const VALID_TRANSITIONS = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const parseTime = (t) => {
  if (!t || typeof t !== 'string') return null;
  const parts = t.split(':');
  if (parts.length !== 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

const isSlotOverlap = (s1, e1, s2, e2) => !(e1 <= s2 || s1 >= e2);

const buildSlots = (packageDuration, openTime = '07:00', closeTime = '20:00') => {
  const open = parseTime(openTime);
  const close = parseTime(closeTime);
  if (open === null || close === null) return [];
  const slots = [];
  for (let current = open; current + packageDuration <= close; current += 30) {
    const start = `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`;
    const endH = Math.floor((current + packageDuration) / 60);
    const endM = (current + packageDuration) % 60;
    const end = `${String(endH).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
    slots.push({ startTime: start, endTime: end });
  }
  return slots;
};

const computeEndTime = (startTime, duration) => {
  const total = parseTime(startTime) + duration;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const getDayBounds = (dateStr) => ({
  gte: new Date(`${dateStr}T00:00:00.000Z`),
  lte: new Date(`${dateStr}T23:59:59.999Z`),
});

exports.createBooking = async (data) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { branchId, packageId, vehicleId, userId, bookingDate, startTime, note, voucherCode, discountAmount, finalPrice } = data;

    const [pkg, branch, vehicle] = await Promise.all([
      Package.findById(packageId).session(session),
      Branch.findById(branchId).session(session),
      Vehicle.findById(vehicleId).session(session),
    ]);

    if (!pkg) throw Object.assign(new Error('Package not found'), { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });
    if (pkg.status === 'inactive') throw Object.assign(new Error('Package unavailable'), { statusCode: 400, code: 'PACKAGE_UNAVAILABLE' });
    if (!branch) throw Object.assign(new Error('Branch not found'), { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
    if (branch.status === 'inactive') throw Object.assign(new Error('Branch unavailable'), { statusCode: 400, code: 'BRANCH_UNAVAILABLE' });
    if (!vehicle) throw Object.assign(new Error('Vehicle not found'), { statusCode: 404, code: 'VEHICLE_NOT_FOUND' });
    if (String(vehicle.userId) !== String(userId)) {
      throw Object.assign(new Error('Vehicle does not belong to this user'), { statusCode: 403, code: 'FORBIDDEN' });
    }

    const endTime = computeEndTime(startTime, pkg.duration);
    const endMinutes = parseTime(endTime);
    const closeMinutes = parseTime(branch.closingTime || '20:00');
    if (endMinutes > closeMinutes) {
      throw Object.assign(new Error('Booking end time exceeds branch closing time'), { statusCode: 400, code: 'OUTSIDE_HOURS' });
    }

    const bd = bookingDate instanceof Date ? bookingDate : new Date(bookingDate);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const bookingStr = bd.toISOString().split('T')[0];
    if (bookingStr < todayStr) {
      throw Object.assign(new Error('Booking date cannot be in the past'), { statusCode: 400, code: 'INVALID_DATE' });
    }
    if (bookingStr === todayStr) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = parseTime(startTime);
      if (startMinutes !== null && startMinutes <= currentMinutes + 30) {
        throw Object.assign(new Error('Booking must be at least 30 minutes in the future'), { statusCode: 400, code: 'INVALID_TIME' });
      }
    }

    const { gte, lte } = getDayBounds(bookingStr);
    const conflicting = await Booking.find({
      _id: { $ne: null },
      branchId,
      bookingDate: { $gte: gte, $lte: lte },
      status: { $in: ['pending', 'in_progress'] },
    }).session(session);

    const newStart = parseTime(startTime);
    const newEnd = parseTime(endTime);
    const hasConflict = conflicting.some((b) => {
      const bs = parseTime(b.startTime);
      const be = parseTime(b.endTime);
      return bs !== null && be !== null && isSlotOverlap(newStart, newEnd, bs, be);
    });
    if (hasConflict) {
      throw Object.assign(new Error('Time slot not available'), { statusCode: 409, code: 'SLOT_UNAVAILABLE' });
    }

    const booking = new Booking({
      userId, branchId, packageId, vehicleId,
      bookingDate: bd, startTime, endTime, note,
      voucherCode: voucherCode || undefined,
      discountAmount: discountAmount || 0,
      finalPrice: finalPrice || pkg.price,
    });
    await booking.save({ session });

    await session.commitTransaction();

    notificationService.send(
      userId,
      'Đặt lịch thành công',
      `Bạn đã đặt lịch rửa xe ${pkg.name} vào lúc ${startTime} ngày ${bd.toLocaleDateString('vi-VN')}.`,
      'booking_created',
      { bookingId: booking._id }
    ).catch(() => {});

    return booking;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

exports.getAllBookings = async (filters = {}, userRole, userId) => {
  const query = {};
  if (userRole === 'customer') {
    query.userId = userId;
  } else {
    if (filters.userId) query.userId = filters.userId;
    if (filters.branchId) query.branchId = filters.branchId;
  }
  if (filters.status) query.status = filters.status;
  if (filters.bookingDate) {
    const d = filters.bookingDate instanceof Date ? filters.bookingDate : new Date(filters.bookingDate);
    const dateStr = d.toISOString().split('T')[0];
    const { gte, lte } = getDayBounds(dateStr);
    query.bookingDate = { $gte: gte, $lte: lte };
  }
  return Booking.find(query)
    .populate('userId', 'name email phone')
    .populate('branchId', 'name address')
    .populate('packageId', 'name price duration')
    .populate('vehicleId', 'licensePlate vehicleType brand color')
    .sort({ bookingDate: -1, startTime: -1 });
};

exports.getBookingById = async (id, userRole, userId) => {
  const booking = await Booking.findById(id)
    .populate('userId', 'name email phone')
    .populate('branchId', 'name address phone')
    .populate('packageId', 'name price duration')
    .populate('vehicleId', 'licensePlate vehicleType brand color');
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  if (userRole === 'customer' && String(booking.userId._id || booking.userId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  return booking;
};

exports.updateBooking = async (id, updates, userRole) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findById(id).session(session);
    if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      throw Object.assign(new Error('Cannot update a completed or cancelled booking'), { statusCode: 400, code: 'INVALID_STATUS' });
    }

    const allowedFields = ['bookingDate', 'startTime', 'note', 'packageId', 'branchId'];
    const filtered = {};
    allowedFields.forEach((k) => { if (updates[k] !== undefined) filtered[k] = updates[k]; });

    const isRescheduled = filtered.bookingDate || filtered.startTime || filtered.packageId || updates.branchId;

    if (filtered.startTime || filtered.packageId || updates.branchId) {
      const pkgId = filtered.packageId || booking.packageId;
      const pkg = await Package.findById(pkgId).session(session);
      if (!pkg) throw Object.assign(new Error('Package not found'), { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });

      const startT = filtered.startTime || booking.startTime;
      const endTime = computeEndTime(startT, pkg.duration);
      filtered.endTime = endTime;

      const dateObj = filtered.bookingDate ? new Date(filtered.bookingDate) : booking.bookingDate;
      const dateStr = dateObj.toISOString().split('T')[0];
      const bid = filtered.branchId || booking.branchId;
      const { gte, lte } = getDayBounds(dateStr);

      const conflicting = await Booking.find({
        _id: { $ne: booking._id },
        branchId: bid,
        bookingDate: { $gte: gte, $lte: lte },
        status: { $in: ['pending', 'in_progress'] },
      }).session(session);

      const newStart = parseTime(startT);
      const newEnd = parseTime(endTime);
      const hasConflict = conflicting.some((b) => {
        const bs = parseTime(b.startTime);
        const be = parseTime(b.endTime);
        return bs !== null && be !== null && isSlotOverlap(newStart, newEnd, bs, be);
      });
      if (hasConflict) {
        throw Object.assign(new Error('Time slot not available'), { statusCode: 409, code: 'SLOT_UNAVAILABLE' });
      }
    }

    Object.assign(booking, filtered);
    if (isRescheduled) booking.rescheduleCount = (booking.rescheduleCount || 0) + 1;
    await booking.save({ session });

    await session.commitTransaction();
    return booking;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

exports.updateBookingStatus = async (id, status) => {
  if (!VALID_STATUSES.includes(status)) {
    throw Object.assign(new Error('Invalid status'), { statusCode: 400, code: 'INVALID_STATUS' });
  }

  const currentBooking = await Booking.findById(id);
  if (!currentBooking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });

  const allowed = VALID_TRANSITIONS[currentBooking.status] || [];
  if (!allowed.includes(status)) {
    throw Object.assign(new Error(`Cannot transition from '${currentBooking.status}' to '${status}'`), { statusCode: 400, code: 'INVALID_TRANSITION' });
  }

  const update = { status };
  if (status === 'cancelled') update.cancelledAt = new Date();

  const booking = await Booking.findOneAndUpdate(
    { _id: id, status: currentBooking.status },
    update,
    { new: true }
  );
  if (!booking) {
    throw Object.assign(new Error('Booking status was changed by another request'), { statusCode: 409, code: 'CONCURRENT_MODIFICATION' });
  }
  return booking;
};

exports.cancelBooking = async (id, userId, userRole, cancellationReason) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findById(id).session(session);
    if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
    if (userRole !== 'admin' && userRole !== 'manager' && String(booking.userId) !== String(userId)) {
      throw Object.assign(new Error('Not authorized to cancel this booking'), { statusCode: 403, code: 'FORBIDDEN' });
    }
    if (booking.status === 'completed') {
      throw Object.assign(new Error('Cannot cancel a completed booking'), { statusCode: 400, code: 'INVALID_STATUS' });
    }
    if (booking.status === 'cancelled') {
      throw Object.assign(new Error('Booking already cancelled'), { statusCode: 400, code: 'ALREADY_CANCELLED' });
    }
    if (booking.paymentStatus === 'paid') {
      throw Object.assign(new Error('Cannot cancel a booking that has been paid. Please request a refund first.'), { statusCode: 400, code: 'PAYMENT_PAID' });
    }

    const now = new Date();
    const bookingDateTime = new Date(booking.bookingDate);
    const [h, m] = booking.startTime.split(':').map(Number);
    bookingDateTime.setHours(h, m, 0, 0);
    if (booking.status !== 'in_progress' && bookingDateTime - now < 30 * 60 * 1000) {
      throw Object.assign(new Error('Cannot cancel within 30 minutes of booking start time'), { statusCode: 400, code: 'CANCEL_WINDOW_PASSED' });
    }

    const cancelledBy = userRole === 'customer' ? 'customer' : userRole === 'admin' ? 'admin' : 'manager';

    const updated = await Booking.findOneAndUpdate(
      { _id: id, status: booking.status },
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy,
        cancellationReason: cancellationReason || undefined,
      },
      { new: true, session }
    );
    if (!updated) {
      throw Object.assign(new Error('Booking status was changed by another request'), { statusCode: 409, code: 'CONCURRENT_MODIFICATION' });
    }

    if (booking.voucherCode) {
      await voucherService.rollbackVoucher(booking.voucherCode, booking.userId, id).catch(() => {});
    }

    await session.commitTransaction();

    notificationService.send(
      booking.userId,
      'Lịch hẹn đã bị hủy',
      `Lịch hẹn rửa xe vào lúc ${booking.startTime} ngày ${new Date(booking.bookingDate).toLocaleDateString('vi-VN')} đã bị hủy${cancellationReason ? `. Lý do: ${cancellationReason}` : ''}.`,
      'booking_cancelled',
      { bookingId: id }
    ).catch(() => {});

    return updated;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

exports.deleteBooking = async (id, userRole) => {
  if (userRole !== 'admin') {
    throw Object.assign(new Error('Only admin can delete bookings'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  const booking = await Booking.findByIdAndDelete(id);
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  return booking;
};

exports.getAvailableSlots = async (branchId, date, packageId) => {
  const [branch, pkg] = await Promise.all([
    Branch.findById(branchId),
    Package.findById(packageId),
  ]);
  if (!branch) throw Object.assign(new Error('Branch not found'), { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
  if (!pkg) throw Object.assign(new Error('Package not found'), { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });

  const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
  const { gte, lte } = getDayBounds(dateStr);
  const existing = await Booking.find({
    branchId,
    bookingDate: { $gte: gte, $lte: lte },
    status: { $in: ['pending', 'in_progress'] },
  }).select('startTime endTime');

  const slots = buildSlots(pkg.duration, branch.openingTime || '07:00', branch.closingTime || '20:00');
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  return slots.map((s) => {
    let available = !existing.some((b) => {
      const bs = parseTime(b.startTime);
      const be = parseTime(b.endTime);
      const ns = parseTime(s.startTime);
      const ne = parseTime(s.endTime);
      return bs !== null && be !== null && ns !== null && ne !== null && isSlotOverlap(ns, ne, bs, be);
    });
    if (dateStr === todayStr) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const slotStartMinutes = parseTime(s.startTime);
      if (slotStartMinutes !== null && slotStartMinutes <= currentMinutes + 30) {
        available = false;
      }
    }
    return { ...s, available };
  });
};
