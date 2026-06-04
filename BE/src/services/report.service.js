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
  } else if (filters.branchId) {
    matchStage.branchId = new mongoose.Types.ObjectId(filters.branchId);
  }

  if (filters.startDate || filters.endDate) {
    matchStage.createdAt = {};
    if (filters.startDate) matchStage.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) matchStage.createdAt.$lte = new Date(filters.endDate);
  }

  const pipeline = [
    { $match: matchStage },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: { $ifNull: ['$finalPrice', 0] } },
              totalBookings: { $sum: 1 },
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
      },
    },
  ];

  const result = await Booking.aggregate(pipeline);

  const data = result[0];
  const totals = data.totals[0] || { totalRevenue: 0, totalBookings: 0 };

  return {
    totalRevenue: totals.totalRevenue,
    totalBookings: totals.totalBookings,
    byCustomer: data.byCustomer,
    byPackage: data.byPackage,
  };
};
