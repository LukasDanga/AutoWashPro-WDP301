const mongoose = require('mongoose');

/**
 * SlotPack — Gói đặt trước N lần rửa xe
 *
 * Chiết khấu tự động theo số lượng:
 *   1-4 slot  →  0%  (giá gốc)
 *   5-9 slot  →  5%
 *   10-19     → 10%
 *   20+       → 15%
 *
 * Priority (ưu tiên phục vụ) ánh xạ từ tier khách hàng:
 *   bronze=1, silver=2, gold=3, diamond=4
 */
const slotPackSchema = new mongoose.Schema(
  {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
    branchId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },

    // Số lần mua khi tạo gói
    totalSlots:     { type: Number, required: true, min: 1, max: 50 },
    // Số lần còn lại (giảm dần mỗi lần dùng)
    remainingSlots: { type: Number, required: true, min: 0 },
    // Số lần đã dùng (totalSlots - remainingSlots)
    usedSlots:      { type: Number, default: 0, min: 0 },

    // Giá gốc / slot
    unitPrice: { type: Number, required: true, min: 0 },
    // % chiết khấu áp dụng (0, 5, 10, 15)
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    // Tiết kiệm được (đã tính)
    discountAmount: { type: Number, default: 0, min: 0 },
    // Tổng tiền sau chiết khấu
    finalPrice: { type: Number, required: true, min: 0 },

    // Voucher thêm (nếu có) áp dụng trên đầu chiết khấu số lượng
    voucherCode:        { type: String, trim: true, uppercase: true },
    voucherDiscount:    { type: Number, default: 0, min: 0 },
    finalPriceAfterVoucher: { type: Number, min: 0 },

    // Priority dựa theo tier của user khi mua
    priority: { type: Number, default: 1, min: 1, max: 4 },

    // Mã định danh duy nhất để checkin (VD: SP-A3X9F2)
    packCode: { type: String, required: true, unique: true, uppercase: true },

    // Hạn sử dụng (tùy chọn, null = không giới hạn)
    expiresAt: { type: Date },

    status: {
      type: String,
      enum: ['active', 'exhausted', 'expired', 'cancelled'],
      default: 'active',
    },

    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid',
    },
    refundStatus: {
      type: String,
      enum: ['none', 'pending', 'completed'],
      default: 'none',
    },
    refundAmount: { type: Number, default: 0 },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

slotPackSchema.index({ userId: 1 });
slotPackSchema.index({ branchId: 1 });

slotPackSchema.index({ status: 1 });
slotPackSchema.index({ userId: 1, status: 1 });

/**
 * Tính % chiết khấu theo số lượng slot.
 * Gọi trước khi tạo SlotPack.
 */
slotPackSchema.statics.getDiscountPercent = function (totalSlots) {
  if (totalSlots >= 20) return 15;
  if (totalSlots >= 10) return 10;
  if (totalSlots >= 5)  return 5;
  return 0;
};

module.exports = mongoose.model('SlotPack', slotPackSchema);
