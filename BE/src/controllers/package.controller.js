const packageService = require('../services/package.service');
const { catchAsync, success } = require('../utils/helpers');

exports.createPackage = catchAsync(async (req, res) => {
  const data = { ...req.body };
  if (req.user.role === 'manager') {
    data.branchId = req.user.branchId;
  }
  const pkg = await packageService.createPackage(data);
  success(res, pkg, 'Tạo gói dịch vụ thành công', 201);
});

exports.getAllPackages = catchAsync(async (req, res) => {
  const result = await packageService.getAllPackages(req.query);
  success(res, result.data, 'Đã lấy danh sách gói dịch vụ', 200, result.pagination);
});

exports.getPackageById = catchAsync(async (req, res) => {
  const pkg = await packageService.getPackageById(req.params.id, req.user.role, req.user.branchId);
  success(res, pkg, 'Đã lấy thông tin gói dịch vụ');
});

exports.updatePackage = catchAsync(async (req, res) => {
  const pkg = await packageService.updatePackage(req.params.id, req.body, req.user.role, req.user.branchId);
  success(res, pkg, 'Cập nhật gói dịch vụ thành công');
});

exports.deletePackage = catchAsync(async (req, res) => {
  await packageService.deletePackage(req.params.id, req.user.role, req.user.branchId);
  success(res, null, 'Đã xóa gói dịch vụ');
});
