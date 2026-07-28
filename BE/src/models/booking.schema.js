const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookingCode: { type: String, unique: true, sparse: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    packageName: { type: String },
    packageDuration: { type: Number },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    bookingDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    note: { type: String, trim: true, maxlength: 500 },
    confirmedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelledBy: { type: String, enum: ['customer', 'admin', 'manager', 'system'] },
    cancellationReason: { type: String, trim: true, maxlength: 500 },
    cancelOtpToken: { type: String },
    cancelOtpExpires: { type: Date },
    rescheduleCount: { type: Number, default: 0 },
    // Cảnh báo sắp bị auto-cancel đã gửi lúc nào (tránh gửi lặp lại mỗi lần cron chạy)
    lateWarningSentAt: { type: Date },
    // Slot trống gần nhất được gợi ý đổi giờ khi sắp/đã bị hủy tự động (HH:mm)
    suggestedSlotStartTime: { type: String },
    // Số phút được quản lý gia hạn thêm (cộng dồn vào grace period mặc định)
    graceExtensionMinutes: { type: Number, default: 0, min: 0 },
    // Booking type: 'single' = đặt lịch thường, 'recurring' = định kỳ, 'slot_pack_usage' = dùng gói slot
    bookingType: { type: String, enum: ['single', 'recurring', 'slot_pack_usage'], default: 'single' },
    // UUID nhóm các booking trong 1 lần đặt định kỳ
    recurringGroupId: { type: String, index: true },
    // Đánh dấu buổi đầu trong nhóm định kỳ (chỉ buổi này chịu cọc toàn nhóm)
    isRecurringFirst: { type: Boolean, default: false },
    // Vị trí của booking trong nhóm định kỳ (1..N)
    recurringPosition: { type: Number, min: 1 },
    // Tổng số buổi ban đầu của nhóm định kỳ
    recurringTotal: { type: Number, min: 1 },
    // Priority dựa theo tier khách hàng: diamond=4, gold=3, silver=2, bronze=1
    priority: { type: Number, default: 1, min: 1, max: 4 },
    // Ref đến SlotPack nếu là slot_pack_usage
    slotPackId: { type: mongoose.Schema.Types.ObjectId, ref: 'SlotPack' },
    selectedSubServices: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        duration: { type: Number, required: true, min: 0 },
      },
    ],
    voucherCode: { type: String, trim: true, uppercase: true },
    discountAmount: { type: Number, default: 0, min: 0 },
    finalPrice: { type: Number, min: 0 },
    // Deposit (đặt cọc trước) — tránh khách đặt mà không đến / spam
    depositAmount: { type: Number, default: 0, min: 0 },
    depositPaid: { type: Boolean, default: false },
    depositPaidAt: { type: Date },
    paymentStatus: {
      type: String,
      // 'deposit_paid' = đã trả cọc, chờ thanh toán phần còn lại khi hoàn thành
      enum: ['unpaid', 'pending', 'deposit_paid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    refundStatus: {
      type: String,
      enum: ['none', 'pending', 'completed'],
      default: 'none',
    },
    refundAmount: { type: Number, default: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'momo', 'vnpay', 'bank', 'sepay'],
    },
    paidAt: { type: Date },
    // Check-in related fields
    checkInTime: { type: Date },
    checkOutTime: { type: Date },
    serviceDuration: { type: Number },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String, trim: true, maxlength: 1000 },
    feedbackAt: { type: Date },
    managerReply: { type: String, trim: true, maxlength: 1000 },
    managerReplyAt: { type: Date },
    // For rebook tracking
    rebookedFromId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  },
  { timestamps: true }
);

bookingSchema.index({ userId: 1 });
bookingSchema.index({ branchId: 1 });
bookingSchema.index({ branchId: 1, bookingDate: 1, status: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ voucherCode: 1 });
// Speed up slot conflict lookups
bookingSchema.index({ branchId: 1, bookingDate: 1, startTime: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
