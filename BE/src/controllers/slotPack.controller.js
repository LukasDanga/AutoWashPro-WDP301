const slotPackService = require('../services/slotPack.service');
const paymentService = require('../services/payment.service');
const vnpayService = require('../services/vnpay.service');
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

/** GET /api/slot-packs — Admin/Manager xem tất cả gói (search + pagination) */
exports.getAllSlotPacks = catchAsync(async (req, res) => {
  const result = await slotPackService.getAllSlotPacks(req.query, req.user.role, req.user.branchId);
  success(res, result.data, 'All slot packs retrieved', 200, {
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
  });
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

/** POST /api/slot-packs/:id/refund-complete — Xác nhận hoàn tiền gói */
exports.refundComplete = catchAsync(async (req, res) => {
  const SlotPack = require('../models/slotPack.schema');
  const pack = await SlotPack.findById(req.params.id);
  
  if (!pack) {
    throw Object.assign(new Error('Gói lượt không tồn tại'), { statusCode: 404 });
  }
  if (pack.refundStatus !== 'pending') {
    throw Object.assign(new Error('Gói lượt này không chờ hoàn tiền'), { statusCode: 400 });
  }
  
  pack.refundStatus = 'completed';
  await pack.save();
  
  success(res, pack, 'Đã xác nhận hoàn tiền thành công');
});

/** GET /api/slot-packs/usage-history — Lịch sử sử dụng gói lượt (admin/manager) */
exports.getUsageHistory = catchAsync(async (req, res) => {
  const result = await slotPackService.getUsageHistory(req.query, req.user.role, req.user.branchId);
  success(res, result.data, 'Usage history retrieved', 200, {
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
  });
});

/** GET /api/slot-packs/:id/usage-history — Lịch sử sử dụng của 1 gói cụ thể */
exports.getSlotPackUsageHistory = catchAsync(async (req, res) => {
  const filters = { ...req.query, slotPackId: req.params.id };
  if (req.user.role === 'customer') {
    filters.userId = req.userId;
  }
  const result = await slotPackService.getUsageHistory(
    filters,
    req.user.role,
    req.user.branchId,
  );
  success(res, result.data, 'Slot pack usage history retrieved', 200, {
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
  });
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

/** POST /api/slot-packs/:id/pay — Tạo thanh toán cho gói slot */
exports.paySlotPack = catchAsync(async (req, res) => {
  const { method } = req.body;
  const slotPackId = req.params.id;

  if (!['bank', 'vnpay', 'wallet'].includes(method)) {
    return res.status(400).json({ success: false, message: 'Phương thức thanh toán không hợp lệ' });
  }

  const payment = await paymentService.createSlotPackPayment(slotPackId, req.userId, method);

  if (method === 'wallet') {
    // Auto-confirm wallet payment immediately
    const confirmed = await paymentService.confirmPaymentCallback(payment.transactionId, 'WALLET', true);
    return success(res, confirmed, 'Thanh toán ví thành công', 201);
  }

  if (method === 'vnpay') {
    const ipAddr = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
    const vnpayUrl = vnpayService.createPaymentUrl({
      amount: payment.amount,
      ipAddr,
      txnRef: payment.transactionId,
    });
    return success(res, { paymentUrl: vnpayUrl, transactionId: payment.transactionId, payment }, 'VNPay URL created');
  }

  const result = payment.toObject ? payment.toObject() : { ...payment };
  result.bankInfo = {
    bankName: 'Ngân hàng TMCP Quân đội (MB)',
    bankId: process.env.SEPAY_BANK_ID || 'MB',
    accountNumber: process.env.SEPAY_BANK_ACCOUNT || '',
    accountHolder: 'CONG TY CO PHAN AUTO WASH PRO',
    transferContent: `THANH TOAN ${payment.transactionId}`,
  };
  success(res, result, 'Payment created');
});

/** GET /api/slot-packs/:id/payment — Kiểm tra trạng thái thanh toán */
exports.getSlotPackPayment = catchAsync(async (req, res) => {
  const payment = await paymentService.getPaymentBySlotPack(req.params.id);
  success(res, payment);
});
