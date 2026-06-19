const giftService = require('../services/gift.service');
const { catchAsync, success } = require('../utils/helpers');

exports.getPublicGifts = catchAsync(async (req, res) => {
  const gifts = await giftService.getPublicGifts();
  success(res, gifts, 'Gifts retrieved');
});
