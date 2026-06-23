const packageService = require('../services/package.service');
const { catchAsync, success } = require('../utils/helpers');

exports.createPackage = catchAsync(async (req, res) => {
  const data = { ...req.body };
  if (req.user.role === 'manager') {
    data.branchId = req.user.branchId;
  }
  const pkg = await packageService.createPackage(data);
  success(res, pkg, 'Package created', 201);
});

exports.getAllPackages = catchAsync(async (req, res) => {
  const packages = await packageService.getAllPackages(req.query);
  success(res, packages, 'Packages retrieved');
});

exports.getPackageById = catchAsync(async (req, res) => {
  const pkg = await packageService.getPackageById(req.params.id, req.user.role, req.user.branchId);
  success(res, pkg, 'Package retrieved');
});

exports.updatePackage = catchAsync(async (req, res) => {
  const pkg = await packageService.updatePackage(req.params.id, req.body, req.user.role, req.user.branchId);
  success(res, pkg, 'Package updated');
});

exports.deletePackage = catchAsync(async (req, res) => {
  await packageService.deletePackage(req.params.id, req.user.role, req.user.branchId);
  success(res, null, 'Package deleted');
});
