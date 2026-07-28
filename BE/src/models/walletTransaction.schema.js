const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    reason: { type: String, required: true }, // e.g. "Refund for booking #123", "Payment for booking #456"
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }, // Optional, linking to the specific booking
  },
  { timestamps: true }
);

walletTransactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
