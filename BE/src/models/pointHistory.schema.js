const mongoose = require('mongoose');

const pointHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    points: { type: Number, required: true }, // positive for earned, negative for redeemed/expired
    type: { type: String, enum: ['earned', 'redeemed', 'expired', 'adjustment'], required: true },
    description: { type: String, trim: true, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId }, // bookingId, voucherId, etc.
  },
  { timestamps: true }
);

pointHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('PointHistory', pointHistorySchema);
