const reportService = require('../services/report.service');
const { catchAsync, success } = require('../utils/helpers');

exports.getRevenueReport = catchAsync(async (req, res) => {
  const data = await reportService.getRevenueReport(req.query, req.user.role, req.user.branchId);
  success(res, data, 'Revenue report retrieved successfully');
});

exports.getRevenueTrends = catchAsync(async (req, res) => {
  const data = await reportService.getRevenueTrends(req.query, req.user.role, req.user.branchId);
  success(res, data, 'Revenue trends retrieved');
});

exports.getBookingStats = catchAsync(async (req, res) => {
  const data = await reportService.getBookingStats(req.query, req.user.role, req.user.branchId);
  success(res, data, 'Booking stats retrieved');
});

exports.getRevenueByBranch = catchAsync(async (req, res) => {
  const data = await reportService.getRevenueByBranch(req.query, req.user.role, req.user.branchId);
  success(res, data, 'Revenue by branch retrieved');
});
