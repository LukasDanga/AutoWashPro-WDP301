const reportService = require('../services/report.service');
const { catchAsync, success } = require('../utils/helpers');

exports.getRevenueReport = catchAsync(async (req, res) => {
  const data = await reportService.getRevenueReport(req.query, req.user.role, req.user.branchId);
  success(res, data, 'Đã lấy báo cáo doanh thu');
});

exports.getRevenueTrends = catchAsync(async (req, res) => {
  const data = await reportService.getRevenueTrends(req.query, req.user.role, req.user.branchId);
  success(res, data, 'Đã lấy xu hướng doanh thu');
});

exports.getBookingStats = catchAsync(async (req, res) => {
  const data = await reportService.getBookingStats(req.query, req.user.role, req.user.branchId);
  success(res, data, 'Đã lấy thống kê đặt lịch');
});

exports.getRevenueByBranch = catchAsync(async (req, res) => {
  const data = await reportService.getRevenueByBranch(req.query, req.user.role, req.user.branchId);
  success(res, data, 'Đã lấy doanh thu theo chi nhánh');
});
