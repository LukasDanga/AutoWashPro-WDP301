const mongoose = require('mongoose');
const { VEHICLE_TYPE } = require('../config/constants');

const vehicleSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    licensePlate: { type: String, required: true, uppercase: true, trim: true },
    vehicleType: { type: String, enum: Object.values(VEHICLE_TYPE), required: true },
    brand: { type: String, required: true, trim: true },
    model: { type: String, trim: true },
    color: { type: String, required: true, trim: true },
    year: { type: Number },
    imageUrl: { type: String },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

vehicleSchema.index({ userId: 1 });
vehicleSchema.index({ userId: 1, licensePlate: 1 }, { unique: true });

vehicleSchema.pre('save', function (next) {
  if (this.isModified('licensePlate')) {
    this.licensePlate = this.licensePlate.replace(/\s+/g, '').toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
