const branchService = require('../services/branch.service');
const { catchAsync, success } = require('../utils/helpers');

exports.createBranch = catchAsync(async (req, res) => {
  const branch = await branchService.createBranch(req.body);
  success(res, branch, 'Tạo chi nhánh thành công', 201);
});

exports.getAllBranches = catchAsync(async (req, res) => {
  const branches = await branchService.getAllBranches(req.query, req.user);
  success(res, branches, 'Đã lấy danh sách chi nhánh');
});

exports.getPublicBranches = catchAsync(async (req, res) => {
  const branches = await branchService.getAllBranches({ status: 'active' }, null);
  success(res, branches, 'Đã lấy danh sách chi nhánh');
});

exports.getPublicBranchById = catchAsync(async (req, res) => {
  const branch = await branchService.getPublicBranchById(req.params.id);
  success(res, branch, 'Đã lấy thông tin chi nhánh');
});

exports.getBranchById = catchAsync(async (req, res) => {
  const branch = await branchService.getBranchById(req.params.id, req.user.role, req.userId);
  success(res, branch, 'Đã lấy thông tin chi nhánh');
});

exports.updateBranch = catchAsync(async (req, res) => {
  const branch = await branchService.updateBranch(req.params.id, req.body, req.user.role, req.userId);
  success(res, branch, 'Cập nhật chi nhánh thành công');
});

exports.deleteBranch = catchAsync(async (req, res) => {
  await branchService.deleteBranch(req.params.id);
  success(res, null, 'Đã xóa chi nhánh');
});

exports.updateStatus = catchAsync(async (req, res) => {
  const branch = await branchService.updateStatus(req.params.id, req.body.status, req.user.role, req.userId);
  success(res, branch, 'Cập nhật trạng thái chi nhánh thành công');
});
