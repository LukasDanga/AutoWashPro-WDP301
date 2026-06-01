const { Voucher, Package, VoucherUsage } = require('../models');

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
  return Voucher.find(query).populate('createdBy', 'name email').sort({ createdAt: -1 });
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

  // Validate package applicability
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

  // Get actual amount from package price (never trust client-provided amount)
  let amount = 0;
  if (bookingData.packageId) {
    const pkg = await Package.findById(bookingData.packageId);
    if (pkg) amount = pkg.price;
  } else if (bookingData.amount !== undefined) {
    amount = bookingData.amount;
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

exports.redeemVoucher = async (code, userId, bookingId, discountAmount) => {
  // Atomic: decrement only if remaining > 0
  const voucher = await Voucher.findOneAndUpdate(
    { code: code.toUpperCase(), remaining: { $gt: 0 } },
    { $inc: { remaining: -1 } },
    { new: true }
  );
  if (!voucher) {
    const existing = await Voucher.findOne({ code: code.toUpperCase() });
    if (!existing) throw Object.assign(new Error('Voucher not found'), { statusCode: 404, code: 'VOUCHER_NOT_FOUND' });
    throw Object.assign(new Error('Voucher fully redeemed'), { statusCode: 400, code: 'VOUCHER_EXHAUSTED' });
  }

  if (userId) {
    await new VoucherUsage({
      voucherId: voucher._id,
      userId,
      bookingId,
      discountAmount,
    }).save();
  }

  return voucher;
};
