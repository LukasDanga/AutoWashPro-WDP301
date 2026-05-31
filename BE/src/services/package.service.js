const { Package } = require('../models');

exports.createPackage = async (data) => {
  const pkg = new Package(data);
  await pkg.save();
  return pkg;
};

exports.getAllPackages = async (filters = {}) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  return Package.find(query).sort({ price: 1 });
};

exports.getPackageById = async (id) => {
  const pkg = await Package.findById(id);
  if (!pkg) throw Object.assign(new Error('Package not found'), { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });
  return pkg;
};

exports.updatePackage = async (id, updates) => {
  const pkg = await Package.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  if (!pkg) throw Object.assign(new Error('Package not found'), { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });
  return pkg;
};

exports.deletePackage = async (id) => {
  const pkg = await Package.findByIdAndDelete(id);
  if (!pkg) throw Object.assign(new Error('Package not found'), { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });
  return pkg;
};
