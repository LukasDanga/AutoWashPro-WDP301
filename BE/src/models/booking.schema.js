const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    branchId: { type: String, required: true, trim: true },
    branchName: { type: String, required: true, trim: true },
    branchAddress: { type: String, required: true, trim: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    vehicleName: { type: String, required: true, trim: true },
    vehiclePlate: { type: String, required: true, uppercase: true, trim: true },
    vehicleType: { type: String, required: true, trim: true },
    serviceId: { type: String, required: true, trim: true },
    serviceName: { type: String, required: true, trim: true },
    serviceDuration: { type: String, trim: true },
    servicePrice: { type: Number, required: true, min: 0 },
    bookingDate: { type: Date, required: true },
    timeSlot: { type: String, required: true, trim: true },
    couponCode: { type: String, trim: true },
    discountAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    pointsEarned: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled', 'paid'], default: 'pending' },
    bookingCode: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true }
);

bookingSchema.pre('save', function (next) {
  if (this.isModified('vehiclePlate')) {
    this.vehiclePlate = this.vehiclePlate.replace(/\s+/g, '').toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);