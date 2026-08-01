const mongoose = require('mongoose');

const pointHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    points: { type: Number, required: true }, // positive for earned, negative for redeemed/expired/deducted
    type: { type: String, enum: ['earned', 'redeemed', 'expired', 'adjustment'], required: true },
    description: { type: String, trim: true, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }, // bookingId
    snapshot: {
      orderAmount: { type: Number, default: 0 },
      baseRate: { type: Number, default: 0 },
      tier: { type: String, trim: true },
      tierName: { type: String, trim: true },
      multiplier: { type: Number, default: 1.0 },
      effectiveRate: { type: Number, default: 0 },
      bookingCode: { type: String, trim: true },
      bookingType: { type: String, trim: true },
      packageName: { type: String, trim: true },
      packagePrice: { type: Number, default: 0 },
      subServices: [
        {
          name: { type: String },
          price: { type: Number, default: 0 },
        },
      ],
      includedSubServices: [
        {
          name: { type: String },
          price: { type: Number, default: 0 },
          duration: { type: Number, default: 0 },
          isOptional: { type: Boolean, default: false },
        },
      ],
      selectedSubServices: [
        {
          name: { type: String },
          price: { type: Number, default: 0 },
          duration: { type: Number, default: 0 },
          isOptional: { type: Boolean, default: true },
        },
      ],
      voucherCode: { type: String, trim: true },
      discountAmount: { type: Number, default: 0 },
      paymentMethod: { type: String, trim: true },
      paymentStatus: { type: String, trim: true },
      branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
      branchName: { type: String, trim: true },
      branchAddress: { type: String, trim: true },
      cancellationReason: { type: String, trim: true },
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

pointHistorySchema.index({ userId: 1, createdAt: -1 });
pointHistorySchema.index({ 'snapshot.branchId': 1, createdAt: -1 });
pointHistorySchema.index({ isDeleted: 1 });

module.exports = mongoose.model('PointHistory', pointHistorySchema);
