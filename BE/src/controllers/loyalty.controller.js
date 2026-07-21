const loyaltyService = require('../services/loyalty.service');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getTiers = catchAsync(async (req, res, next) => {
  const tiers = loyaltyService.getTierConfig();
  res.status(200).json({
    status: 'success',
    data: tiers
  });
});
