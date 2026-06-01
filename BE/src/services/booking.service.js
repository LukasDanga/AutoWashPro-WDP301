const { Booking, Package, Branch, Vehicle, Payment } = require('../models');

const VALID_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];

const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
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

const isSlotConflict = (newStart, newEnd, bookings) => {
  const ns = parseTime(newStart);
  const ne = parseTime(newEnd);
  if (ns === null || ne === null) return true;
  return bookings.some((b) => {
    const bs = parseTime(b.startTime);
    const be = parseTime(b.endTime);
    if (bs === null || be === null) return false;
    return !(ne <= bs || ns >= be);
  });
};

const buildSlots = (packageDuration, openTime = '07:00', closeTime = '20:00') => {
  const open = parseTime(openTime);
  const close = parseTime(closeTime);
  if (open === null || close === null) return [];
  const slots = [];
  for (let current = open; current + packageDuration <= close; current += 30) {
    const start = `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`;
    const endH = Math.floor((current + packageDuration) / 60);
    const endM = (current + packageDuration) % 60;
    const end = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    slots.push({ startTime: start, endTime: end });
  }
  return slots;
};

const computeEndTime = (startTime, duration) => {
  const total = parseTime(startTime) + duration;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

exports.createBooking = async (data) => {
  const { branchId, packageId, vehicleId, userId, bookingDate, startTime, note, voucherCode, discountAmount, finalPrice } = data;

  const pkg = await Package.findById(packageId);
  if (!pkg) throw Object.assign(new Error('Package not found'), { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });
  if (pkg.status === 'inactive') throw Object.assign(new Error('Package unavailable'), { statusCode: 400, code: 'PACKAGE_UNAVAILABLE' });

  const branch = await Branch.findById(branchId);
  if (!branch) throw Object.assign(new Error('Branch not found'), { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
  if (branch.status === 'inactive') throw Object.assign(new Error('Branch unavailable'), { statusCode: 400, code: 'BRANCH_UNAVAILABLE' });

  const vehicle = await Vehicle.findById(vehicleId);
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

  const dateStr = bookingStr;
  const existing = await Booking.find({
    branchId,
    bookingDate: { $gte: new Date(`${dateStr}T00:00:00Z`), $lte: new Date(`${dateStr}T23:59:59Z`) },
    status: { $in: ['pending', 'confirmed', 'in_progress'] },
  });
  if (isSlotConflict(startTime, endTime, existing)) {
    throw Object.assign(new Error('Time slot not available'), { statusCode: 409, code: 'SLOT_UNAVAILABLE' });
  }

  const booking = new Booking({
    userId, branchId, packageId, vehicleId,
    bookingDate: bd, startTime, endTime, note,
    voucherCode: voucherCode || undefined,
    discountAmount: discountAmount || 0,
    finalPrice: finalPrice || pkg.price,
  });
  await booking.save();
  return booking;
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
    query.bookingDate = { $gte: new Date(d.toISOString().split('T')[0] + 'T00:00:00Z'), $lte: new Date(d.toISOString().split('T')[0] + 'T23:59:59Z') };
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
  const booking = await Booking.findById(id);
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
    const pkg = await Package.findById(pkgId);
    if (!pkg) throw Object.assign(new Error('Package not found'), { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });

    const startT = filtered.startTime || booking.startTime;
    const endTime = computeEndTime(startT, pkg.duration);
    filtered.endTime = endTime;

    const dateStr = (filtered.bookingDate || booking.bookingDate) instanceof Date
      ? filtered.bookingDate.toISOString().split('T')[0]
      : filtered.bookingDate;
    const bid = filtered.branchId || booking.branchId;

    const existing = await Booking.find({
      _id: { $ne: booking._id },
      branchId: bid,
      bookingDate: { $gte: new Date(`${dateStr}T00:00:00Z`), $lte: new Date(`${dateStr}T23:59:59Z`) },
      status: { $in: ['pending', 'confirmed', 'in_progress'] },
    });
    if (isSlotConflict(startT, endTime, existing)) {
      throw Object.assign(new Error('Time slot not available'), { statusCode: 409, code: 'SLOT_UNAVAILABLE' });
    }
  }

  Object.assign(booking, filtered);
  if (isRescheduled) booking.rescheduleCount = (booking.rescheduleCount || 0) + 1;
  await booking.save();
  return booking;
};

exports.updateBookingStatus = async (id, status) => {
  if (!VALID_STATUSES.includes(status)) {
    throw Object.assign(new Error('Invalid status'), { statusCode: 400, code: 'INVALID_STATUS' });
  }
  const booking = await Booking.findById(id);
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });

  const allowed = VALID_TRANSITIONS[booking.status] || [];
  if (!allowed.includes(status)) {
    throw Object.assign(new Error(`Cannot transition from '${booking.status}' to '${status}'`), { statusCode: 400, code: 'INVALID_TRANSITION' });
  }

  booking.status = status;
  if (status === 'confirmed') booking.confirmedAt = new Date();
  if (status === 'cancelled') booking.cancelledAt = new Date();
  await booking.save();
  return booking;
};

exports.cancelBooking = async (id, userId, userRole, cancellationReason) => {
  const booking = await Booking.findById(id);
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  if (userRole !== 'admin' && userRole !== 'manager' && String(booking.userId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized to cancel this booking'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  if (booking.status === 'completed') throw Object.assign(new Error('Cannot cancel a completed booking'), { statusCode: 400, code: 'INVALID_STATUS' });
  if (booking.status === 'cancelled') throw Object.assign(new Error('Booking already cancelled'), { statusCode: 400, code: 'ALREADY_CANCELLED' });

  if (booking.paymentStatus === 'paid' && booking.status !== 'pending') {
    throw Object.assign(new Error('Cannot cancel a booking that has been paid. Please request a refund first.'), { statusCode: 400, code: 'PAYMENT_PAID' });
  }

  const now = new Date();
  const bookingDateTime = new Date(booking.bookingDate);
  const [h, m] = booking.startTime.split(':').map(Number);
  bookingDateTime.setHours(h, m, 0, 0);
  if (bookingDateTime - now < 30 * 60 * 1000) {
    throw Object.assign(new Error('Cannot cancel within 30 minutes of booking start time'), { statusCode: 400, code: 'CANCEL_WINDOW_PASSED' });
  }

  const cancelledBy = userRole === 'customer' ? 'customer' : userRole === 'admin' ? 'admin' : 'manager';
  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancelledBy = cancelledBy;
  if (cancellationReason) booking.cancellationReason = cancellationReason;
  await booking.save();
  return booking;
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
  const branch = await Branch.findById(branchId);
  if (!branch) throw Object.assign(new Error('Branch not found'), { statusCode: 404, code: 'BRANCH_NOT_FOUND' });

  const pkg = await Package.findById(packageId);
  if (!pkg) throw Object.assign(new Error('Package not found'), { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });

  const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
  const existing = await Booking.find({
    branchId,
    bookingDate: { $gte: new Date(`${dateStr}T00:00:00Z`), $lte: new Date(`${dateStr}T23:59:59Z`) },
    status: { $in: ['pending', 'confirmed', 'in_progress'] },
  }).select('startTime endTime');

  const slots = buildSlots(pkg.duration, branch.openingTime || '07:00', branch.closingTime || '20:00');
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  return slots.map((s) => {
    let available = !isSlotConflict(s.startTime, s.endTime, existing);
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
