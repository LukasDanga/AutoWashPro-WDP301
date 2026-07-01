const { Package } = require('../models');

exports.createPackage = async (data) => {
  const pkg = new Package(data);
  await pkg.save();
  return pkg;
};

exports.getAllPackages = async (filters = {}) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.branchId) query.branchId = filters.branchId;
  if (filters.search) {
    query.name = { $regex: filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 9));
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Package.find(query).sort({ price: 1 }).skip(skip).limit(limit),
    Package.countDocuments(query),
  ]);
  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
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
