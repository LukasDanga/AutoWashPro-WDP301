const mongoose = require('mongoose');

const checkinSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    checkInTime: { type: Date, default: Date.now },
    checkOutTime: { type: Date },
    serviceDuration: { type: Number },
    status: { type: String, enum: ['checked_in', 'in_progress', 'completed'], default: 'checked_in' },
    note: { type: String, trim: true, maxlength: 500 },
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String, trim: true, maxlength: 1000 },
    scheduledDuration: { type: Number },
  },
  { timestamps: true }
);

checkinSchema.index({ userId: 1 });
checkinSchema.index({ branchId: 1 });
checkinSchema.index({ checkInTime: -1 });
checkinSchema.index({ status: 1 });

checkinSchema.virtual('actualDuration').get(function () {
  if (this.checkInTime && this.checkOutTime) {
    return Math.round((this.checkOutTime - this.checkInTime) / 60000);
  }
  return null;
});

module.exports = mongoose.model('Checkin', checkinSchema);
