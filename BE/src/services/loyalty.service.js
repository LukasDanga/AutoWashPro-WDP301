const { User, PointHistory } = require('../models');
const notificationService = require('./notification.service');

// Tính điểm dựa trên số tiền (5%) kèm hệ số nhân theo hạng
const calculatePoints = (amount, tier = 'bronze') => {
  let multiplier = 1;
  if (tier === 'diamond') multiplier = 2.0;
  else if (tier === 'gold') multiplier = 1.5;
  else if (tier === 'silver') multiplier = 1.2;
  return Math.floor(amount * 0.05 * multiplier);
};

// Cấu hình các mốc điểm và ưu đãi của hạng thành viên
const TIER_CONFIG = {
  bronze: {
    id: 'bronze',
    name: 'Đồng',
    minPoints: 0,
    multiplier: 1.0,
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    benefits: ['Tích lũy 5% điểm thưởng từ mỗi hóa đơn', 'Nhận thông báo ưu đãi sớm nhất']
  },
  silver: {
    id: 'silver',
    name: 'Bạc',
    minPoints: 100000,
    multiplier: 1.2,
    color: 'text-slate-600',
    bg: 'bg-slate-100 border-slate-300',
    benefits: ['Tất cả ưu đãi của hạng Đồng', 'Hệ số nhân điểm x1.2', 'Ưu tiên rửa xe không cần chờ lâu']
  },
  gold: {
    id: 'gold',
    name: 'Vàng',
    minPoints: 500000,
    multiplier: 1.5,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 border-yellow-200',
    benefits: ['Tất cả ưu đãi của hạng Bạc', 'Hệ số nhân điểm x1.5', 'Giảm 5% khi mua gói dịch vụ', 'Tặng 1 lần xịt gầm miễn phí mỗi tháng']
  },
  diamond: {
    id: 'diamond',
    name: 'Kim cương',
    minPoints: 1000000,
    multiplier: 2.0,
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    benefits: ['Tất cả ưu đãi của hạng Vàng', 'Hệ số nhân điểm siêu tốc x2.0', 'Giảm 10% khi mua gói dịch vụ', 'Phục vụ phòng chờ VIP', 'Tặng 1 lượt rửa xe tiêu chuẩn miễn phí mỗi tháng']
  },
};

// Xác định hạng dựa trên tổng điểm đời người (lifetimePoints)
const determineTier = (lifetimePoints) => {
  if (lifetimePoints >= TIER_CONFIG.diamond.minPoints) return 'diamond';
  if (lifetimePoints >= TIER_CONFIG.gold.minPoints) return 'gold';
  if (lifetimePoints >= TIER_CONFIG.silver.minPoints) return 'silver';
  return 'bronze';
};

exports.getTierConfig = () => Object.values(TIER_CONFIG);


/**
 * Xử lý khi thanh toán thành công: cộng điểm, ghi log, thăng hạng
 */
exports.addPointsFromPayment = async (userId, amount, bookingId, session) => {
  const user = await User.findById(userId).session(session);
  if (!user) return null;

  const pointsEarned = calculatePoints(amount, user.tier);
  if (pointsEarned <= 0) return null;

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
    
    // Only notify if upgrading (not downgrading, though determineTier only upgrades)
    const tierName = TIER_CONFIG[newTier]?.name || newTier;
    notificationService.send(
      userId, 
      'Chúc mừng thăng hạng', 
      `Bạn đã được thăng lên hạng ${tierName}. Khám phá ngay các ưu đãi mới!`, 
      'tier_upgraded', 
      { newTier }
    ).catch(() => {});
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
