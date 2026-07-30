const giftService = require('../services/gift.service');
const { catchAsync, success } = require('../utils/helpers');

exports.getPublicGifts = catchAsync(async (req, res) => {
  const gifts = await giftService.getPublicGifts();
  success(res, gifts, 'Gifts retrieved');
});

exports.getAllGifts = catchAsync(async (req, res) => {
  const gifts = await giftService.getAllGifts();
  success(res, gifts, 'All gifts retrieved');
});

exports.createGift = catchAsync(async (req, res) => {
  const gift = await giftService.createGift(req.body);
  success(res, gift, 'Gift created', 201);
});

exports.updateGift = catchAsync(async (req, res) => {
  const gift = await giftService.updateGift(req.params.id, req.body);
  success(res, gift, 'Gift updated');
});

exports.deleteGift = catchAsync(async (req, res) => {
  const gift = await giftService.deleteGift(req.params.id);
  success(res, gift, 'Gift deleted');
});

exports.spinWheel = catchAsync(async (req, res) => {
  const result = await giftService.spinWheel(req.user._id);
  success(res, result, 'Spin successful');
});

exports.getMySpinHistory = catchAsync(async (req, res) => {
  const history = await giftService.getMySpinHistory(req.userId || req.user?._id);
  success(res, history, 'Đã lấy lịch sử trúng quà');
});
