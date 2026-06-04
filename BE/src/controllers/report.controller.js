const reportService = require('../services/report.service');
const { catchAsync, success } = require('../utils/helpers');

exports.getRevenueReport = catchAsync(async (req, res) => {
  const data = await reportService.getRevenueReport(req.query, req.user.role, req.user.branchId);
  success(res, data, 'Revenue report retrieved successfully');
});
