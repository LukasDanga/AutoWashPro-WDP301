const slotProductService = require('../services/slotProduct.service');
const { catchAsync, success } = require('../utils/helpers');

exports.getPublicSlotProducts = catchAsync(async (req, res) => {
  const products = await slotProductService.getPublicSlotProducts();
  success(res, products, 'Slot products retrieved');
});
