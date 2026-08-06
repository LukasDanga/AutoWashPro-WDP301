const { Package, Booking, SlotPack, Branch } = require('../models');

exports.createPackage = async (data) => {
  const pkg = new Package(data);
  await pkg.save();
  return pkg;
};

exports.getAllPackages = async (filters = {}) => {
  const query = {};
  if (filters.includeDeleted !== 'true' && filters.includeDeleted !== true) {
    query.isDeleted = { $ne: true };
  }
  if (filters.status) query.status = filters.status;
  if (filters.branchId) query.branchId = filters.branchId;
  if (filters.category) query.category = filters.category;
  if (filters.search) {
    query.name = { $regex: filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  let sortOrder = filters.sort;
  if (!sortOrder && filters.branchId) {
    const branch = await Branch.findById(filters.branchId).lean();
    if (branch?.packageSortOrder) {
      sortOrder = branch.packageSortOrder;
    }
  }

  const sort = {};
  if (sortOrder === 'price_asc') {
    sort.price = 1;
    sort.createdAt = -1;
  } else if (sortOrder === 'price_desc') {
    sort.price = -1;
    sort.createdAt = -1;
  } else if (sortOrder === 'booking_count') {
    sort.bookingCount = -1;
    sort.price = 1;
  } else {
    sort.price = 1;
    sort.createdAt = -1;
  }

  // `limit=all` (or 0) means "no pagination" — used by mobile booking flow
  // which renders a small bounded list and we want the FULL catalog.
  const wantAll = filters.limit === 'all' || filters.limit === 0 || filters.limit === '0';
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = wantAll ? 0 : Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 9));
  const skip = wantAll ? 0 : (page - 1) * limit;
  const find = Package.find(query).sort(sort);
  if (skip) find.skip(skip);
  if (limit) find.limit(limit);
  const [data, total] = await Promise.all([
    find,
    Package.countDocuments(query),
  ]);
  return { data, pagination: { page, limit: limit || total, total, totalPages: wantAll ? 1 : Math.ceil(total / limit) } };
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

exports.deletePackage = async (id, userRole, userBranchId, isHardDelete = false) => {
  const pkg = await Package.findById(id);
  if (!pkg) throw Object.assign(new Error('Package not found'), { statusCode: 404, code: 'PACKAGE_NOT_FOUND' });
  if (userRole === 'manager' && pkg.branchId && String(pkg.branchId) !== String(userBranchId)) {
    throw Object.assign(new Error('Not authorized'), { statusCode: 403, code: 'FORBIDDEN' });
  }

  if (isHardDelete) {
    // Ràng buộc xóa cứng: Kiểm tra xem gói đã từng được khách hàng đặt lịch hoặc mua gói lượt chưa
    const [bookingCount, slotPackCount] = await Promise.all([
      Booking.countDocuments({ packageId: id }),
      SlotPack.countDocuments({ packageId: id }),
    ]);

    if (bookingCount > 0 || slotPackCount > 0) {
      const usageDetails = [];
      if (bookingCount > 0) usageDetails.push(`${bookingCount} đơn đặt lịch`);
      if (slotPackCount > 0) usageDetails.push(`${slotPackCount} gói lượt`);

      const err = new Error(
        `Ràng buộc xóa cứng: Không thể xóa vĩnh viễn gói "${pkg.name}" vì đã được khách hàng sử dụng (${usageDetails.join(' và ')}). Vui lòng chọn "Xóa mềm" để bảo lưu lịch sử giao dịch.`
      );
      err.statusCode = 400;
      err.code = 'PACKAGE_IN_USE';
      throw err;
    }

    await Package.findByIdAndDelete(id);
    return { hardDeleted: true, id };
  }

  // Xóa mềm: Chuyển isDeleted = true và status = 'inactive' để bảo lưu dữ liệu lịch sử đặt xe / gói lượt
  const updated = await Package.findByIdAndUpdate(id, { isDeleted: true, status: 'inactive', deletedAt: new Date() }, { new: true });
  return updated;
};
