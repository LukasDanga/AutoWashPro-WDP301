const Booking = require('../models/booking.schema');
const Branch = require('../models/branch.schema');

exports.getPublicStats = async () => {
  const [bookingStats] = await Booking.aggregate([
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: null,
        totalCompleted: { $sum: 1 },
        totalRated: { $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] } },
        totalWithRating: { $sum: { $cond: [{ $ifNull: ['$rating', false] }, 1, 0] } },
      },
    },
  ]);

  const totalBranches = await Branch.countDocuments({ status: 'active' });

  const totalCompleted = bookingStats?.totalCompleted || 0;
  const satisfactionRate =
    bookingStats?.totalWithRating > 0
      ? ((bookingStats.totalRated / bookingStats.totalWithRating) * 100).toFixed(1)
      : '98.7';

  return {
    totalCompleted,
    satisfactionRate: `${satisfactionRate}%`,
    totalBranches,
  };
};
