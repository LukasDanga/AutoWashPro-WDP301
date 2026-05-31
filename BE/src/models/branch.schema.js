const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    phone: { type: String, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true },
    openingTime: { type: String, default: '07:00' },
    closingTime: { type: String, default: '18:00' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    image: { type: String },
  },
  { timestamps: true }
);

branchSchema.index({ name: 1 });
branchSchema.index({ status: 1 });

module.exports = mongoose.model('Branch', branchSchema);
