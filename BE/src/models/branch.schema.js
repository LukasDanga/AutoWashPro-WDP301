const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    city: { type: String, trim: true, maxlength: 50 },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    phone: { type: String, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true },
    openingTime: { type: String, default: '07:00' },
    closingTime: { type: String, default: '18:00' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    image: { type: String },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    mapCoordinates: {
      svgCx: { type: Number },
      svgCy: { type: Number },
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

branchSchema.index({ name: 1 });
branchSchema.index({ status: 1 });
branchSchema.index({ location: '2dsphere' });
branchSchema.index({ managerId: 1 });

module.exports = mongoose.model('Branch', branchSchema);
