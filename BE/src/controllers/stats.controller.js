const statsService = require('../services/stats.service');
const { catchAsync, success } = require('../utils/helpers');

exports.getPublicStats = catchAsync(async (req, res) => {
  const stats = await statsService.getPublicStats();
  success(res, stats, 'Stats retrieved');
});
