const { Package } = require('../models');

exports.createPackage = async (data) => {
  const pkg = new Package(data);
  await pkg.save();
  return pkg;
};

exports.getAllPackages = async (filters = {}) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.name) query.name = { $regex: filters.name, $options: 'i' };
  if (filters.branchId) query.branchId = filters.branchId;
  return Package.find(query).sort({ price: 1 });
};

exports.getPackageById = async (id, userRole, userBranchId) => {
  const pkg = await Package.findById(id);
  if (!pkg) throw Object.assign(new Error('Package not found'), { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });
  if (userRole === 'manager' && pkg.branchId && String(pkg.branchId) !== String(userBranchId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  return pkg;
};

exports.updatePackage = async (id, updates, userRole, userBranchId) => {
  const pkg = await Package.findById(id);
  if (!pkg) throw Object.assign(new Error('Package not found'), { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });
  if (userRole === 'manager' && pkg.branchId && String(pkg.branchId) !== String(userBranchId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  const updated = await Package.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  return updated;
};

exports.deletePackage = async (id, userRole, userBranchId) => {
  const pkg = await Package.findById(id);
  if (!pkg) throw Object.assign(new Error('Package not found'), { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });
  if (userRole === 'manager' && pkg.branchId && String(pkg.branchId) !== String(userBranchId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  await Package.findByIdAndDelete(id);
  return pkg;
};
