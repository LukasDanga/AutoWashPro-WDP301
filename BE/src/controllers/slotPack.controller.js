const slotPackService = require('../services/slotPack.service');
const { catchAsync, success } = require('../utils/helpers');
const { ROLES } = require('../config/permissions');

/** POST /api/slot-packs — Khách tạo gói slot mới */
exports.createSlotPack = catchAsync(async (req, res) => {
  const slotPack = await slotPackService.createSlotPack({ ...req.body, userId: req.userId });
  success(res, slotPack, 'Slot pack created', 201);
});

/** GET /api/slot-packs/my — Khách xem gói của mình */
exports.getMySlotPacks = catchAsync(async (req, res) => {
  const packs = await slotPackService.getMySlotPacks(req.userId, req.query);
  success(res, packs, 'Slot packs retrieved');
});

/** GET /api/slot-packs — Admin/Manager xem tất cả gói */
exports.getAllSlotPacks = catchAsync(async (req, res) => {
  const packs = await slotPackService.getAllSlotPacks(req.query, req.user.role, req.user.branchId);
  success(res, packs, 'All slot packs retrieved');
});

/** GET /api/slot-packs/:id — Chi tiết 1 gói */
exports.getSlotPackById = catchAsync(async (req, res) => {
  const pack = await slotPackService.getSlotPackById(req.params.id, req.userId, req.user.role);
  success(res, pack, 'Slot pack retrieved');
});

/** GET /api/slot-packs/code/:code — Lookup bằng mã (manager checkin) */
exports.getSlotPackByCode = catchAsync(async (req, res) => {
  const pack = await slotPackService.getSlotPackByCode(req.params.code, req.user.role, req.user.branchId);
  success(res, pack, 'Slot pack retrieved');
});

/** POST /api/slot-packs/:id/use — Manager dùng 1 slot khi khách đến */
exports.useSlot = catchAsync(async (req, res) => {
  const result = await slotPackService.useSlot(req.params.id, req.userId, req.body);
  success(res, result, 'Slot used successfully');
});

/** POST /api/slot-packs/:id/cancel — Hủy gói */
exports.cancelSlotPack = catchAsync(async (req, res) => {
  const pack = await slotPackService.cancelSlotPack(req.params.id, req.userId, req.user.role);
  success(res, pack, 'Slot pack cancelled');
});

/** GET /api/slot-packs/preview — Preview giá trước khi mua (không cần auth) */
exports.previewDiscount = catchAsync(async (req, res) => {
  const { totalSlots, unitPrice } = req.query;
  const slots = parseInt(totalSlots, 10);
  const price = parseFloat(unitPrice);
  if (!slots || !price) {
    return res.status(400).json({ message: 'totalSlots and unitPrice are required' });
  }
  const preview = slotPackService.previewDiscount(slots, price);
  success(res, preview, 'Preview calculated');
});
