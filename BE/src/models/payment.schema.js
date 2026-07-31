const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    slotPackId: { type: mongoose.Schema.Types.ObjectId, ref: 'SlotPack' },
    // Snapshot tên/giá gói tại thời điểm thanh toán — tránh bị đổi theo giá hiện tại khi admin chỉnh giá gói
    packageName: { type: String, trim: true },
    packagePrice: { type: Number, min: 0 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['cash', 'momo', 'vnpay', 'bank', 'wallet'], required: true },
    // 'deposit' = tiền cọc trước, 'remaining' = phần còn lại khi hoàn thành, 'full' = trả 1 lần, 'topup' = nạp tiền vào ví
    paymentType: { type: String, enum: ['deposit', 'remaining', 'full', 'topup'], default: 'full' },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    transactionId: { type: String },
    paymentUrl: { type: String },
    qrCode: { type: String },
    paidAt: { type: Date },
    refundedAt: { type: Date },
    gatewayTransactionId: { type: String },
    failureReason: { type: String },
    retryCount: { type: Number, default: 0 },
    client: { type: String, enum: ['web', 'mobile'], default: 'web' },
    viewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ slotPackId: 1 });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ gatewayTransactionId: 1 });
// Ngăn một booking có nhiều payment đang 'pending' cùng lúc.
//
// LƯU Ý: partialFilterExpression của MongoDB CHỈ hỗ trợ một tập toán tử giới
// hạn (`$eq`, `$exists`, `$gt/$gte/$lt/$lte`, `$type`, `$and`, `$or`, `$in`).
// KHÔNG hỗ trợ `$ne`. Trước đây index dùng `{ bookingId: { $ne: null } }` nên
// build thất bại / thành unique thường, khiến các provisional payment
// (bookingId = null) đụng khóa và trả về E11000 "bookingId already exists".
//
// Dùng `{ $exists: true }` để chỉ áp ràng buộc unique cho payment có bookingId
// và đang 'pending'. Provisional payment (không có bookingId) không dính index
// này nên tạo bao nhiêu cái cũng được.
paymentSchema.index(
  { bookingId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { bookingId: { $exists: true }, status: 'pending' },
  }
);

module.exports = mongoose.model('Payment', paymentSchema);
