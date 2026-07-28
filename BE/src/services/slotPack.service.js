const mongoose = require('mongoose');
const { SlotPack, Package, Branch, Vehicle, User, Booking } = require('../models');
const voucherService = require('./voucher.service');
const notificationService = require('./notification.service');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Ánh xạ tier → priority number */
const TIER_PRIORITY = { bronze: 1, silver: 2, gold: 3, diamond: 4 };

/** Tính % chiết khấu dựa theo số lượng slot */
function getDiscountPercent(totalSlots) {
  if (totalSlots >= 20) return 15;
  if (totalSlots >= 10) return 10;
  if (totalSlots >= 5)  return 5;
  return 0;
}

/** Sinh mã pack duy nhất: SP-XXXXXX */
function generatePackCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'SP-';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

/** Đảm bảo mã pack unique (thử lại tối đa 5 lần) */
async function generateUniquePackCode() {
  for (let i = 0; i < 5; i++) {
    const code = generatePackCode();
    const exists = await SlotPack.findOne({ packCode: code });
    if (!exists) return code;
  }
  throw new Error('Không thể tạo mã gói, vui lòng thử lại');
}

// ─── Create ───────────────────────────────────────────────────────────────────

/**
 * Tạo gói slot mới.
 * Chiết khấu tự động theo số lượng, sau đó áp thêm voucher nếu có.
 */
exports.createSlotPack = async (data) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, branchId, packageId, vehicleId, totalSlots, voucherCode, expiresAt } = data;

    // --- Validate entities ---
    const [pkg, user] = await Promise.all([
      Package.findById(packageId).session(session),
      User.findById(userId).session(session),
    ]);

    let branch = null;
    if (branchId) {
      branch = await Branch.findById(branchId).session(session);
      if (!branch) throw Object.assign(new Error('Chi nhánh không tồn tại'),   { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
      if (branch.status === 'inactive') throw Object.assign(new Error('Chi nhánh hiện không khả dụng'),   { statusCode: 400, code: 'BRANCH_UNAVAILABLE' });
    }

    let vehicle = null;
    if (vehicleId) {
      vehicle = await Vehicle.findById(vehicleId).session(session);
      if (!vehicle) throw Object.assign(new Error('Xe không tồn tại'), { statusCode: 404, code: 'VEHICLE_NOT_FOUND' });
      if (String(vehicle.userId) !== String(userId)) {
        throw Object.assign(new Error('Xe không thuộc về bạn'), { statusCode: 403, code: 'FORBIDDEN' });
      }
    }

    if (!pkg)    throw Object.assign(new Error('Gói dịch vụ không tồn tại'),  { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });
    if (!user)   throw Object.assign(new Error('Người dùng không tồn tại'),     { statusCode: 404, code: 'USER_NOT_FOUND' });
    if (pkg.status === 'inactive')    throw Object.assign(new Error('Gói dịch vụ hiện không khả dụng'),  { statusCode: 400, code: 'PACKAGE_UNAVAILABLE' });
    if (pkg.branchId && branchId && String(pkg.branchId) !== String(branchId)) {
      throw Object.assign(new Error('Gói dịch vụ không thuộc chi nhánh này'), { statusCode: 400, code: 'PACKAGE_BRANCH_MISMATCH' });
    }

    if (!Number.isInteger(totalSlots) || totalSlots < 1 || totalSlots > 50) {
      throw Object.assign(new Error('Số lượng gói phải từ 1 đến 50'), { statusCode: 400, code: 'INVALID_SLOTS' });
    }

    // --- Chiết khấu theo số lượng và hạng VIP ---
    const unitPrice = pkg.price;
    let discountPercent = getDiscountPercent(totalSlots);
    if (user.tier === 'diamond') discountPercent += 10;
    else if (user.tier === 'gold') discountPercent += 5;
    if (discountPercent > 100) discountPercent = 100;

    const grossTotal = unitPrice * totalSlots;
    const qtyDiscount = Math.floor(grossTotal * discountPercent / 100);
    let baseTotal = grossTotal - qtyDiscount; // sau chiết khấu số lượng + VIP

    // --- Priority dựa theo tier ---
    const priority = TIER_PRIORITY[user.tier] || 1;

    // --- Voucher (áp trên baseTotal) ---
    let voucherDiscount = 0;
    let finalPriceAfterVoucher = baseTotal;
    let appliedVoucherCode = null;

    if (voucherCode) {
      const vResult = await voucherService.validateVoucher(voucherCode, { amount: baseTotal }, userId);
      voucherDiscount = vResult.discountAmount;
      finalPriceAfterVoucher = Math.max(0, baseTotal - voucherDiscount);
      appliedVoucherCode = voucherCode.trim().toUpperCase();
    }

    // --- Sinh mã pack ---
    const packCode = await generateUniquePackCode();

    // --- Tạo SlotPack ---
    const slotPack = new SlotPack({
      userId, branchId, packageId, vehicleId,
      totalSlots,
      remainingSlots: totalSlots,
      usedSlots: 0,
      unitPrice,
      discountPercent,
      discountAmount: qtyDiscount,
      finalPrice: baseTotal,
      voucherCode: appliedVoucherCode,
      voucherDiscount,
      finalPriceAfterVoucher,
      priority,
      packCode,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: 'active',
      paymentStatus: 'unpaid',
    });

    await slotPack.save({ session });

    // Reserve voucher nếu có
    if (appliedVoucherCode) {
      await voucherService.reserveVoucher(appliedVoucherCode, userId, slotPack._id, voucherDiscount, session);
    }

    await session.commitTransaction();

    notificationService.send(
      userId,
      'Đã mua gói slot thành công',
      `Gói ${totalSlots} lần rửa xe ${pkg.name} — Mã: ${packCode}. ${discountPercent > 0 ? `Chiết khấu ${discountPercent}% số lượng.` : ''}`,
      'slot_pack_created',
      { slotPackId: slotPack._id }
    ).catch(() => {});

    return slotPack;
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
  }
};

// ─── Read ─────────────────────────────────────────────────────────────────────

exports.getMySlotPacks = async (userId, filters = {}) => {
  const query = { userId };
  if (filters.status) query.status = filters.status;
  if (filters.branchId) query.branchId = filters.branchId;

  return SlotPack.find(query)
    .populate('branchId',  'name address')
    .populate('packageId', 'name price duration')
    .populate('vehicleId', 'licensePlate vehicleType brand color')
    .sort({ createdAt: -1 });
};

exports.getAllSlotPacks = async (filters = {}, userRole, userBranchId) => {
  const query = {};
  if (filters.userId)   query.userId   = filters.userId;
  if (filters.status)   query.status   = filters.status;
  if (userRole === 'manager' && userBranchId) {
    query.branchId = userBranchId;
  } else if (filters.branchId) {
    query.branchId = filters.branchId;
  }

  // ── Search by keyword (name, phone, packCode) ──
  if (filters.search && filters.search.trim()) {
    const keyword = filters.search.trim();
    const regex = new RegExp(keyword, 'i');

    // Find matching user IDs by name or phone
    const matchingUsers = await User.find({
      $or: [{ name: regex }, { phone: regex }],
    }).select('_id').lean();
    const userIds = matchingUsers.map(u => u._id);

    query.$or = [
      { packCode: regex },
      { userId: { $in: userIds } },
    ];
  }

  // ── Pagination ──
  const page  = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 9));
  const skip  = (page - 1) * limit;

  const [data, total] = await Promise.all([
    SlotPack.find(query)
      .populate('userId',    'name email phone tier')
      .populate('branchId',  'name address')
      .populate('packageId', 'name price duration')
      .populate('vehicleId', 'licensePlate vehicleType brand color')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SlotPack.countDocuments(query),
  ]);

  return { data, total, page, totalPages: Math.ceil(total / limit) };
};

exports.getSlotPackById = async (id, userId, userRole) => {
  const pack = await SlotPack.findById(id)
    .populate('userId',    'name email phone tier')
    .populate('branchId',  'name address')
    .populate('packageId', 'name price duration')
    .populate('vehicleId', 'licensePlate vehicleType brand color');

  if (!pack) throw Object.assign(new Error('Gói lượt không tồn tại'), { statusCode: 404, code: 'SLOT_PACK_NOT_FOUND' });
  if (userRole === 'customer' && String(pack.userId._id || pack.userId) !== String(userId)) {
    throw Object.assign(new Error('Không có quyền truy cập'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  return pack;
};

exports.getSlotPackByCode = async (packCode, userRole, userBranchId) => {
  if (userRole !== 'admin' && userRole !== 'manager') {
    throw Object.assign(new Error('Không có quyền truy cập'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  const pack = await SlotPack.findOne({ packCode: packCode.toUpperCase() })
    .populate('userId',    'name email phone tier')
    .populate('branchId',  'name address')
    .populate('packageId', 'name price duration')
    .populate('vehicleId', 'licensePlate vehicleType brand color');

  if (!pack) throw Object.assign(new Error('Gói lượt không tồn tại'), { statusCode: 404, code: 'SLOT_PACK_NOT_FOUND' });
  if (userRole === 'manager') {
    const packBranch = String(pack.branchId?._id || pack.branchId);
    if (!userBranchId || String(userBranchId) !== packBranch) {
      throw Object.assign(new Error('Gói lượt không thuộc chi nhánh của bạn'), { statusCode: 403, code: 'FORBIDDEN' });
    }
  }
  return pack;
};

// ─── Use Slot (Manager checkin) ───────────────────────────────────────────────

/**
 * Dùng 1 slot: giảm remainingSlots, tạo Booking record tham chiếu.
 * Chỉ manager/admin gọi được.
 */
exports.useSlot = async (packId, staffId, data = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Lock & decrement atomically
    const pack = await SlotPack.findOneAndUpdate(
      { _id: packId, status: 'active', remainingSlots: { $gt: 0 } },
      { $inc: { remainingSlots: -1, usedSlots: 1 } },
      { new: true, session }
    ).populate('packageId').populate('userId');

    if (!pack) {
      const existing = await SlotPack.findById(packId).session(session);
      if (!existing) throw Object.assign(new Error('Gói lượt không tồn tại'), { statusCode: 404, code: 'SLOT_PACK_NOT_FOUND' });
      if (existing.status !== 'active') throw Object.assign(new Error(`Gói lượt đang ở trạng thái ${existing.status}`), { statusCode: 400, code: 'SLOT_PACK_INACTIVE' });
      throw Object.assign(new Error('Gói lượt đã hết lượt'), { statusCode: 400, code: 'NO_SLOTS_REMAINING' });
    }

    // Kiểm tra hạn
    if (pack.expiresAt && new Date() > pack.expiresAt) {
      // Rollback
      await SlotPack.findByIdAndUpdate(packId, { $inc: { remainingSlots: 1, usedSlots: -1 } }, { session });
      throw Object.assign(new Error('Gói lượt đã hết hạn'), { statusCode: 400, code: 'SLOT_PACK_EXPIRED' });
    }

    // Nếu hết slot → đánh dấu exhausted
    if (pack.remainingSlots === 0) {
      await SlotPack.findByIdAndUpdate(packId, { status: 'exhausted' }, { session });
    }

    // Tính ngày và giờ dùng
    const now = new Date();
    const bookingDateStr = now.toISOString().split('T')[0];
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const startTime = `${h}:${m}`;
    const duration = pack.packageId?.duration || 30;
    const endMinutes = now.getHours() * 60 + now.getMinutes() + duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    // Tạo Booking record (slot_pack_usage)
    const booking = new Booking({
      userId:    pack.userId._id || pack.userId,
      branchId:  pack.branchId,
      packageId: pack.packageId._id || pack.packageId,
      vehicleId: pack.vehicleId,
      bookingDate: now,
      startTime,
      endTime,
      status: 'in_progress',
      bookingType: 'slot_pack_usage',
      slotPackId: pack._id,
      priority: pack.priority,
      finalPrice: 0, // đã thanh toán khi mua gói
      paymentStatus: 'paid',
      note: data.note || `Slot pack usage — ${pack.totalSlots - pack.remainingSlots}/${pack.totalSlots}`,
    });
    await booking.save({ session });

    await session.commitTransaction();

    notificationService.send(
      pack.userId._id || pack.userId,
      'Đã dùng 1 slot rửa xe',
      `Còn lại ${pack.remainingSlots} lần. Mã gói: ${pack.packCode}.`,
      'slot_used',
      { slotPackId: packId, bookingId: booking._id }
    ).catch(() => {});

    return { slotPack: pack, booking };
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
  }
};

// ─── Cancel ───────────────────────────────────────────────────────────────────

exports.cancelSlotPack = async (packId, userId, userRole) => {
  const pack = await SlotPack.findById(packId);
  if (!pack) throw Object.assign(new Error('Gói lượt không tồn tại'), { statusCode: 404, code: 'SLOT_PACK_NOT_FOUND' });
  if (userRole === 'customer' && String(pack.userId) !== String(userId)) {
    throw Object.assign(new Error('Không có quyền truy cập'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  if (pack.status !== 'active') {
    throw Object.assign(new Error(`Không thể hủy gói lượt ở trạng thái ${pack.status}`), { statusCode: 400, code: 'INVALID_STATUS' });
  }
  if (pack.usedSlots > 0 && userRole === 'customer') {
    throw Object.assign(new Error('Không thể hủy gói lượt đã sử dụng một phần. Vui lòng liên hệ hỗ trợ.'), { statusCode: 400, code: 'PARTIALLY_USED' });
  }
  pack.status = 'cancelled';
  await pack.save();

  // Rollback voucher nếu có và chưa dùng
  if (pack.voucherCode && pack.usedSlots === 0) {
    await voucherService.rollbackVoucher(pack.voucherCode, userId, pack._id).catch(() => {});
  }
  return pack;
};

// ─── Usage History ────────────────────────────────────────────────────────────

/**
 * Lấy lịch sử sử dụng gói lượt (tất cả bookings có bookingType = slot_pack_usage).
 * Hỗ trợ phân页, tìm kiếm, lọc theo chi nhánh / gói slot cụ thể.
 */
exports.getUsageHistory = async (filters = {}, userRole, userBranchId) => {
  const query = { bookingType: 'slot_pack_usage' };

  if (filters.slotPackId) query.slotPackId = filters.slotPackId;
  if (filters.userId) query.userId = filters.userId;

  // Manager chỉ thấy chi nhánh mình
  if (userRole === 'manager' && userBranchId) {
    query.branchId = userBranchId;
  } else if (filters.branchId) {
    query.branchId = filters.branchId;
  }

  // Tìm kiếm theo tên / SĐT khách hàng
  if (filters.search && filters.search.trim()) {
    const keyword = filters.search.trim();
    const regex = new RegExp(keyword, 'i');
    const matchingUsers = await User.find({
      $or: [{ name: regex }, { phone: regex }],
    }).select('_id').lean();
    const userIds = matchingUsers.map(u => u._id);
    query.userId = { $in: userIds };
  }

  // Lọc theo ngày
  if (filters.date) {
    const start = new Date(filters.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filters.date);
    end.setHours(23, 59, 59, 999);
    query.bookingDate = { $gte: start, $lte: end };
  }

  // Lọc theo trạng thái booking
  if (filters.status) query.status = filters.status;

  const page  = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 15));
  const skip  = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Booking.find(query)
      .populate('userId',    'name email phone tier')
      .populate('branchId',  'name address')
      .populate('packageId', 'name price duration')
      .populate('vehicleId', 'licensePlate vehicleType brand')
      .populate('slotPackId', 'packCode totalSlots usedSlots remainingSlots')
      .sort({ bookingDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Booking.countDocuments(query),
  ]);

  return { data, total, page, totalPages: Math.ceil(total / limit) };
};

// ─── Preview chiết khấu (không lưu DB) ───────────────────────────────────────

exports.previewDiscount = (totalSlots, unitPrice) => {
  const discountPercent = getDiscountPercent(totalSlots);
  const gross = unitPrice * totalSlots;
  const discount = Math.floor(gross * discountPercent / 100);
  return {
    totalSlots,
    unitPrice,
    gross,
    discountPercent,
    discountAmount: discount,
    finalPrice: gross - discount,
    savings: discount,
  };
};
