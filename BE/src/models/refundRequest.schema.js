const mongoose = require('mongoose');

const refundRequestSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String, trim: true, maxlength: 500 },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

refundRequestSchema.index({ bookingId: 1 });
refundRequestSchema.index({ userId: 1 });
refundRequestSchema.index({ status: 1 });
// Prevent multiple pending refund requests for the same booking
refundRequestSchema.index({ bookingId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'pending' } });

module.exports = mongoose.model('RefundRequest', refundRequestSchema);
