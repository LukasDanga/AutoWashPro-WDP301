const mongoose = require('mongoose');
const { Booking } = require('../models');

exports.getRevenueReport = async (filters, userRole, userBranchId) => {
  const matchStage = {
    paymentStatus: 'paid',
  };

  if (userRole === 'manager') {
    if (userBranchId) {
      matchStage.branchId = new mongoose.Types.ObjectId(userBranchId);
    }
  } else if (filters.branchIds) {
    const ids = filters.branchIds.split(',').filter(Boolean).map(id => new mongoose.Types.ObjectId(id.trim()));
    if (ids.length > 0) matchStage.branchId = { $in: ids };
  } else if (filters.branchId) {
    matchStage.branchId = new mongoose.Types.ObjectId(filters.branchId);
  }

  if (filters.period === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    matchStage.createdAt = { $gte: today };
    filters._prevStart = new Date(today);
    filters._prevStart.setDate(filters._prevStart.getDate() - 1);
    filters._prevEnd = new Date(today);
  } else if (filters.period === 'month') {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    matchStage.createdAt = { $gte: startOfMonth };
    filters._prevStart = new Date(startOfMonth);
    filters._prevStart.setMonth(filters._prevStart.getMonth() - 1);
    filters._prevEnd = new Date(startOfMonth);
  } else if (filters.startDate || filters.endDate) {
    matchStage.createdAt = {};
    if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
  }

  const pipeline = [
    { $match: matchStage },
    buildRevenueFacet()
  ];

  const result = await Booking.aggregate(pipeline);
  const data = result[0];
  const totals = data.totals[0] || { totalRevenue: 0, totalBookings: 0, cashRevenue: 0, transferRevenue: 0 };

  let previousTotals = null;
  let previousData = null;
  if (filters._prevStart && filters._prevEnd) {
    const prevMatchStage = { ...matchStage };
    prevMatchStage.createdAt = { $gte: filters._prevStart, $lt: filters._prevEnd };
    const prevResult = await Booking.aggregate([
      { $match: prevMatchStage },
      buildRevenueFacet()
    ]);
    previousData = prevResult[0];
    previousTotals = previousData.totals[0] || { totalRevenue: 0, totalBookings: 0, cashRevenue: 0, transferRevenue: 0 };
  }

  return {
    totalRevenue: totals.totalRevenue,
    totalBookings: totals.totalBookings,
    cashRevenue: totals.cashRevenue || 0,
    transferRevenue: totals.transferRevenue || 0,
    previousTotals,
    byCustomer: data.byCustomer,
    byPackage: data.byPackage,
    byVehicle: data.byVehicle,
    byVehicleType: data.byVehicleType,
    previousByCustomer: previousData?.byCustomer || [],
    previousByPackage: previousData?.byPackage || [],
    previousByVehicle: previousData?.byVehicle || [],
    previousByVehicleType: previousData?.byVehicleType || [],
  };
};

function buildRevenueFacet() {
  return {
    $facet: {
      totals: [
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: { $ifNull: ['$finalPrice', 0] } },
            totalBookings: { $sum: 1 },
            cashRevenue: {
              $sum: {
                $cond: [{ $eq: ['$paymentMethod', 'cash'] }, { $ifNull: ['$finalPrice', 0] }, 0],
              },
            },
            transferRevenue: {
              $sum: {
                $cond: [{ $in: ['$paymentMethod', ['momo', 'vnpay']] }, { $ifNull: ['$finalPrice', 0] }, 0],
              },
            },
          },
        },
      ],
      byCustomer: [
        {
          $group: {
            _id: '$userId',
            totalRevenue: { $sum: { $ifNull: ['$finalPrice', 0] } },
            bookingsCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 1,
            totalRevenue: 1,
            bookingsCount: 1,
            'user.name': 1,
            'user.email': 1,
            'user.phone': 1,
            'user.tier': 1,
          },
        },
        { $sort: { totalRevenue: -1 } },
      ],
      byPackage: [
        {
          $group: {
            _id: '$packageId',
            totalRevenue: { $sum: { $ifNull: ['$finalPrice', 0] } },
            bookingsCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'packages',
            localField: '_id',
            foreignField: '_id',
            as: 'package',
          },
        },
        { $unwind: '$package' },
        {
          $project: {
            _id: 1,
            totalRevenue: 1,
            bookingsCount: 1,
            'package.name': 1,
          },
        },
        { $sort: { totalRevenue: -1 } },
      ],
      byVehicle: [
        {
          $group: {
            _id: '$vehicleId',
            totalRevenue: { $sum: { $ifNull: ['$finalPrice', 0] } },
            bookingsCount: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'vehicles',
            localField: '_id',
            foreignField: '_id',
            as: 'vehicle',
          },
        },
        { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'users',
            localField: 'vehicle.userId',
            foreignField: '_id',
            as: 'vehicle.user',
          },
        },
        { $unwind: { path: '$vehicle.user', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            totalRevenue: 1,
            bookingsCount: 1,
            'vehicle.licensePlate': 1,
            'vehicle.brand': 1,
            'vehicle.model': 1,
            'vehicle.vehicleType': 1,
            'vehicle.userId': 1,
            'vehicle.user.name': 1,
            'vehicle.user.email': 1,
            'vehicle.user.phone': 1,
            'vehicle.user.tier': 1,
            'vehicle.user.loyaltyPoints': 1,
            'vehicle.user.walletBalance': 1,
            'vehicle.user.createdAt': 1,
          },
        },
        { $sort: { totalRevenue: -1 } },
      ],
      byVehicleType: [
        {
          $lookup: {
            from: 'vehicles',
            localField: 'vehicleId',
            foreignField: '_id',
            as: 'vehicleInfo',
          },
        },
        { $unwind: { path: '$vehicleInfo', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ['$vehicleInfo.vehicleType', 'unknown'] },
            totalRevenue: { $sum: { $ifNull: ['$finalPrice', 0] } },
            bookingsCount: { $sum: 1 },
          },
        },
        { $sort: { totalRevenue: -1 } },
      ],
    },
  };
}

function buildBranchMatch(filters, userRole, userBranchId) {
  const match = {};
  if (userRole === 'manager') {
    if (userBranchId) match.branchId = new mongoose.Types.ObjectId(userBranchId);
  } else if (filters.branchIds) {
    const ids = filters.branchIds.split(',').filter(Boolean).map(id => new mongoose.Types.ObjectId(id.trim()));
    if (ids.length > 0) match.branchId = { $in: ids };
  } else if (filters.branchId) {
    match.branchId = new mongoose.Types.ObjectId(filters.branchId);
  }
  return match;
}

function buildDateMatch(filters) {
  const match = {};
  if (filters.startDate || filters.endDate) {
    match.createdAt = {};
    if (filters.startDate) match.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) match.createdAt.$lte = new Date(filters.endDate);
  }
  return match;
}

exports.getRevenueTrends = async (filters, userRole, userBranchId) => {
  const matchStage = {
    paymentStatus: 'paid',
    ...buildBranchMatch(filters, userRole, userBranchId),
    ...buildDateMatch(filters),
  };

  const groupBy = filters.groupBy || 'day';
  let dateGroup;
  if (groupBy === 'month') {
    dateGroup = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
  } else if (groupBy === 'week') {
    dateGroup = { $dateToString: { format: '%G-W%V', date: '$createdAt' } };
  } else {
    dateGroup = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: dateGroup,
        revenue: { $sum: { $ifNull: ['$finalPrice', 0] } },
        bookingsCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        revenue: 1,
        bookingsCount: 1,
      },
    },
  ];

  return Booking.aggregate(pipeline);
};

exports.getBookingStats = async (filters, userRole, userBranchId) => {
  const matchStage = {
    ...buildBranchMatch(filters, userRole, userBranchId),
    ...buildDateMatch(filters),
  };

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ];

  const result = await Booking.aggregate(pipeline);
  const total = result.reduce((s, r) => s + r.count, 0);
  return { stats: result, total };
};

exports.getRevenueByBranch = async (filters, userRole, userBranchId) => {
  if (userRole === 'manager' && userBranchId) {
    return { branchRevenue: [] };
  }

  const matchStage = {
    paymentStatus: 'paid',
    ...buildDateMatch(filters),
  };

  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: 'branches',
        localField: 'branchId',
        foreignField: '_id',
        as: 'branch',
      },
    },
    { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$branchId',
        branchName: { $first: '$branch.name' },
        revenue: { $sum: { $ifNull: ['$finalPrice', 0] } },
        bookingsCount: { $sum: 1 },
      },
    },
    { $sort: { revenue: -1 } },
    {
      $project: {
        _id: 0,
        branchId: '$_id',
        branchName: 1,
        revenue: 1,
        bookingsCount: 1,
      },
    },
  ];

  const branchRevenue = await Booking.aggregate(pipeline);
  return { branchRevenue };
};
