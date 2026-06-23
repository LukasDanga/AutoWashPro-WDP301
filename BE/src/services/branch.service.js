const { Branch, User } = require('../models');

exports.createBranch = async (data) => {
  if (data.managerId) {
    const manager = await User.findById(data.managerId);
    if (!manager) throw Object.assign(new Error('Manager not found'), { statusCode: 404, code: 'USER_NOT_FOUND' });
    if (manager.role !== 'manager') throw Object.assign(new Error('Selected manager must have manager role'), { statusCode: 400, code: 'INVALID_MANAGER_ROLE' });
  }
  const branch = new Branch(data);
  await branch.save();
  return branch;
};

exports.getAllBranches = async (filters = {}, user) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { address: { $regex: filters.search, $options: 'i' } },
    ];
  }

  if (!user || user.role === 'customer') {
    query.status = 'active';
  } else if (user.role === 'manager') {
    query.managerId = user.id;
  }

  return Branch.find(query).sort({ createdAt: -1 });
};

exports.getBranchById = async (id, userRole, userId) => {
  const branch = await Branch.findById(id);
  if (!branch) throw Object.assign(new Error('Branch not found'), { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
  if (userRole === 'manager' && String(branch.managerId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  return branch;
};

exports.updateBranch = async (id, updates, userRole, userId) => {
  const branch = await Branch.findById(id);
  if (!branch) throw Object.assign(new Error('Branch not found'), { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
  if (userRole === 'manager' && String(branch.managerId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  if (updates.managerId && userRole !== 'admin') {
    delete updates.managerId;
  }
  if (updates.managerId) {
    const manager = await User.findById(updates.managerId);
    if (!manager) throw Object.assign(new Error('Manager not found'), { statusCode: 404, code: 'USER_NOT_FOUND' });
    if (manager.role !== 'manager') throw Object.assign(new Error('Selected manager must have manager role'), { statusCode: 400, code: 'INVALID_MANAGER_ROLE' });
  }
  const updated = await Branch.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  return updated;
};

exports.deleteBranch = async (id) => {
  const branch = await Branch.findByIdAndDelete(id);
  if (!branch) throw Object.assign(new Error('Branch not found'), { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
  return branch;
};

exports.updateStatus = async (id, status, userRole, userId) => {
  const branch = await Branch.findById(id);
  if (!branch) throw Object.assign(new Error('Branch not found'), { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
  if (userRole === 'manager' && String(branch.managerId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  const updated = await Branch.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
  return updated;
};
