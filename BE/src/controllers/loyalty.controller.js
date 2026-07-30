const loyaltyService = require('../services/loyalty.service');
const { catchAsync, success } = require('../utils/helpers');

exports.getTiers = catchAsync(async (req, res, next) => {
  const tiers = await loyaltyService.getTierConfig();
  res.status(200).json({
    status: 'success',
    data: tiers,
  });
});

exports.getConfig = catchAsync(async (req, res, next) => {
  const config = await loyaltyService.getLoyaltyConfig();
  success(res, config, 'Lấy cấu hình điểm thưởng thành công');
});

exports.updateConfig = catchAsync(async (req, res, next) => {
  const updatedConfig = await loyaltyService.updateLoyaltyConfig(req.body);
  success(res, updatedConfig, 'Cập nhật cấu hình điểm thưởng thành công');
});

exports.getMyPointHistory = catchAsync(async (req, res, next) => {
  const { PointHistory } = require('../models');
  const { page = 1, limit = 10 } = req.query;

  const filter = { userId: req.user._id, isDeleted: { $ne: true } };

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  const total = await PointHistory.countDocuments(filter);
  const totalPages = Math.ceil(total / limitNum) || 1;

  const items = await PointHistory.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const statsAggregate = await PointHistory.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalEarned: { $sum: { $cond: [{ $eq: ['$type', 'earned'] }, '$points', 0] } },
        totalRedeemed: { $sum: { $cond: [{ $in: ['$type', ['redeemed', 'expired']] }, { $abs: '$points' }, 0] } },
      },
    },
  ]);

  const summary = statsAggregate[0] || { totalEarned: 0, totalRedeemed: 0 };

  success(res, items, 'Lấy lịch sử điểm thưởng thành công', 200, {
    page: pageNum, limit: limitNum, total, totalPages,
    hasNextPage: pageNum < totalPages, hasPrevPage: pageNum > 1, summary,
  });
});

exports.getMyPointHistoryDetail = catchAsync(async (req, res, next) => {
  const { PointHistory } = require('../models');
  const { id } = req.params;

  const item = await PointHistory.findOne({ _id: id, userId: req.user._id, isDeleted: { $ne: true } })
    .populate('userId', 'name email phone avatar tier loyaltyPoints lifetimePoints createdAt');

  if (!item) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch điểm thưởng', code: 'NOT_FOUND' });
  }

  success(res, item, 'Lấy chi tiết giao dịch điểm thưởng thành công');
});

exports.getPointHistoryAdmin = catchAsync(async (req, res, next) => {
  const { PointHistory, User, Booking } = require('../models');
  const { search, branchId, startDate, endDate, type, deleteStatus = 'all', page = 1, limit = 10 } = req.query;

  // Validation: startDate <= endDate
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Ngày bắt đầu không được lớn hơn ngày kết thúc',
        code: 'INVALID_DATE_RANGE',
      });
    }
  }

  const isManager = req.user.role === 'manager';
  const filter = {};

  if (isManager) {
    // Manager: ALWAYS hide soft deleted records
    filter.isDeleted = { $ne: true };

    if (!req.user.branchId) {
      return res.status(400).json({
        success: false,
        message: 'Tài khoản quản lý chưa được gán chi nhánh',
        code: 'MANAGER_NO_BRANCH',
      });
    }
    const managerBranchId = req.user.branchId._id || req.user.branchId;

    const branchBookings = await Booking.find({ branchId: managerBranchId }).select('_id');
    const branchBookingIds = branchBookings.map((b) => b._id);

    filter.$or = [
      { 'snapshot.branchId': managerBranchId },
      { referenceId: { $in: branchBookingIds } },
    ];
  } else {
    // Admin: Soft delete filter ('all' = all records, 'deleted' = only soft-deleted, 'active' = only active)
    if (deleteStatus === 'deleted') {
      filter.isDeleted = true;
    } else if (deleteStatus === 'active') {
      filter.isDeleted = { $ne: true };
    }
    // If deleteStatus === 'all', do not add isDeleted filter for Admin so soft-deleted records remain visible!

    // Admin branch filter (if specified)
    if (branchId) {
      const branchBookings = await Booking.find({ branchId }).select('_id');
      const branchBookingIds = branchBookings.map((b) => b._id);
      filter.$or = [
        { 'snapshot.branchId': branchId },
        { referenceId: { $in: branchBookingIds } },
      ];
    }
  }

  // Date range filter
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  // Type filter ('earned', 'redeemed', 'expired', 'adjustment')
  if (type) {
    filter.type = type;
  }

  // Search by user name, phone, email, description, or booking code
  if (search) {
    const users = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    }).select('_id');
    const matchingUserIds = users.map((u) => u._id);

    const searchOr = [
      { userId: { $in: matchingUserIds } },
      { description: { $regex: search, $options: 'i' } },
      { 'snapshot.bookingCode': { $regex: search, $options: 'i' } },
    ];

    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
      delete filter.$or;
    } else {
      filter.$or = searchOr;
    }
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  const total = await PointHistory.countDocuments(filter);
  const totalPages = Math.ceil(total / limitNum) || 1;

  const items = await PointHistory.find(filter)
    .populate('userId', 'name email phone avatar tier loyaltyPoints')
    .populate('snapshot.branchId', 'name address')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Summary stats for total earned & total redeemed
  const statsAggregate = await PointHistory.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalEarned: {
          $sum: {
            $cond: [{ $eq: ['$type', 'earned'] }, '$points', 0],
          },
        },
        totalRedeemed: {
          $sum: {
            $cond: [{ $in: ['$type', ['redeemed', 'expired']] }, { $abs: '$points' }, 0],
          },
        },
      },
    },
  ]);

  const summary = statsAggregate[0] || { totalEarned: 0, totalRedeemed: 0 };

  success(res, items, 'Lấy lịch sử điểm thưởng thành công', 200, {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages,
    hasNextPage: pageNum < totalPages,
    hasPrevPage: pageNum > 1,
    summary,
  });
});

exports.getPointHistoryDetailAdmin = catchAsync(async (req, res, next) => {
  const { PointHistory } = require('../models');
  const { id } = req.params;

  const item = await PointHistory.findById(id)
    .populate('userId', 'name email phone avatar tier loyaltyPoints lifetimePoints createdAt')
    .populate('snapshot.branchId', 'name address phone email')
    .populate({
      path: 'referenceId',
      select: 'bookingCode bookingType status paymentStatus totalPrice finalAmount depositAmount paymentMethod bookingDate startTime cancellationReason createdAt subServices packageId branchId',
      populate: [
        { path: 'packageId', select: 'name price duration description' },
        { path: 'branchId', select: 'name address phone' },
      ],
    });

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy giao dịch điểm thưởng',
      code: 'NOT_FOUND',
    });
  }

  success(res, item, 'Lấy chi tiết giao dịch điểm thưởng thành công');
});

exports.deletePointHistoryAdmin = catchAsync(async (req, res, next) => {
  const { PointHistory } = require('../models');
  const { id } = req.params;
  const { mode = 'soft' } = req.body || {}; // 'soft' (default) or 'hard'

  const item = await PointHistory.findById(id);
  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy giao dịch điểm thưởng',
      code: 'NOT_FOUND',
    });
  }

  if (mode === 'hard') {
    await PointHistory.findByIdAndDelete(id);
    return success(res, null, 'Đã xóa vĩnh viễn giao dịch điểm thưởng khỏi cơ sở dữ liệu');
  } else {
    item.isDeleted = true;
    item.deletedAt = new Date();
    await item.save();
    return success(res, item, 'Đã ẩn giao dịch điểm thưởng khỏi danh sách (Xóa mềm)');
  }
});
