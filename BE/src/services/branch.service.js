const { Branch, User, Booking, SlotPack, Package, Voucher } = require('../models');

exports.createBranch = async (data) => {
  if (data.managerId) {
    const manager = await User.findById(data.managerId);
    if (!manager) throw Object.assign(new Error('Manager not found'), { statusCode: 404, code: 'USER_NOT_FOUND' });
    if (manager.role !== 'manager') throw Object.assign(new Error('Selected manager must have manager role'), { statusCode: 400, code: 'INVALID_MANAGER_ROLE' });
  }
  const branch = new Branch(data);
  await branch.save();
  return Branch.findById(branch._id).populate('managerId', 'name email phone status');
};

exports.getAllBranches = async (filters = {}, user) => {
  const query = { isDeleted: { $ne: true } };
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

  return Branch.find(query).populate('managerId', 'name email phone status').sort({ createdAt: -1 });
};

exports.getBranchById = async (id, userRole, userId) => {
  const branch = await Branch.findOne({ _id: id, isDeleted: { $ne: true } }).populate('managerId', 'name email phone status');
  if (!branch) throw Object.assign(new Error('Branch not found'), { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
  if (userRole === 'manager' && String(branch.managerId?._id || branch.managerId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  return branch;
};

exports.getPublicBranchById = async (id) => {
  const branch = await Branch.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!branch) throw Object.assign(new Error('Branch not found'), { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
  return branch;
};

exports.updateBranch = async (id, updates, userRole, userId) => {
  const branch = await Branch.findOne({ _id: id, isDeleted: { $ne: true } });
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
  const updated = await Branch.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).populate('managerId', 'name email phone status');
  try {
    const sseService = require('./sse.service');
    sseService.broadcastToAll('branch_sort_order_updated', {
      branchId: String(updated._id),
      packageSortOrder: updated.packageSortOrder,
    });
  } catch (e) {
    console.error('SSE broadcast error on updateBranch:', e);
  }
  return updated;
};

exports.deleteBranch = async (id) => {
  const branch = await Branch.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!branch) throw Object.assign(new Error('Branch not found'), { statusCode: 404, code: 'BRANCH_NOT_FOUND' });

  // Lấy danh sách tất cả các gói dịch vụ thuộc chi nhánh
  const branchPackages = await Package.find({ branchId: id, isDeleted: { $ne: true } }).select('_id name');
  const packageIds = branchPackages.map((p) => p._id);

  // 1. Ràng buộc: Kiểm tra xem chi nhánh có liên kết dữ liệu đang được khách hàng sử dụng hay không
  const [activeBookingCount, activeSlotPackCount, usedPackageBookingsCount, activeVouchersCount] = await Promise.all([
    // Lịch đặt chưa hoàn thành tại chi nhánh
    Booking.countDocuments({
      branchId: id,
      status: { $in: ['pending', 'confirmed', 'checked_in', 'in_progress'] },
    }),
    // Gói lượt còn hiệu lực tại chi nhánh
    SlotPack.countDocuments({
      branchId: id,
      status: 'active',
    }),
    // Các gói dịch vụ của chi nhánh đang được gắn trong đơn đặt lịch chưa hủy
    packageIds.length > 0
      ? Booking.countDocuments({ packageId: { $in: packageIds }, status: { $ne: 'cancelled' } })
      : 0,
    // Voucher đang hoạt động áp dụng riêng hoặc chung cho chi nhánh
    Voucher.countDocuments({
      $or: [{ branchId: id }, { applicableBranches: id }],
      isDeleted: { $ne: true },
      status: 'active',
    }),
  ]);

  if (activeBookingCount > 0 || activeSlotPackCount > 0 || usedPackageBookingsCount > 0 || activeVouchersCount > 0) {
    const reasons = [];
    if (activeBookingCount > 0) reasons.push(`${activeBookingCount} lịch đặt chưa hoàn thành`);
    if (activeSlotPackCount > 0) reasons.push(`${activeSlotPackCount} gói lượt còn hiệu lực`);
    if (usedPackageBookingsCount > 0) reasons.push(`${usedPackageBookingsCount} đơn đặt lịch gắn với các gói của chi nhánh`);
    if (activeVouchersCount > 0) reasons.push(`${activeVouchersCount} voucher/mã ưu đãi đang hoạt động`);

    const err = new Error(
      `Không thể xóa chi nhánh "${branch.name}" vì đang có dữ liệu liên kết đang hoạt động (${reasons.join(', ')}). Bạn vui lòng chuyển trạng thái chi nhánh sang "Ngừng hoạt động" để ngưng tiếp nhận đặt lịch mới mà vẫn bảo toàn dữ liệu.`
    );
    err.statusCode = 400;
    err.code = 'BRANCH_IN_USE';
    throw err;
  }

  // 2. Dọn dẹp liên kết an toàn (Cascade cleanup):
  await Promise.all([
    // Đánh dấu xóa mềm chi nhánh
    Branch.findByIdAndUpdate(id, { isDeleted: true, status: 'inactive', deletedAt: new Date() }),

    // Vô hiệu hóa/Xóa mềm các gói dịch vụ thuộc chi nhánh này
    Package.updateMany({ branchId: id }, { isDeleted: true, status: 'inactive', deletedAt: new Date() }),

    // Vô hiệu hóa/Xóa mềm các voucher dành riêng cho chi nhánh này
    Voucher.updateMany({ branchId: id }, { isDeleted: true, status: 'inactive', deletedAt: new Date() }),

    // Loại bỏ chi nhánh khỏi danh sách áp dụng của các voucher toàn hệ thống
    Voucher.updateMany({}, { $pull: { applicableBranches: id } }),

    // Gỡ liên kết chi nhánh khỏi Quản lý (User role manager)
    User.updateMany({ branchId: id }, { $unset: { branchId: 1 } }),
    ...(branch.managerId ? [User.findByIdAndUpdate(branch.managerId, { $unset: { branchId: 1 } })] : []),
  ]);

  return branch;
};

exports.updateStatus = async (id, status, userRole, userId) => {
  const branch = await Branch.findOne({ _id: id, isDeleted: { $ne: true } });
  if (!branch) throw Object.assign(new Error('Branch not found'), { statusCode: 404, code: 'BRANCH_NOT_FOUND' });
  if (userRole === 'manager' && String(branch.managerId) !== String(userId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  const updated = await Branch.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
  return updated;
};
