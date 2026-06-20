const mongoose = require('mongoose');
const { Voucher, Package, VoucherUsage, User, PointHistory } = require('../models');

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'WASH';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

const applyVoucher = (voucher, amount) => {
  if (voucher.type === 'percentage') {
    const discount = Math.floor(amount * (voucher.value / 100));
    return voucher.maxDiscount > 0 ? Math.min(discount, voucher.maxDiscount) : discount;
  }
  return Math.min(voucher.value, amount);
};

exports.createVoucher = async (data) => {
  const code = data.code || generateCode();
  const existing = await Voucher.findOne({ code: code.toUpperCase() });
  if (existing) throw Object.assign(new Error('Voucher code already exists'), { statusCode: 409, code: 'DUPLICATE_CODE' });

  const voucher = new Voucher({
    ...data,
    code: code.toUpperCase(),
    remaining: data.quantity,
    createdBy: data.createdBy,
  });
  await voucher.save();
  return voucher;
};

exports.getAllVouchers = async (filters = {}) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  if (filters.search) {
    query.$or = [
      { code: { $regex: filters.search, $options: 'i' } },
      { name: { $regex: filters.search, $options: 'i' } },
    ];
  }
  if (filters.startDate || filters.endDate) {
    query.startDate = {};
    if (filters.startDate) query.startDate.$gte = new Date(filters.startDate);
    if (filters.endDate) query.startDate.$lte = new Date(filters.endDate);
  }
  if (filters.endDateOnly) {
    query.endDate = { $gte: new Date(filters.endDateOnly) };
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Voucher.find(query).populate('createdBy', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Voucher.countDocuments(query),
  ]);

  return {
    data,
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

exports.getVoucherById = async (id) => {
  const voucher = await Voucher.findById(id);
  if (!voucher) throw Object.assign(new Error('Voucher not found'), { statusCode: 404, code: 'VOUCHER_NOT_FOUND' });
  return voucher;
};

exports.getVoucherByCode = async (code) => {
  const voucher = await Voucher.findOne({ code: code.toUpperCase() });
  if (!voucher) throw Object.assign(new Error('Voucher not found'), { statusCode: 404, code: 'VOUCHER_NOT_FOUND' });
  return voucher;
};

exports.updateVoucher = async (id, updates) => {
  const voucher = await Voucher.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  if (!voucher) throw Object.assign(new Error('Voucher not found'), { statusCode: 404, code: 'VOUCHER_NOT_FOUND' });
  return voucher;
};

exports.deleteVoucher = async (id) => {
  const voucher = await Voucher.findByIdAndDelete(id);
  if (!voucher) throw Object.assign(new Error('Voucher not found'), { statusCode: 404, code: 'VOUCHER_NOT_FOUND' });
  return voucher;
};

exports.validateVoucher = async (code, bookingData, userId) => {
  const voucher = await Voucher.findOne({ code: code.toUpperCase() });
  if (!voucher) throw Object.assign(new Error('Voucher not found'), { statusCode: 404, code: 'VOUCHER_NOT_FOUND' });
  if (voucher.status !== 'active') throw Object.assign(new Error('Voucher is inactive'), { statusCode: 400, code: 'VOUCHER_INACTIVE' });
  if (voucher.isTemplate) throw Object.assign(new Error('Voucher template cannot be used directly'), { statusCode: 400, code: 'VOUCHER_IS_TEMPLATE' });

  // Kiểm tra gán cho user cụ thể
  if (voucher.assignedTo && String(voucher.assignedTo) !== String(userId)) {
    throw Object.assign(new Error('Voucher is assigned to another user'), { statusCode: 403, code: 'VOUCHER_ASSIGNED_TO_OTHER' });
  }

  const now = new Date();
  if (now < voucher.startDate) throw Object.assign(new Error('Voucher is not yet active'), { statusCode: 400, code: 'VOUCHER_NOT_ACTIVE' });
  if (now > voucher.endDate) throw Object.assign(new Error('Voucher has expired'), { statusCode: 400, code: 'VOUCHER_EXPIRED' });
  if (voucher.remaining <= 0) throw Object.assign(new Error('Voucher is fully redeemed'), { statusCode: 400, code: 'VOUCHER_EXHAUSTED' });

  if (userId && voucher.maxUsagePerUser > 0) {
    const usageCount = await VoucherUsage.countDocuments({ voucherId: voucher._id, userId });
    if (usageCount >= voucher.maxUsagePerUser) {
      throw Object.assign(new Error(`You have reached the maximum usage limit for this voucher (${voucher.maxUsagePerUser} time(s))`), { statusCode: 400, code: 'VOUCHER_MAX_USAGE' });
    }
  }

  // Kiểm tra hạng thành viên nếu voucher yêu cầu
  if (userId && voucher.applicableTiers && voucher.applicableTiers.length > 0) {
    const user = await User.findById(userId);
    if (!user || !voucher.applicableTiers.includes(user.tier)) {
      throw Object.assign(new Error(`Voucher is only applicable for tiers: ${voucher.applicableTiers.join(', ')}`), { statusCode: 403, code: 'VOUCHER_TIER_MISMATCH' });
    }
  }

  if (!voucher.applicableToAllPackages && voucher.applicablePackages.length > 0) {
    if (!voucher.applicablePackages.some((p) => String(p) === String(bookingData.packageId))) {
      throw Object.assign(new Error('Voucher not applicable to this package'), { statusCode: 400, code: 'VOUCHER_NOT_APPLICABLE' });
    }
  }
  if (!voucher.applicableToAllBranches && voucher.applicableBranches.length > 0) {
    if (!voucher.applicableBranches.some((b) => String(b) === String(bookingData.branchId))) {
      throw Object.assign(new Error('Voucher not applicable at this branch'), { statusCode: 400, code: 'VOUCHER_NOT_APPLICABLE' });
    }
  }

  let amount = 0;
  if (bookingData.amount !== undefined) {
    amount = bookingData.amount;
  } else if (bookingData.packageId) {
    const pkg = await Package.findById(bookingData.packageId);
    if (pkg) amount = pkg.price;
  }

  if (amount < voucher.minOrder) {
    throw Object.assign(new Error(`Minimum order amount is ${voucher.minOrder}`), { statusCode: 400, code: 'MIN_ORDER_NOT_MET' });
  }

  const discount = applyVoucher(voucher, amount);
  return {
    voucher,
    originalAmount: amount,
    discountAmount: discount,
    finalAmount: amount - discount,
    savings: discount,
  };
};

/**
 * Reserve voucher for a booking (atomic decrement).
 * If payment fails, call rollbackVoucher() to restore remaining count.
 * @param {Object} [parentSession] - Optional existing session from a parent transaction
 */
exports.reserveVoucher = async (code, userId, bookingId, discountAmount, parentSession) => {
  const ownSession = !parentSession;
  const session = parentSession || await mongoose.startSession();
  if (ownSession) session.startTransaction();

  try {
    // Kiểm tra đã reserve cho booking này chưa (idempotent)
    const existingForBooking = await VoucherUsage.findOne({ bookingId, userId }).session(session);
    if (existingForBooking) {
      // Đã reserve rồi, skip
      const voucher = await Voucher.findById(existingForBooking.voucherId).session(session);
      await session.commitTransaction();
      return { voucher, usage: existingForBooking, alreadyReserved: true };
    }

    const Booking = mongoose.model('Booking');
    const booking = await Booking.findById(bookingId).session(session);
    let isAlreadyReservedForGroup = false;

    // Check if the voucher has already been reserved for another booking in the same recurring group
    if (booking && booking.bookingType === 'recurring' && booking.recurringGroupId) {
      const voucherDoc = await Voucher.findOne({ code: code.toUpperCase() }).session(session);
      if (voucherDoc) {
        const groupBookings = await Booking.find({ recurringGroupId: booking.recurringGroupId }).select('_id').session(session);
        const groupIds = groupBookings.map(b => b._id);
        const existingUsage = await VoucherUsage.findOne({ voucherId: voucherDoc._id, userId, bookingId: { $in: groupIds } }).session(session);
        if (existingUsage) {
          isAlreadyReservedForGroup = true;
        }
      }
    }

    let voucher;
    if (isAlreadyReservedForGroup) {
      // Just fetch the voucher without decrementing
      voucher = await Voucher.findOne({ code: code.toUpperCase() }).session(session);
      if (!voucher) throw Object.assign(new Error('Voucher not found'), { statusCode: 404, code: 'VOUCHER_NOT_FOUND' });
    } else {
      // Lock voucher and check all conditions atomically
      voucher = await Voucher.findOneAndUpdate(
        {
          code: code.toUpperCase(),
          remaining: { $gt: 0 },
          status: 'active',
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
        },
        { $inc: { remaining: -1 } },
        { new: true, session }
      );

      if (!voucher) {
        const existing = await Voucher.findOne({ code: code.toUpperCase() }).session(session);
        if (!existing) throw Object.assign(new Error('Voucher not found'), { statusCode: 404, code: 'VOUCHER_NOT_FOUND' });
        if (existing.remaining <= 0) throw Object.assign(new Error('Voucher fully redeemed'), { statusCode: 400, code: 'VOUCHER_EXHAUSTED' });
        throw Object.assign(new Error('Voucher is inactive or expired'), { statusCode: 400, code: 'VOUCHER_INVALID' });
      }

      // Check per-user usage limit inside the same transaction
      if (voucher.maxUsagePerUser > 0) {
        const usageCount = await VoucherUsage.countDocuments({ voucherId: voucher._id, userId }).session(session);
        if (usageCount >= voucher.maxUsagePerUser) {
          // Rollback the decrement we just did
          await Voucher.findByIdAndUpdate(voucher._id, { $inc: { remaining: 1 } }, { session });
          throw Object.assign(new Error(`You have reached the maximum usage limit for this voucher (${voucher.maxUsagePerUser} time(s))`), { statusCode: 400, code: 'VOUCHER_MAX_USAGE' });
        }
      }
    }

    const usage = new VoucherUsage({
      voucherId: voucher._id,
      userId,
      bookingId,
      discountAmount,
    });
    await usage.save({ session });

    if (ownSession) await session.commitTransaction();
    return { voucher, usage };
  } catch (err) {
    if (ownSession) await session.abortTransaction();
    throw err;
  } finally {
    if (ownSession) session.endSession();
  }
};

/**
 * Rollback voucher reservation (restore remaining count).
 * Idempotent: safe to call multiple times — only restores if usage record exists.
 * @param {Object} [parentSession] - Optional existing session from a parent transaction
 */
exports.rollbackVoucher = async (code, userId, bookingId, parentSession) => {
  const ownSession = !parentSession;
  const session = parentSession || await mongoose.startSession();
  if (ownSession) session.startTransaction();

  try {
    const voucher = await Voucher.findOne({ code: code.toUpperCase() }).session(session);
    if (!voucher) {
      // Already rolled back or never reserved — safe to skip
      await session.commitTransaction();
      return;
    }

    const usage = await VoucherUsage.findOne({ voucherId: voucher._id, userId, bookingId }).session(session);
    if (!usage) {
      await session.commitTransaction();
      return;
    }

    await Voucher.findByIdAndUpdate(voucher._id, { $inc: { remaining: 1 } }, { session });

    await VoucherUsage.deleteOne({ _id: usage._id }).session(session);
    if (ownSession) await session.commitTransaction();
  } catch (err) {
    if (ownSession) await session.abortTransaction();
    throw err;
  } finally {
    if (ownSession) session.endSession();
  }
};

exports.getVoucherUsage = async (voucherId, filters = {}) => {
  const query = { voucherId };
  if (filters.dateFrom || filters.dateTo) {
    query.usedAt = {};
    if (filters.dateFrom) query.usedAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      query.usedAt.$lte = to;
    }
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    VoucherUsage.find(query)
      .populate('userId', 'name email phone tier')
      .populate('bookingId', 'bookingDate startTime status')
      .sort({ usedAt: -1 })
      .skip(skip)
      .limit(limit),
    VoucherUsage.countDocuments(query),
  ]);

  return {
    data,
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

exports.getVoucherUsageReport = async () => {
  const pipeline = [
    {
      $group: {
        _id: { userId: '$userId', voucherId: '$voucherId' },
        count: { $sum: 1 },
        totalDiscount: { $sum: '$discountAmount' }
      }
    },
    {
      $lookup: {
        from: 'vouchers',
        localField: '_id.voucherId',
        foreignField: '_id',
        as: 'voucher'
      }
    },
    { $unwind: { path: '$voucher', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$_id.userId',
        totalUsedVouchers: { $sum: '$count' },
        totalDiscountAmount: { $sum: '$totalDiscount' },
        vouchersUsed: {
          $push: {
            voucherId: '$_id.voucherId',
            code: '$voucher.code',
            name: '$voucher.name',
            count: '$count',
            totalDiscount: '$totalDiscount'
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        userId: '$_id',
        'user.name': 1,
        'user.email': 1,
        'user.phone': 1,
        'user.tier': 1,
        totalUsedVouchers: 1,
        totalDiscountAmount: 1,
        vouchersUsed: 1
      }
    },
    { $sort: { totalUsedVouchers: -1 } }
  ];

  return VoucherUsage.aggregate(pipeline);
};

exports.getUserVouchers = async (userId) => {
  return VoucherUsage.find({ userId })
    .populate('voucherId')
    .populate('bookingId', 'bookingDate startTime status')
    .sort({ usedAt: -1 });
};

/**
 * Lấy tất cả voucher có thể dùng cho user hiện tại, phân loại 3 nhóm:
 *  - tier_exclusive: chỉ cho hạng của user (diamond/gold/silver)
 *  - public:        ai cũng dùng được (applicableTiers rỗng)
 *  - redeemable:    đổi điểm (isTemplate + requiredPoints > 0)
 */
exports.getAvailableVouchersForUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const now = new Date();

  // Lấy tất cả voucher active, còn hạn, còn hàng, không phải template
  const allVouchers = await Voucher.find({
    status: 'active',
    isTemplate: false,
    startDate: { $lte: now },
    endDate:   { $gte: now },
    $and: [
      { $or: [{ remaining: { $gt: 0 } }, { quantity: 0 }] },
      { $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }, { assignedTo: userId }] },
    ],
  }).lean();

  // Redeemable templates (đổi điểm)
  const templates = await Voucher.find({
    status: 'active',
    isTemplate: true,
    requiredPoints: { $gt: 0 },
    remaining: { $gt: 0 },
    endDate: { $gte: now },
  }).lean();

  const tierExclusive = [];
  const publicVouchers = [];

  for (const v of allVouchers) {
    // Kiểm tra giới hạn dùng per-user
    if (v.maxUsagePerUser > 0) {
      const usageCount = await VoucherUsage.countDocuments({ voucherId: v._id, userId });
      if (usageCount >= v.maxUsagePerUser) continue;
    }

    if (v.applicableTiers && v.applicableTiers.length > 0) {
      // Voucher dành riêng theo tier
      if (v.applicableTiers.includes(user.tier)) {
        tierExclusive.push(v);
      }
      // Nếu tier không khớp → bỏ qua
    } else {
      // Voucher công khai
      publicVouchers.push(v);
    }
  }

  return {
    user: {
      tier: user.tier,
      loyaltyPoints: user.loyaltyPoints,
      lifetimePoints: user.lifetimePoints,
    },
    tier_exclusive: tierExclusive,
    public: publicVouchers,
    redeemable: templates,
  };
};


/**
 * Đổi điểm lấy Voucher
 */
exports.redeemPointsForVoucher = async (templateId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

    const template = await Voucher.findById(templateId).session(session);
    if (!template) throw Object.assign(new Error('Voucher template not found'), { statusCode: 404 });
    
    if (!template.isTemplate) {
      throw Object.assign(new Error('This is not a redeemable voucher template'), { statusCode: 400 });
    }
    
    if (template.requiredPoints <= 0) {
      throw Object.assign(new Error('This voucher does not require points to redeem'), { statusCode: 400 });
    }

    if (user.loyaltyPoints < template.requiredPoints) {
      throw Object.assign(new Error(`Not enough points. Required: ${template.requiredPoints}, Available: ${user.loyaltyPoints}`), { statusCode: 400, code: 'INSUFFICIENT_POINTS' });
    }

    if (template.applicableTiers && template.applicableTiers.length > 0 && !template.applicableTiers.includes(user.tier)) {
      throw Object.assign(new Error(`Your tier (${user.tier}) is not eligible for this voucher`), { statusCode: 403 });
    }

    if (template.remaining <= 0) {
      throw Object.assign(new Error('Voucher is out of stock'), { statusCode: 400 });
    }

    // Trừ số lượng template
    template.remaining -= 1;
    await template.save({ session });

    // Trừ điểm user
    user.loyaltyPoints -= template.requiredPoints;
    
    // Gia hạn điểm
    const sixMonthsLater = new Date();
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
    user.pointsExpiresAt = sixMonthsLater;
    await user.save({ session });

    // Ghi log PointHistory
    await PointHistory.create([{
      userId,
      points: -template.requiredPoints,
      type: 'redeemed',
      description: `Đổi ${template.requiredPoints} điểm lấy voucher ${template.name}`,
      referenceId: template._id,
    }], { session });

    // Tạo Voucher thực tế cho User từ template
    const userVoucher = new Voucher({
      code: `RD${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      name: template.name,
      description: template.description,
      type: template.type,
      value: template.value,
      maxDiscount: template.maxDiscount,
      minOrder: template.minOrder,
      quantity: 1,
      remaining: 1,
      startDate: new Date(),
      endDate: template.endDate,
      applicablePackages: template.applicablePackages,
      applicableBranches: template.applicableBranches,
      applicableToAllPackages: template.applicableToAllPackages,
      applicableToAllBranches: template.applicableToAllBranches,
      status: 'active',
      isTemplate: false,
      assignedTo: userId,
      maxUsagePerUser: 1,
    });
    
    await userVoucher.save({ session });
    await session.commitTransaction();

    return userVoucher;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};
