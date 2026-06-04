const voucherService = require('../services/voucher.service');
const { catchAsync, success } = require('../utils/helpers');

exports.createVoucher = catchAsync(async (req, res) => {
  const voucher = await voucherService.createVoucher({ ...req.body, createdBy: req.userId });
  success(res, voucher, 'Voucher created', 201);
});

exports.getAllVouchers = catchAsync(async (req, res) => {
  const vouchers = await voucherService.getAllVouchers(req.query);
  success(res, vouchers, 'Vouchers retrieved');
});

exports.getVoucherById = catchAsync(async (req, res) => {
  const voucher = await voucherService.getVoucherById(req.params.id);
  success(res, voucher, 'Voucher retrieved');
});

exports.getVoucherByCode = catchAsync(async (req, res) => {
  const voucher = await voucherService.getVoucherByCode(req.params.code);
  success(res, voucher, 'Voucher retrieved');
});

exports.updateVoucher = catchAsync(async (req, res) => {
  const voucher = await voucherService.updateVoucher(req.params.id, req.body);
  success(res, voucher, 'Voucher updated');
});

exports.deleteVoucher = catchAsync(async (req, res) => {
  await voucherService.deleteVoucher(req.params.id);
  success(res, null, 'Voucher deleted');
});

exports.validateVoucher = catchAsync(async (req, res) => {
  const { code, bookingData } = req.body;
  const result = await voucherService.validateVoucher(code, bookingData, req.userId);
  success(res, result, 'Voucher validated');
});

exports.reserveVoucher = catchAsync(async (req, res) => {
  const { code, bookingId, discountAmount } = req.body;
  const result = await voucherService.reserveVoucher(code, req.userId, bookingId, discountAmount || 0);
  success(res, result, 'Voucher reserved');
});

exports.rollbackVoucher = catchAsync(async (req, res) => {
  const { code, bookingId } = req.body;
  await voucherService.rollbackVoucher(code, req.userId, bookingId);
  success(res, null, 'Voucher reservation cancelled');
});

exports.getVoucherUsage = catchAsync(async (req, res) => {
  const usages = await voucherService.getVoucherUsage(req.params.id);
  success(res, usages, 'Voucher usage retrieved');
});

exports.getUserVouchers = catchAsync(async (req, res) => {
  const vouchers = await voucherService.getUserVouchers(req.userId);
  success(res, vouchers, 'User vouchers retrieved');
});

exports.getAvailableVouchers = catchAsync(async (req, res) => {
  const result = await voucherService.getAvailableVouchersForUser(req.userId);
  success(res, result, 'Available vouchers retrieved');
});

exports.redeemPoints = catchAsync(async (req, res) => {
  const { templateId } = req.body;
  if (!templateId) throw Object.assign(new Error('Voucher template ID is required'), { statusCode: 400 });
  
  const userVoucher = await voucherService.redeemPointsForVoucher(templateId, req.userId);
  success(res, userVoucher, 'Points redeemed successfully for voucher', 201);
});
