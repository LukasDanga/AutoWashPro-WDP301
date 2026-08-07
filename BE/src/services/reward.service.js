const mongoose = require('mongoose');
const { Reward, Redemption, User, PointHistory } = require('../models');

const POINT_EXPIRY_MONTHS = 6;

// Thứ bậc hạng thành viên (chỉ số càng cao càng có nhiều quyền lợi)
const TIER_RANK = { bronze: 0, silver: 1, gold: 2, diamond: 3 };

const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'RDT';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

exports.getAllRewards = async (query = {}) => {
  const { page = 1, limit = 10, search, status } = query;
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Reward.find(filter).sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(Number(limit)),
    Reward.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};

exports.getPublicRewards = async () => {
  return Reward.find({ status: 'active' }).sort({ sortOrder: 1, createdAt: -1 });
};

exports.getRewardById = async (id) => {
  const reward = await Reward.findById(id);
  if (!reward) throw Object.assign(new Error('Reward not found'), { statusCode: 404 });
  return reward;
};

exports.createReward = async (data) => {
  const reward = await Reward.create(data);
  return reward;
};

exports.updateReward = async (id, data) => {
  const reward = await Reward.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!reward) throw Object.assign(new Error('Reward not found'), { statusCode: 404 });
  return reward;
};

exports.deleteReward = async (id) => {
  const reward = await Reward.findByIdAndDelete(id);
  if (!reward) throw Object.assign(new Error('Reward not found'), { statusCode: 404 });
};

exports.getUserRewards = async (userId) => {
  return Redemption.find({ user: userId }).sort({ createdAt: -1 }).populate('reward', 'name imageUrl');
};

/**
 * Lấy danh sách lượt đổi thưởng (admin/manager) kèm lọc & phân trang
 */
exports.getRedemptions = async (query = {}) => {
  const { page = 1, limit = 10, search, status, branchId } = query;
  const filter = {};
  if (status) filter.status = status;
  if (branchId) filter.branchId = branchId;
  if (search) {
    filter.$or = [
      { code: { $regex: search, $options: 'i' } },
      { 'rewardSnapshot.name': { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Redemption.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'name email phone tier')
      .populate('sentBy', 'name email')
      .populate('branchId', 'name address'),
    Redemption.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Nhân viên/manager xác nhận đã gửi quà cho khách
 */
exports.markRedemptionSent = async (redemptionId, { sentBy, branchId }) => {
  const redemption = await Redemption.findById(redemptionId);
  if (!redemption) throw Object.assign(new Error('Redemption not found'), { statusCode: 404 });
  if (redemption.status === 'cancelled') {
    throw Object.assign(new Error('Lượt đổi thưởng đã bị hủy'), { statusCode: 400 });
  }
  if (redemption.status === 'sent') {
    return redemption;
  }
  redemption.status = 'sent';
  redemption.sentAt = new Date();
  redemption.sentBy = sentBy;
  if (branchId) redemption.branchId = branchId;
  await redemption.save();
  return redemption;
};

/**
 * Manager/admin nhập mã đổi thưởng của khách để xác nhận đã nhận quà.
 * Cho phép trực tiếp từ 'claimed' -> 'received' (bỏ bước "đã gửi quà").
 */
exports.markRedemptionReceived = async (redemptionId, { code, sentBy, branchId }) => {
  const redemption = await Redemption.findById(redemptionId);
  if (!redemption) throw Object.assign(new Error('Redemption not found'), { statusCode: 404 });
  if (redemption.status === 'cancelled') {
    throw Object.assign(new Error('Lượt đổi thưởng đã bị hủy'), { statusCode: 400 });
  }
  if (redemption.status === 'received') {
    return redemption;
  }
  const entered = String(code || '').trim().toUpperCase();
  if (!entered || entered !== redemption.code) {
    throw Object.assign(new Error('Mã đổi thưởng không hợp lệ. Vui lòng kiểm tra lại'), { statusCode: 400 });
  }
  redemption.status = 'received';
  redemption.receivedAt = new Date();
  if (sentBy && !redemption.sentBy) redemption.sentBy = sentBy;
  if (branchId && !redemption.branchId) redemption.branchId = branchId;
  if (!redemption.sentAt) redemption.sentAt = new Date();
  await redemption.save();
  return redemption;
};

/**
 * Đổi điểm lấy phần thưởng
 */
exports.redeemReward = async (rewardId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

    const reward = await Reward.findById(rewardId).session(session);
    if (!reward) throw Object.assign(new Error('Reward not found'), { statusCode: 404 });

    if (reward.status !== 'active') {
      throw Object.assign(new Error('Reward is not available'), { statusCode: 400 });
    }

    if (reward.stock <= 0) {
      throw Object.assign(new Error('Reward is out of stock'), { statusCode: 400, code: 'OUT_OF_STOCK' });
    }

    // Kiểm tra hạng thành viên tối thiểu
    const userTierRank = TIER_RANK[user.tier] ?? 0;
    const requiredTier = reward.requiredTier || 'bronze';
    if (userTierRank < (TIER_RANK[requiredTier] ?? 0)) {
      throw Object.assign(
        new Error(`Phần thưởng này yêu cầu hạng ${requiredTier} trở lên`),
        { statusCode: 403, code: 'INSUFFICIENT_TIER', requiredTier }
      );
    }

    if (user.loyaltyPoints < reward.pointCost) {
      throw Object.assign(new Error(`Not enough points. Required: ${reward.pointCost}, Available: ${user.loyaltyPoints}`), { statusCode: 400, code: 'INSUFFICIENT_POINTS' });
    }

    // Trừ số lượng tồn kho
    reward.stock -= 1;
    await reward.save({ session });

    // Trừ điểm user + gia hạn
    user.loyaltyPoints -= reward.pointCost;
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + POINT_EXPIRY_MONTHS);
    user.pointsExpiresAt = expiry;
    await user.save({ session });

    // Sinh mã đổi thưởng duy nhất
    let code = generateCode();
    let attempts = 0;
    while ((await Redemption.findOne({ code }).session(session)) && attempts < 10) {
      code = generateCode();
      attempts += 1;
    }

    const redemption = new Redemption({
      user: userId,
      reward: reward._id,
      rewardSnapshot: {
        name: reward.name,
        imageUrl: reward.imageUrl,
        pointCost: reward.pointCost,
        requiredTier: reward.requiredTier || 'bronze',
      },
      code,
      pointsSpent: reward.pointCost,
      status: 'claimed',
    });
    await redemption.save({ session });

    // Ghi log PointHistory
    await PointHistory.create([{
      userId,
      points: -reward.pointCost,
      type: 'redeemed',
      description: `Đổi ${reward.pointCost} điểm lấy ${reward.name}`,
      referenceId: reward._id,
    }], { session });

    await session.commitTransaction();
    return { redemption, remainingPoints: user.loyaltyPoints };
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
  }
};