const voucherService = require('../services/voucher.service');
const { catchAsync, success } = require('../utils/helpers');

exports.createVoucher = catchAsync(async (req, res) => {
  const branchId = req.user.role === 'manager' ? req.user.branchId : req.body.branchId;
  if (req.user.role === 'manager' && !branchId) {
    throw Object.assign(new Error('Manager must have a branch assigned'), { statusCode: 400, code: 'MANAGER_NO_BRANCH' });
  }
  const voucher = await voucherService.createVoucher({ ...req.body, createdBy: req.userId, branchId });
  success(res, voucher, 'Voucher created', 201);
});

exports.getAllVouchers = catchAsync(async (req, res) => {
  const result = await voucherService.getAllVouchers(req.query, req.user.role, req.userId, req.user.branchId);
  success(res, result.data, 'Vouchers retrieved', 200, result.pagination);
});

exports.getVoucherById = catchAsync(async (req, res) => {
  const voucher = await voucherService.getVoucherById(req.params.id, req.user.role, req.userId, req.user.branchId);
  success(res, voucher, 'Voucher retrieved');
});

exports.getPublicVouchersByBranch = catchAsync(async (req, res) => {
  const vouchers = await voucherService.getPublicVouchersByBranch(req.query.branchId);
  success(res, vouchers, 'Vouchers retrieved');
});

exports.getVoucherByCode = catchAsync(async (req, res) => {
  const voucher = await voucherService.getVoucherByCode(req.params.code, req.query.branchId);
  success(res, voucher, 'Voucher retrieved');
});

exports.updateVoucher = catchAsync(async (req, res) => {
  const voucher = await voucherService.updateVoucher(req.params.id, req.body, req.user.role, req.userId, req.user.branchId);
  success(res, voucher, 'Voucher updated');
});

exports.deleteVoucher = catchAsync(async (req, res) => {
  await voucherService.deleteVoucher(req.params.id, req.user.role, req.userId, req.user.branchId);
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
  const result = await voucherService.getVoucherUsage(req.params.id, req.query);
  success(res, result.data, 'Voucher usage retrieved', 200, result.pagination);
});

exports.getVoucherUsageReport = catchAsync(async (req, res) => {
  const report = await voucherService.getVoucherUsageReport(req.query);
  success(res, report, 'Voucher usage report retrieved successfully');
});

exports.getUserVouchers = catchAsync(async (req, res) => {
  const vouchers = await voucherService.getUserVouchers(req.userId);
  success(res, vouchers, 'User vouchers retrieved');
});

exports.getAvailableVouchers = catchAsync(async (req, res) => {
  const result = await voucherService.getAvailableVouchersForUser(req.userId, req.query.branchId, req.query);
  success(res, result, 'Available vouchers retrieved');
});

exports.redeemPoints = catchAsync(async (req, res) => {
  const { templateId } = req.body;
  if (!templateId) throw Object.assign(new Error('Voucher template ID is required'), { statusCode: 400 });
  
  const userVoucher = await voucherService.redeemPointsForVoucher(templateId, req.userId);
  success(res, userVoucher, 'Points redeemed successfully for voucher', 201);
});
