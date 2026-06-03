const { User, PointHistory } = require('../models');

// Tính điểm dựa trên số tiền (5%)
const calculatePoints = (amount) => {
  return Math.floor(amount * 0.05);
};

// Mốc thăng hạng
const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 100000,
  gold: 500000,
  diamond: 1000000,
};

// Xác định hạng dựa trên tổng điểm đời người (lifetimePoints)
const determineTier = (lifetimePoints) => {
  if (lifetimePoints >= TIER_THRESHOLDS.diamond) return 'diamond';
  if (lifetimePoints >= TIER_THRESHOLDS.gold) return 'gold';
  if (lifetimePoints >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
};

/**
 * Xử lý khi thanh toán thành công: cộng điểm, ghi log, thăng hạng
 */
exports.addPointsFromPayment = async (userId, amount, bookingId, session) => {
  const pointsEarned = calculatePoints(amount);
  if (pointsEarned <= 0) return null;

  const user = await User.findById(userId).session(session);
  if (!user) return null;

  user.loyaltyPoints += pointsEarned;
  user.lifetimePoints += pointsEarned;
  
  // Gia hạn điểm 6 tháng
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);
  user.pointsExpiresAt = sixMonthsLater;

  // Kiểm tra thăng hạng
  const newTier = determineTier(user.lifetimePoints);
  const tierChanged = user.tier !== newTier;
  if (tierChanged) {
    user.tier = newTier;
  }

  await user.save({ session });

  // Ghi log
  await PointHistory.create([{
    userId,
    points: pointsEarned,
    type: 'earned',
    description: `Tích lũy ${pointsEarned} điểm từ thanh toán hóa đơn.`,
    referenceId: bookingId,
  }], { session });

  return { pointsEarned, newTier, tierChanged };
};

/**
 * Kiểm tra điểm hết hạn (thường gọi khi user đăng nhập hoặc getProfile)
 */
exports.checkAndExpirePoints = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return;

  if (user.loyaltyPoints > 0 && user.pointsExpiresAt && user.pointsExpiresAt < new Date()) {
    const expiredPoints = user.loyaltyPoints;
    user.loyaltyPoints = 0;
    await user.save();

    await PointHistory.create({
      userId,
      points: -expiredPoints,
      type: 'expired',
      description: `Điểm tích lũy đã hết hạn.`,
    });
  }
};
