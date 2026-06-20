const mongoose = require('mongoose');
const crypto = require('crypto');
const { Booking, Package, Branch, Vehicle, Payment, User, SlotPack, PointHistory } = require('../models');
const notificationService = require('./notification.service');
const voucherService = require('./voucher.service');
const loyaltyService = require('./loyalty.service');
const sseService = require('./sse.service');

const VALID_STATUSES = ['pending', 'checked_in', 'in_progress', 'completed', 'cancelled'];

const VALID_TRANSITIONS = {
  pending: ['checked_in', 'in_progress', 'cancelled'],
  checked_in: ['in_progress', 'cancelled'],
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
    const { branchId, packageId, vehicleId, userId, bookingDate, startTime, note, voucherCode, discountAmount, finalPrice, selectedSubServices, slotPackId } = data;

    const [pkg, branch, vehicle, user] = await Promise.all([
      Package.findById(packageId).session(session),
      Branch.findById(branchId).session(session),
      Vehicle.findById(vehicleId).session(session),
      User.findById(userId).session(session),
    ]);

    if (!pkg) throw Object.assign(new Error('Package not found'), { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });
    if (pkg.status === 'inactive') throw Object.assign(new Error('Package unavailable'), { statusCode: 400, code: 'PACKAGE_UNAVAILABLE' });
    if (pkg.branchId && String(pkg.branchId) !== String(branchId)) {
      throw Object.assign(new Error('Package does not belong to this branch'), { statusCode: 400, code: 'PACKAGE_BRANCH_MISMATCH' });
    }
    if (!branch) throw Object.assign(new Error('Branch not found'), { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
    if (branch.status === 'inactive') throw Object.assign(new Error('Branch unavailable'), { statusCode: 400, code: 'BRANCH_UNAVAILABLE' });
    if (!vehicle) throw Object.assign(new Error('Vehicle not found'), { statusCode: 404, code: 'VEHICLE_NOT_FOUND' });
    if (String(vehicle.userId) !== String(userId)) {
      throw Object.assign(new Error('Vehicle does not belong to this user'), { statusCode: 403, code: 'FORBIDDEN' });
    }

    // Verify subServices and calculate total extra duration & price
    let extraDuration = 0;
    let extraPrice = 0;
    const validSubServices = [];
    if (selectedSubServices && Array.isArray(selectedSubServices) && pkg.subServices) {
      for (const serviceName of selectedSubServices) {
        const sub = pkg.subServices.find(s => s.name === serviceName);
        if (sub) {
          extraDuration += sub.duration || 0;
          extraPrice += sub.price || 0;
          validSubServices.push({ name: sub.name, price: sub.price, duration: sub.duration });
        }
      }
    }

    const totalDuration = pkg.duration + extraDuration;
    const endTime = computeEndTime(startTime, totalDuration);
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
    const overlappingCount = conflicting.filter((b) => {
      const bs = parseTime(b.startTime);
      const be = parseTime(b.endTime);
      return bs !== null && be !== null && isSlotOverlap(newStart, newEnd, bs, be);
    }).length;

    const capacity = branch.capacity || 2;
    if (overlappingCount >= capacity) {
      throw Object.assign(new Error('Time slot full'), { statusCode: 409, code: 'SLOT_FULL' });
    }
    if (capacity > 1 && overlappingCount >= capacity - 1 && user.tier !== 'gold' && user.tier !== 'diamond') {
      throw Object.assign(new Error('This slot is reserved for VIP members only'), { statusCode: 403, code: 'SLOT_VIP_ONLY' });
    }

    let computedDiscountAmount = 0;
    let computedFinalPrice = pkg.price + extraPrice;

    if (voucherCode) {
      // Pass the computedBasePrice to voucher validation if needed, assuming voucher validation accepts amount
      const voucherResult = await voucherService.validateVoucher(voucherCode, { packageId, branchId, amount: computedFinalPrice }, userId);
      computedDiscountAmount = voucherResult.discountAmount || voucherResult.savings || 0;
      computedFinalPrice = voucherResult.finalAmount || Math.max(0, computedFinalPrice - computedDiscountAmount);
    }

    let bookingType = 'single';
    let paymentStatus = 'unpaid';

    if (slotPackId) {
      const pack = await SlotPack.findOneAndUpdate(
        { _id: slotPackId, userId, status: 'active', remainingSlots: { $gt: 0 } },
        { $inc: { remainingSlots: -1, usedSlots: 1 } },
        { new: true, session }
      );
      if (!pack) throw Object.assign(new Error('Slot pack not found or exhausted'), { statusCode: 400, code: 'SLOT_PACK_INVALID' });
      
      if (pack.expiresAt && new Date() > pack.expiresAt) {
        await SlotPack.findByIdAndUpdate(pack._id, { $inc: { remainingSlots: 1, usedSlots: -1 } }, { session });
        throw Object.assign(new Error('Slot pack has expired'), { statusCode: 400, code: 'SLOT_PACK_EXPIRED' });
      }
      
      if (pack.branchId && String(pack.branchId) !== String(branchId)) {
        await SlotPack.findByIdAndUpdate(pack._id, { $inc: { remainingSlots: 1, usedSlots: -1 } }, { session });
        throw Object.assign(new Error('Slot pack is not valid for this branch'), { statusCode: 400, code: 'SLOT_PACK_BRANCH_MISMATCH' });
      }

      if (pack.vehicleId && String(pack.vehicleId) !== String(vehicleId)) {
        await SlotPack.findByIdAndUpdate(pack._id, { $inc: { remainingSlots: 1, usedSlots: -1 } }, { session });
        throw Object.assign(new Error('Slot pack is not valid for this vehicle'), { statusCode: 400, code: 'SLOT_PACK_VEHICLE_MISMATCH' });
      }
      
      if (pack.remainingSlots === 0) {
        await SlotPack.findByIdAndUpdate(pack._id, { status: 'exhausted' }, { session });
      }

      computedDiscountAmount = 0;
      computedFinalPrice = 0;
      bookingType = 'slot_pack_usage';
      paymentStatus = 'paid';
    }

    const booking = new Booking({
      userId, branchId, packageId, vehicleId,
      bookingDate: bd, startTime, endTime, note,
      voucherCode: voucherCode || undefined,
      discountAmount: computedDiscountAmount,
      finalPrice: computedFinalPrice,
      selectedSubServices: validSubServices,
      slotPackId: slotPackId || undefined,
      bookingType,
      paymentStatus,
    });
    await booking.save({ session });

    // Reserve voucher khi tạo booking (trừ remaining + tạo VoucherUsage)
    if (voucherCode && computedDiscountAmount > 0) {
      await voucherService.reserveVoucher(voucherCode, userId, booking._id, computedDiscountAmount);
    }

    await session.commitTransaction();

    notificationService.send(
      userId,
      'Đặt lịch thành công',
      `Bạn đã đặt lịch rửa xe ${pkg.name} vào lúc ${startTime} ngày ${bd.toLocaleDateString('vi-VN')}.`,
      'booking_created',
      { bookingId: booking._id }
    ).catch(() => {});

    // Notify admin + manager of the branch
    notificationService.sendToAdminAndManager(
      branchId,
      'Đặt lịch mới',
      `${user.name || 'Khách hàng'} vừa đặt lịch ${pkg.name} lúc ${startTime} ngày ${bd.toLocaleDateString('vi-VN')}.`,
      'booking_created',
      { bookingId: booking._id, branchId }
    ).catch(() => {});

    // Push SSE event to manager so their bell updates in real-time
    sseService.broadcastToManagers(branchId, 'booking_new', {
      bookingId: booking._id,
      branchId,
      packageName: pkg.name,
      startTime,
    });

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
  } else if (userRole === 'manager') {
    const branch = await Branch.findOne({ managerId: userId });
    if (!branch) return { bookings: [], total: 0, page: 1, totalPages: 0 };
    query.branchId = branch._id;
    if (filters.userId) query.userId = filters.userId;
  } else {
    if (filters.userId) query.userId = filters.userId;
    if (filters.branchId) query.branchId = filters.branchId;
  }
  if (filters.status) query.status = filters.status;
  if (filters.bookingType) query.bookingType = filters.bookingType;

  // date range (dateFrom/dateTo) or single bookingDate
  if (filters.dateFrom || filters.dateTo) {
    query.bookingDate = {};
    if (filters.dateFrom) query.bookingDate.$gte = getDayBounds(filters.dateFrom).gte;
    if (filters.dateTo)   query.bookingDate.$lte = getDayBounds(filters.dateTo).lte;
  } else if (filters.bookingDate) {
    const dateStr = filters.bookingDate instanceof Date
      ? filters.bookingDate.toISOString().split('T')[0]
      : filters.bookingDate;
    const { gte, lte } = getDayBounds(dateStr);
    query.bookingDate = { $gte: gte, $lte: lte };
  }

  // search: match by customer name/phone or license plate
  if (filters.search && filters.search.trim()) {
    const re = new RegExp(filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [matchedUsers, matchedVehicles] = await Promise.all([
      User.find({ $or: [{ name: re }, { phone: re }] }, '_id'),
      Vehicle.find({ licensePlate: re }, 'userId'),
    ]);
    const ids = new Set([
      ...matchedUsers.map(u => String(u._id)),
      ...matchedVehicles.map(v => String(v.userId)),
    ]);
    if (ids.size === 0) return { bookings: [], total: 0, page: 1, totalPages: 0 };
    query.userId = { $in: [...ids].map(id => new mongoose.Types.ObjectId(id)) };
  }

  // keyword: search package name OR branch name
  if (filters.keyword && filters.keyword.trim()) {
    const re = new RegExp(filters.keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const [matchedPackages, matchedBranches] = await Promise.all([
      Package.find({ name: re }, '_id'),
      Branch.find({ name: re }, '_id'),
    ]);
    const orClauses = [];
    if (matchedPackages.length > 0) orClauses.push({ packageId: { $in: matchedPackages.map(p => p._id) } });
    if (matchedBranches.length > 0) orClauses.push({ branchId: { $in: matchedBranches.map(b => b._id) } });
    if (orClauses.length === 0) return { bookings: [], total: 0, page: 1, totalPages: 0 };
    if (query.$or) query.$or = [...query.$or, ...orClauses];
    else query.$or = orClauses;
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate('userId', 'name email phone tier')
      .populate('branchId', 'name address')
      .populate('packageId', 'name price duration')
      .populate('vehicleId', 'licensePlate vehicleType brand color')
      .sort({ bookingDate: -1, startTime: -1 })
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(query),
  ]);

  return {
    bookings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};

exports.getBookingById = async (id, userRole, userId) => {
  const booking = await Booking.findById(id)
    .populate('userId', 'name email phone tier')
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
      const bid = String(filtered.branchId || booking.branchId);
      if (pkg.branchId && String(pkg.branchId) !== bid) {
        throw Object.assign(new Error('Package does not belong to this branch'), { statusCode: 400, code: 'PACKAGE_BRANCH_MISMATCH' });
      }

      const startT = filtered.startTime || booking.startTime;
      const endTime = computeEndTime(startT, pkg.duration);
      filtered.endTime = endTime;

      const dateObj = filtered.bookingDate ? new Date(filtered.bookingDate) : booking.bookingDate;
      const dateStr = dateObj.toISOString().split('T')[0];
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

exports.updateBookingStatus = async (id, status, updateData = {}) => {
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
  if (status === 'checked_in') {
    update.checkInTime = new Date();
    if (updateData.staffId) update.staffId = updateData.staffId;
  }
  if (status === 'cancelled') update.cancelledAt = new Date();
  if (status === 'completed') {
    update.checkOutTime = new Date();
    if (currentBooking.paymentStatus === 'unpaid') {
      update.paymentStatus = 'pending';
    }
    if (updateData.rating) update.rating = updateData.rating;
    if (updateData.feedback) update.feedback = updateData.feedback;
  }
  if (updateData.note) update.note = updateData.note;

  const booking = await Booking.findOneAndUpdate(
    { _id: id, status: currentBooking.status },
    update,
    { new: true }
  ).populate('userId', 'name email phone tier')
   .populate('branchId', 'name address phone')
   .populate('packageId', 'name price duration')
   .populate('vehicleId', 'licensePlate vehicleType brand color');
  if (!booking) {
    throw Object.assign(new Error('Booking status was changed by another request'), { statusCode: 409, code: 'CONCURRENT_MODIFICATION' });
  }

  // Post-completion side effects (async, non-blocking)
  if (status === 'completed') {
    setImmediate(async () => {
      try {
        // Notify customer
        const plate = booking.vehicleId?.licensePlate || '';
        const branch = booking.branchId?.name || 'chi nhánh';
        await notificationService.send(
          booking.userId?._id || currentBooking.userId,
          'Dịch vụ đã hoàn thành',
          `Xe ${plate} đã rửa xong tại ${branch}. Cảm ơn bạn — hãy để lại đánh giá nhé!`,
          'booking_completed',
          { bookingId: id }
        );
        // Notify admin + manager
        await notificationService.sendToAdminAndManager(
          booking.branchId?._id || booking.branchId,
          'Dịch vụ hoàn thành',
          `Xe ${plate} đã hoàn thành tại ${branch}.`,
          'booking_completed',
          { bookingId: id }
        );
        // Award loyalty points for slot_pack bookings (cash/online already handled in payment service)
        if (currentBooking.bookingType === 'slot_pack_usage' || currentBooking.paymentStatus === 'paid') {
          if ((currentBooking.finalPrice || 0) > 0) {
            const alreadyAwarded = await PointHistory.findOne({ referenceId: currentBooking._id, type: 'earned' });
            if (!alreadyAwarded) {
              await loyaltyService.addPointsFromPayment(currentBooking.userId, currentBooking.finalPrice, currentBooking._id, null);
            }
          }
        }
      } catch { /* silent — side effects must not fail the main response */ }
    });
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

    // Notify admin + manager
    notificationService.sendToAdminAndManager(
      booking.branchId,
      'Lịch hẹn bị hủy',
      `Lịch hẹn lúc ${booking.startTime} ngày ${new Date(booking.bookingDate).toLocaleDateString('vi-VN')} đã bị hủy.`,
      'booking_cancelled',
      { bookingId: id, branchId: booking.branchId }
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
  if (pkg.branchId && String(pkg.branchId) !== String(branchId)) {
    throw Object.assign(new Error('Package does not belong to this branch'), { statusCode: 400, code: 'PACKAGE_BRANCH_MISMATCH' });
  }

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
    const capacity = branch.capacity || 2;
    const overlappingCount = existing.filter((b) => {
      const bs = parseTime(b.startTime);
      const be = parseTime(b.endTime);
      const ns = parseTime(s.startTime);
      const ne = parseTime(s.endTime);
      return bs !== null && be !== null && ns !== null && ne !== null && isSlotOverlap(ns, ne, bs, be);
    }).length;

    let available = overlappingCount < capacity;
    let vipOnly = capacity > 1 && overlappingCount >= capacity - 1 && overlappingCount < capacity;

    if (dateStr === todayStr) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const slotStartMinutes = parseTime(s.startTime);
      if (slotStartMinutes !== null && slotStartMinutes <= currentMinutes + 30) {
        available = false;
        vipOnly = false;
      }
    }
    return { ...s, available, vipOnly };
  });
};

// ─── Tier → Priority mapping ─────────────────────────────────────────────────
const TIER_PRIORITY = { bronze: 1, silver: 2, gold: 3, diamond: 4 };

// ─── Recurring Booking ────────────────────────────────────────────────────────

/**
 * Tạo hàng loạt booking theo lịch định kỳ.
 *
 * data {
 *   userId, branchId, packageId, vehicleId,
 *   weekdays: [0-6],   // 0=CN, 1=T2, ..., 6=T7
 *   startTime: 'HH:mm',
 *   weeks: number,      // số tuần lặp lại (1-12)
 *   note, voucherCode
 * }
 *
 * Trả về { created: Booking[], failed: { date, reason }[] }
 */
exports.createRecurringBooking = async (data) => {
  const {
    userId, branchId, packageId, vehicleId,
    weekdays, startTime, weeks,
    note, voucherCode, selectedSubServices,
  } = data;

  // --- Validate base entities (ngoài transaction — chỉ đọc) ---
  const [pkg, branch, vehicle, user] = await Promise.all([
    Package.findById(packageId),
    Branch.findById(branchId),
    Vehicle.findById(vehicleId),
    User.findById(userId),
  ]);

  if (!pkg)    throw Object.assign(new Error('Package not found'),  { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });
  if (!branch) throw Object.assign(new Error('Branch not found'),   { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
  if (!vehicle) throw Object.assign(new Error('Vehicle not found'), { statusCode: 404, code: 'VEHICLE_NOT_FOUND' });
  if (pkg.status === 'inactive')    throw Object.assign(new Error('Package unavailable'),  { statusCode: 400, code: 'PACKAGE_UNAVAILABLE' });
  if (branch.status === 'inactive') throw Object.assign(new Error('Branch unavailable'),   { statusCode: 400, code: 'BRANCH_UNAVAILABLE' });
  if (pkg.branchId && String(pkg.branchId) !== String(branchId)) {
    throw Object.assign(new Error('Package does not belong to this branch'), { statusCode: 400, code: 'PACKAGE_BRANCH_MISMATCH' });
  }
  if (String(vehicle.userId) !== String(userId)) {
    throw Object.assign(new Error('Vehicle does not belong to this user'), { statusCode: 403, code: 'FORBIDDEN' });
  }

  // --- Validate weekdays & weeks ---
  if (!Array.isArray(weekdays) || weekdays.length === 0) {
    throw Object.assign(new Error('At least one weekday must be selected'), { statusCode: 400, code: 'INVALID_WEEKDAYS' });
  }
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 12) {
    throw Object.assign(new Error('Weeks must be between 1 and 12'), { statusCode: 400, code: 'INVALID_WEEKS' });
  }

  // --- Sub-services ---
  let extraDuration = 0;
  let extraPrice = 0;
  const validSubServices = [];
  if (selectedSubServices && Array.isArray(selectedSubServices) && pkg.subServices) {
    for (const serviceName of selectedSubServices) {
      const sub = pkg.subServices.find(s => s.name === serviceName);
      if (sub) {
        extraDuration += sub.duration || 0;
        extraPrice += sub.price || 0;
        validSubServices.push({ name: sub.name, price: sub.price, duration: sub.duration });
      }
    }
  }

  // --- Validate time ---
  const totalDuration = pkg.duration + extraDuration;
  const endTime = computeEndTime(startTime, totalDuration);
  const endMinutes = parseTime(endTime);
  const closeMinutes = parseTime(branch.closingTime || '20:00');
  if (endMinutes > closeMinutes) {
    throw Object.assign(new Error('Booking end time exceeds branch closing time'), { statusCode: 400, code: 'OUTSIDE_HOURS' });
  }

  // --- Priority ---
  const priority = TIER_PRIORITY[user?.tier] || 1;

  // --- Validate voucher (1 lần, áp cho toàn bộ series) ---
  let computedDiscountAmount = 0;
  let computedFinalPrice = pkg.price + extraPrice;
  if (voucherCode) {
    const vResult = await voucherService.validateVoucher(voucherCode, { packageId, branchId, amount: computedFinalPrice }, userId);
    computedDiscountAmount = vResult.discountAmount || vResult.savings || 0;
    computedFinalPrice = vResult.finalAmount || Math.max(0, computedFinalPrice - computedDiscountAmount);
  }

  // --- Build danh sách các ngày cần tạo booking ---
  const recurringGroupId = crypto.randomUUID();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDates = [];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const candidate = new Date(today);
      candidate.setDate(today.getDate() + w * 7 + d);
      if (weekdays.includes(candidate.getDay())) {
        // Bỏ qua ngày trong quá khứ
        if (candidate >= today) {
          targetDates.push(new Date(candidate));
        }
      }
    }
  }

  if (targetDates.length === 0) {
    throw Object.assign(new Error('No valid dates to book for the selected weekdays and weeks'), { statusCode: 400, code: 'NO_DATES' });
  }

  // --- Tạo booking lần lượt, bỏ qua ngày conflict ---
  const created = [];
  const failed  = [];

  for (const bookingDate of targetDates) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const bookingStr = bookingDate.toISOString().split('T')[0];

      // Check if it's today and time has passed
      const todayStr = new Date().toISOString().split('T')[0];
      if (bookingStr === todayStr) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const startMinutes = parseTime(startTime);
        if (startMinutes !== null && startMinutes <= currentMinutes + 30) {
          await session.abortTransaction();
          failed.push({ date: bookingStr, reason: 'Thời gian đặt lịch phải cách hiện tại ít nhất 30 phút' });
          continue;
        }
      }

      const { gte, lte } = getDayBounds(bookingStr);

      const conflicting = await Booking.find({
        branchId,
        bookingDate: { $gte: gte, $lte: lte },
        status: { $in: ['pending', 'in_progress'] },
      }).session(session);

      const ns = parseTime(startTime);
      const ne = parseTime(endTime);
      const capacity = branch.capacity || 2;
      const overlappingCount = conflicting.filter((b) => {
        const bs = parseTime(b.startTime);
        const be = parseTime(b.endTime);
        return bs !== null && be !== null && isSlotOverlap(ns, ne, bs, be);
      }).length;

      let hasConflict = false;
      if (overlappingCount >= capacity) hasConflict = true;
      if (capacity > 1 && overlappingCount >= capacity - 1 && user.tier !== 'gold' && user.tier !== 'diamond') hasConflict = true;

      let finalStartTime = startTime;
      let finalEndTime = endTime;
      let finalNote = note || '';

      if (hasConflict) {
        const slots = buildSlots(totalDuration, branch.openingTime || '07:00', branch.closingTime || '20:00');
        let bestSlot = null;
        let minDiff = Infinity;
        
        for (const slot of slots) {
          const sns = parseTime(slot.startTime);
          const sne = parseTime(slot.endTime);
          
          if (bookingStr === todayStr) {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            if (sns <= currentMinutes + 30) continue;
          }
          
          const slotOverlapCount = conflicting.filter((b) => {
            const bs = parseTime(b.startTime);
            const be = parseTime(b.endTime);
            return bs !== null && be !== null && isSlotOverlap(sns, sne, bs, be);
          }).length;
          
          let isConflicting = false;
          if (slotOverlapCount >= capacity) isConflicting = true;
          if (capacity > 1 && slotOverlapCount >= capacity - 1 && user.tier !== 'gold' && user.tier !== 'diamond') isConflicting = true;
          
          if (!isConflicting) {
            const diff = Math.abs(sns - ns);
            if (diff <= 120 && diff < minDiff) {
              minDiff = diff;
              bestSlot = slot;
            }
          }
        }

        if (bestSlot) {
          finalStartTime = bestSlot.startTime;
          finalEndTime = bestSlot.endTime;
          finalNote = finalNote ? `${finalNote}\n(Hệ thống tự động đổi giờ sang ${finalStartTime} do trùng slot)` : `(Hệ thống tự động đổi giờ sang ${finalStartTime} do trùng slot)`;
        } else {
          await session.abortTransaction();
          failed.push({ date: bookingStr, reason: 'Slot không còn trống và không có giờ thay thế phù hợp' });
          continue;
        }
      }

      const booking = new Booking({
        userId, branchId, packageId, vehicleId,
        bookingDate, startTime: finalStartTime, endTime: finalEndTime,
        note: finalNote,
        bookingType: 'recurring',
        recurringGroupId,
        priority,
        voucherCode: voucherCode ? voucherCode.trim().toUpperCase() : undefined,
        discountAmount: computedDiscountAmount,
        finalPrice: computedFinalPrice,
        selectedSubServices: validSubServices,
      });
      await booking.save({ session });
      await session.commitTransaction();
      created.push(booking);
    } catch (err) {
      await session.abortTransaction();
      const bookingStr = bookingDate.toISOString().split('T')[0];
      failed.push({ date: bookingStr, reason: err.message || 'Lỗi không xác định' });
    } finally {
      session.endSession();
    }
  }

  if (created.length === 0) {
    const reason = failed.length > 0 ? failed[0].reason : 'Tất cả khung giờ đã bị đặt.';
    throw Object.assign(
      new Error(`Không thể tạo bất kỳ booking nào. Lý do: ${reason}`),
      { statusCode: 409, code: 'ALL_SLOTS_TAKEN', failed }
    );
  }

  // Thông báo tổng kết
  notificationService.send(
    userId,
    'Đặt lịch định kỳ thành công',
    `Đã tạo ${created.length} lịch hẹn định kỳ cho ${pkg.name}.${failed.length > 0 ? ` ${failed.length} ngày bị bỏ qua do xung đột slot.` : ''}`,
    'recurring_booking_created',
    { recurringGroupId, count: created.length }
  ).catch(() => {});

  // Notify admin + manager
  notificationService.sendToAdminAndManager(
    branchId,
    'Đặt lịch định kỳ mới',
    `${user.name || 'Khách hàng'} vừa tạo ${created.length} lịch định kỳ cho ${pkg.name}.`,
    'booking_created',
    { recurringGroupId, count: created.length, branchId }
  ).catch(() => {});

  return { created, failed, recurringGroupId, totalCreated: created.length, totalFailed: failed.length };
};

/**
 * Hủy toàn bộ booking trong 1 nhóm định kỳ (recurringGroupId).
 * Chỉ hủy những booking đang pending.
 */
exports.cancelRecurringGroup = async (recurringGroupId, userId, userRole) => {
  const bookings = await Booking.find({
    recurringGroupId,
    status: 'pending',
  });

  if (bookings.length === 0) {
    throw Object.assign(new Error('No pending bookings found for this recurring group'), { statusCode: 404, code: 'NOT_FOUND' });
  }

  // Validate ownership (nếu là customer)
  if (userRole === 'customer' && String(bookings[0].userId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }

  const results = await Promise.allSettled(
    bookings.map((b) =>
      Booking.findOneAndUpdate(
        { _id: b._id, status: 'pending' },
        { status: 'cancelled', cancelledAt: new Date(), cancelledBy: userRole }
      )
    )
  );

  const cancelled = results.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value);
  return { cancelled: cancelled.length, total: bookings.length };
};

exports.getFeedbacks = async (user, filters = {}) => {
  const query = {
    status: 'completed',
    $or: [{ rating: { $exists: true, $ne: null } }, { feedback: { $exists: true, $ne: '' } }],
  };

  if (user.role === 'manager') {
    const branch = await Branch.findOne({ managerId: user.id });
    if (!branch) return { feedbacks: [], total: 0, page: 1, totalPages: 0 };
    query.branchId = branch._id;
  }

  if (filters.rating) {
    const r = parseInt(filters.rating);
    query.rating = r <= 2 ? { $lte: 2 } : r;
  }
  if (filters.replied === 'true')  query.managerReply = { $exists: true, $ne: '' };
  if (filters.replied === 'false') query.$and = [...(query.$and || []), { $or: [{ managerReply: { $exists: false } }, { managerReply: '' }] }];

  const page  = Math.max(1, parseInt(filters.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));
  const skip  = (page - 1) * limit;

  const [feedbacks, total] = await Promise.all([
    Booking.find(query)
      .populate('userId', 'name email phone avatar tier')
      .populate('packageId', 'name')
      .sort({ feedbackAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Booking.countDocuments(query),
  ]);

  return { feedbacks, total, page, totalPages: Math.ceil(total / limit) };
};

// ─── Submit / update feedback (customer, on completed booking) ───────────────
exports.submitFeedback = async (bookingId, userId, { rating, feedback }) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  if (String(booking.userId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  if (booking.status !== 'completed') {
    throw Object.assign(new Error('Chỉ có thể đánh giá booking đã hoàn thành'), { statusCode: 400, code: 'INVALID_STATUS' });
  }

  const update = { feedbackAt: new Date() };
  if (rating !== undefined) {
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) throw Object.assign(new Error('Rating must be 1-5'), { statusCode: 400 });
    update.rating = r;
  }
  if (feedback !== undefined) {
    update.feedback = String(feedback).trim().slice(0, 1000);
  }
  if (!update.rating && !update.feedback) {
    throw Object.assign(new Error('Cần nhập rating hoặc feedback'), { statusCode: 400 });
  }

  return Booking.findByIdAndUpdate(bookingId, update, { new: true })
    .populate('userId', 'name email phone tier')
    .populate('packageId', 'name price')
    .populate('branchId', 'name')
    .populate('vehicleId', 'licensePlate vehicleType brand');
};

// ─── Manager reply to feedback ────────────────────────────────────────────────
exports.replyToFeedback = async (bookingId, managerId, reply) => {
  const booking = await Booking.findById(bookingId).populate('branchId');
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  if (!booking.feedback && !booking.rating) {
    throw Object.assign(new Error('Booking chưa có đánh giá để phản hồi'), { statusCode: 400 });
  }

  // Ensure manager belongs to the same branch
  const branch = await Branch.findOne({ managerId });
  if (branch && String(branch._id) !== String(booking.branchId._id || booking.branchId)) {
    throw Object.assign(new Error('Bạn không phụ trách chi nhánh này'), { statusCode: 403, code: 'FORBIDDEN' });
  }

  const updated = await Booking.findByIdAndUpdate(
    bookingId,
    { managerReply: String(reply).trim().slice(0, 1000), managerReplyAt: new Date() },
    { new: true }
  ).populate('userId', 'name email phone tier')
   .populate('packageId', 'name')
   .populate('branchId', 'name');

  notificationService.send(
    booking.userId,
    'Chi nhánh đã phản hồi đánh giá của bạn',
    `Quản lý ${updated.branchId?.name || 'chi nhánh'} đã trả lời đánh giá của bạn: "${reply.slice(0, 80)}${reply.length > 80 ? '…' : ''}"`,
    'system',
    { bookingId }
  ).catch(() => {});

  return updated;
};

// ─── Rebook: clone a booking with new date/time ───────────────────────────────
exports.rebookBooking = async (bookingId, userId, userRole, { bookingDate, startTime }) => {
  const src = await Booking.findById(bookingId)
    .populate('packageId')
    .populate('branchId');
  if (!src) throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });

  // Authorization: customer can only rebook own, manager/admin can rebook any
  if (userRole === 'customer' && String(src.userId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  if (!['completed', 'cancelled'].includes(src.status)) {
    throw Object.assign(new Error('Chỉ có thể đặt lại đơn đã hoàn thành hoặc đã hủy'), { statusCode: 400 });
  }

  const pkg = src.packageId;
  const branch = src.branchId;
  if (!pkg || pkg.status === 'inactive') throw Object.assign(new Error('Gói dịch vụ không còn hoạt động'), { statusCode: 400 });
  if (!branch || branch.status === 'inactive') throw Object.assign(new Error('Chi nhánh không còn hoạt động'), { statusCode: 400 });

  // Compute endTime
  const totalDuration = pkg.duration + (src.selectedSubServices || []).reduce((s, ss) => s + (ss.duration || 0), 0);
  const endTime = computeEndTime(startTime, totalDuration);

  // Check slot conflict
  const bookingDateObj = new Date(bookingDate);
  const { gte, lte } = getDayBounds(bookingDate instanceof Date ? bookingDate.toISOString().split('T')[0] : bookingDate);
  const startMins = parseTime(startTime);
  const endMins = parseTime(endTime);
  const conflicts = await Booking.find({
    branchId: src.branchId,
    bookingDate: { $gte: gte, $lte: lte },
    status: { $in: ['pending', 'checked_in', 'in_progress'] },
  }).select('startTime endTime');
  const hasConflict = conflicts.some(c => isSlotOverlap(startMins, endMins, parseTime(c.startTime), parseTime(c.endTime)));
  if (hasConflict) throw Object.assign(new Error('Khung giờ này đã được đặt'), { statusCode: 409, code: 'SLOT_TAKEN' });

  // Get user for priority
  const user = await User.findById(src.userId);
  const priority = TIER_PRIORITY[user?.tier] || 1;

  const newBooking = await Booking.create({
    userId: src.userId,
    branchId: src.branchId,
    packageId: src.packageId,
    vehicleId: src.vehicleId,
    bookingDate: bookingDateObj,
    startTime,
    endTime,
    bookingType: src.bookingType === 'recurring' ? 'single' : src.bookingType,
    selectedSubServices: src.selectedSubServices || [],
    note: src.note,
    priority,
    rebookedFromId: src._id,
    finalPrice: src.finalPrice,
    discountAmount: src.discountAmount || 0,
    voucherCode: undefined,
    paymentStatus: 'unpaid',
  });

  notificationService.send(
    src.userId,
    'Đặt lại lịch thành công',
    `Lịch hẹn mới của bạn: ${pkg.name} vào lúc ${startTime} ngày ${bookingDateObj.toLocaleDateString('vi-VN')}.`,
    'booking_created',
    { bookingId: newBooking._id }
  ).catch(() => {});

  // Notify admin + manager
  notificationService.sendToAdminAndManager(
    src.branchId?._id || src.branchId,
    'Đặt lại lịch mới',
    `${src.userId?.name || 'Khách hàng'} vừa đặt lại lịch ${pkg.name} lúc ${startTime}.`,
    'booking_created',
    { bookingId: newBooking._id, branchId: src.branchId?._id || src.branchId }
  ).catch(() => {});

  return Booking.findById(newBooking._id)
    .populate('userId', 'name email phone tier')
    .populate('packageId', 'name price duration')
    .populate('branchId', 'name address')
    .populate('vehicleId', 'licensePlate vehicleType brand color');
};

exports.getCustomers = async (user, filters = {}) => {
  const match = { status: 'completed' };

  if (user.role === 'manager') {
    const branch = await Branch.findOne({ managerId: user.id });
    if (!branch) return { customers: [], total: 0, page: 1, totalPages: 0 };
    match.branchId = branch._id;
  }

  const page  = Math.max(1, parseInt(filters.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 20));
  const skip  = (page - 1) * limit;

  const postMatch = [];
  if (filters.tier)   postMatch.push({ $match: { 'user.tier': filters.tier } });
  if (filters.search && filters.search.trim()) {
    const re = new RegExp(filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    postMatch.push({ $match: { $or: [{ 'user.name': re }, { 'user.phone': re }, { 'user.email': re }] } });
  }

  const pipeline = [
    { $match: match },
    { $group: { _id: '$userId', totalBookings: { $sum: 1 }, totalSpent: { $sum: '$finalPrice' }, lastBookingDate: { $max: '$bookingDate' } } },
    { $lookup: { from: 'users',    localField: '_id', foreignField: '_id',    as: 'user' } },
    { $unwind: '$user' },
    { $lookup: { from: 'vehicles', localField: '_id', foreignField: 'userId', as: 'vehicles' } },
    ...postMatch,
    { $sort: { lastBookingDate: -1 } },
    { $facet: {
      data:  [{ $skip: skip }, { $limit: limit }],
      count: [{ $count: 'total' }],
    }},
  ];

  const [result] = await Booking.aggregate(pipeline);
  const customers = result?.data  || [];
  const total     = result?.count?.[0]?.total || 0;
  return { customers, total, page, totalPages: Math.ceil(total / limit) };
};
