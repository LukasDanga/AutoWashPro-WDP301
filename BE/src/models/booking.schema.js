const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    bookingDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    note: { type: String, trim: true, maxlength: 500 },
    cancelledAt: { type: Date },
    cancelledBy: { type: String, enum: ['customer', 'admin', 'manager', 'system'] },
    cancellationReason: { type: String, trim: true, maxlength: 500 },
    rescheduleCount: { type: Number, default: 0 },
    voucherCode: { type: String, trim: true, uppercase: true },
    discountAmount: { type: Number, default: 0, min: 0 },
    finalPrice: { type: Number, min: 0 },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'paid', 'refunded'],
      default: 'unpaid',
    },
    paidAt: { type: Date },
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
