const { Package } = require('../models');

exports.createPackage = async (data) => {
  const pkg = new Package(data);
  await pkg.save();
  return pkg;
};

exports.getAllPackages = async (filters = {}) => {
  const query = { isDeleted: { $ne: true } };
  if (filters.status) query.status = filters.status;
  if (filters.branchId) query.branchId = filters.branchId;
  if (filters.category) query.category = filters.category;
  if (filters.search) {
    query.name = { $regex: filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }
  // `limit=all` (or 0) means "no pagination" — used by mobile booking flow
  // which renders a small bounded list and we want the FULL catalog.
  const wantAll = filters.limit === 'all' || filters.limit === 0 || filters.limit === '0';
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = wantAll ? 0 : Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 9));
  const skip = wantAll ? 0 : (page - 1) * limit;
  const find = Package.find(query).sort({ price: 1 });
  if (skip) find.skip(skip);
  if (limit) find.limit(limit);
  const [data, total] = await Promise.all([
    find,
    Package.countDocuments(query),
  ]);
  return { data, pagination: { page, limit: limit || total, total, totalPages: wantAll ? 1 : Math.ceil(total / limit) } };
};

exports.getPackageById = async (id, userRole, userBranchId) => {
  const pkg = await Package.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!pkg) throw Object.assign(new Error('Package not found'), { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });
  if (userRole === 'manager' && pkg.branchId && String(pkg.branchId) !== String(userBranchId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  return pkg;
};

exports.updatePackage = async (id, updates, userRole, userBranchId) => {
  const pkg = await Package.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!pkg) throw Object.assign(new Error('Package not found'), { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });
  if (userRole === 'manager' && pkg.branchId && String(pkg.branchId) !== String(userBranchId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  const updated = await Package.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  return updated;
};

exports.deletePackage = async (id, userRole, userBranchId) => {
  const pkg = await Package.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!pkg) throw Object.assign(new Error('Package not found'), { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });
  if (userRole === 'manager' && pkg.branchId && String(pkg.branchId) !== String(userBranchId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  await Package.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() });
  return pkg;
};
