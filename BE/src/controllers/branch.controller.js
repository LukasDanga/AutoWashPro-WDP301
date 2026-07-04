const branchService = require('../services/branch.service');
const { catchAsync, success } = require('../utils/helpers');

exports.createBranch = catchAsync(async (req, res) => {
  const branch = await branchService.createBranch(req.body);
  success(res, branch, 'Branch created', 201);
});

exports.getAllBranches = catchAsync(async (req, res) => {
  const branches = await branchService.getAllBranches(req.query, req.user);
  success(res, branches, 'Branches retrieved');
});

exports.getPublicBranches = catchAsync(async (req, res) => {
  const branches = await branchService.getAllBranches({ status: 'active' }, null);
  success(res, branches, 'Branches retrieved');
});

exports.getPublicBranchById = catchAsync(async (req, res) => {
  const branch = await branchService.getPublicBranchById(req.params.id);
  success(res, branch, 'Branch retrieved');
});

exports.getBranchById = catchAsync(async (req, res) => {
  const branch = await branchService.getBranchById(req.params.id, req.user.role, req.userId);
  success(res, branch, 'Branch retrieved');
});

exports.updateBranch = catchAsync(async (req, res) => {
  const branch = await branchService.updateBranch(req.params.id, req.body, req.user.role, req.userId);
  success(res, branch, 'Branch updated');
});

exports.deleteBranch = catchAsync(async (req, res) => {
  await branchService.deleteBranch(req.params.id);
  success(res, null, 'Branch deleted');
});

exports.updateStatus = catchAsync(async (req, res) => {
  const branch = await branchService.updateStatus(req.params.id, req.body.status, req.user.role, req.userId);
  success(res, branch, 'Branch status updated');
});
