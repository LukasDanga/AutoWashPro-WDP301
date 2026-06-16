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

exports.getBranchById = async (id) => {
  const branch = await Branch.findById(id);
  if (!branch) throw Object.assign(new Error('Branch not found'), { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
  return branch;
};

exports.updateBranch = async (id, updates) => {
  if (updates.managerId) {
    const manager = await User.findById(updates.managerId);
    if (!manager) throw Object.assign(new Error('Manager not found'), { statusCode: 404, code: 'USER_NOT_FOUND' });
    if (manager.role !== 'manager') throw Object.assign(new Error('Selected manager must have manager role'), { statusCode: 400, code: 'INVALID_MANAGER_ROLE' });
  }
  const branch = await Branch.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  if (!branch) throw Object.assign(new Error('Branch not found'), { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
  return branch;
};

exports.deleteBranch = async (id) => {
  const branch = await Branch.findByIdAndDelete(id);
  if (!branch) throw Object.assign(new Error('Branch not found'), { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
  return branch;
};

exports.updateStatus = async (id, status) => {
  const branch = await Branch.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
  if (!branch) throw Object.assign(new Error('Branch not found'), { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
  return branch;
};
