
const loyaltyService = require('../services/loyalty.service');
const { catchAsync } = require('../utils/helpers');

exports.getTiers = catchAsync(async (req, res, next) => {
    const tiers = loyaltyService.getTierConfig();
    res.status(200).json({
        status: 'success',
        data: tiers
    });
});