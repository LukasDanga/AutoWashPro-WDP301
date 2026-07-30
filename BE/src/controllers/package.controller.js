const packageService = require('../services/package.service');
const { catchAsync, success } = require('../utils/helpers');

exports.getTemplateSubServices = catchAsync(async (req, res) => {
  const templates = {
    external: [
      { name: 'Phun bọt tuyết tự động', price: 0, duration: 5, isOptional: false },
      { name: 'Rửa vỏ xe chổi xoay', price: 0, duration: 10, isOptional: false },
      { name: 'Xịt rửa gầm áp lực cao', price: 0, duration: 5, isOptional: false },
      { name: 'Sấy khô & dưỡng lốp', price: 0, duration: 10, isOptional: false }
    ],
    internal: [
      { name: 'Hút bụi nội thất nhanh', price: 0, duration: 15, isOptional: false },
      { name: 'Lau chùi taplo & cửa', price: 0, duration: 10, isOptional: false },
      { name: 'Xịt khử mùi sinh học', price: 0, duration: 5, isOptional: false }
    ],
    full: [
      { name: 'Rửa ngoại thất tiêu chuẩn', price: 0, duration: 25, isOptional: false },
      { name: 'Vệ sinh nội thất tiêu chuẩn', price: 0, duration: 25, isOptional: false },
      { name: 'Khử mùi ozon', price: 0, duration: 10, isOptional: false }
    ]
  };
  success(res, templates, 'Lấy danh sách dịch vụ mặc định thành công', 200);
});

exports.createPackage = catchAsync(async (req, res) => {
  const data = { ...req.body };
  if (req.user.role === 'manager') {
    data.branchId = req.user.branchId;
  }
  const pkg = await packageService.createPackage(data);
  success(res, pkg, 'Tạo gói dịch vụ thành công', 201);
});

exports.getAllPackages = catchAsync(async (req, res) => {
  const result = await packageService.getAllPackages(req.query);
  success(res, result.data, 'Đã lấy danh sách gói dịch vụ', 200, result.pagination);
});

exports.getPackageById = catchAsync(async (req, res) => {
  const pkg = await packageService.getPackageById(req.params.id, req.user.role, req.user.branchId);
  success(res, pkg, 'Đã lấy thông tin gói dịch vụ');
});

exports.updatePackage = catchAsync(async (req, res) => {
  const pkg = await packageService.updatePackage(req.params.id, req.body, req.user.role, req.user.branchId);
  success(res, pkg, 'Cập nhật gói dịch vụ thành công');
});

exports.deletePackage = catchAsync(async (req, res) => {
  await packageService.deletePackage(req.params.id, req.user.role, req.user.branchId);
  success(res, null, 'Đã xóa gói dịch vụ');
});
