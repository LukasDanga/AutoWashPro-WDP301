const packageService = require('../services/package.service');
const { catchAsync, success } = require('../utils/helpers');

exports.createPackage = catchAsync(async (req, res) => {
  const pkg = await packageService.createPackage(req.body);
  success(res, pkg, 'Package created', 201);
});

exports.getAllPackages = catchAsync(async (req, res) => {
  const packages = await packageService.getAllPackages(req.query);
  success(res, packages, 'Packages retrieved');
});

exports.getPackageById = catchAsync(async (req, res) => {
  const pkg = await packageService.getPackageById(req.params.id);
  success(res, pkg, 'Package retrieved');
});

exports.updatePackage = catchAsync(async (req, res) => {
  const pkg = await packageService.updatePackage(req.params.id, req.body);
  success(res, pkg, 'Package updated');
});

exports.deletePackage = catchAsync(async (req, res) => {
  await packageService.deletePackage(req.params.id);
  success(res, null, 'Package deleted');
});
