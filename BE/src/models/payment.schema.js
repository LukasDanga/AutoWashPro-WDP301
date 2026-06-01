const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['cash', 'momo', 'vnpay'], required: true },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    transactionId: { type: String },
    paymentUrl: { type: String },
    paidAt: { type: Date },
    refundedAt: { type: Date },
    gatewayTransactionId: { type: String },
    failureReason: { type: String },
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ gatewayTransactionId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
