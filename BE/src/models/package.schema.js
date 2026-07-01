const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    price: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 1 },
    image: { type: String },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    category: { type: String, enum: ['external', 'internal', 'full'], default: 'full' },
    vehicleTypes: [{ type: String, enum: ['sedan', 'suv', 'pickup', 'van', 'motorcycle'] }],
    subServices: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        duration: { type: Number, required: true, min: 0 },
        isOptional: { type: Boolean, default: true },
      },
    ],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

packageSchema.index({ status: 1 });
packageSchema.index({ category: 1 });
packageSchema.index({ branchId: 1 });

module.exports = mongoose.model('Package', packageSchema);
