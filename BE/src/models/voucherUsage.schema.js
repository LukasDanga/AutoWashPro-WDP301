const mongoose = require('mongoose');

const voucherUsageSchema = new mongoose.Schema(
  {
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    discountAmount: { type: Number, default: 0 },
    usedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

voucherUsageSchema.index({ voucherId: 1, userId: 1 });
voucherUsageSchema.index({ voucherId: 1, userId: 1, bookingId: 1 }, { unique: true });
voucherUsageSchema.index({ userId: 1 });

module.exports = mongoose.model('VoucherUsage', voucherUsageSchema);
