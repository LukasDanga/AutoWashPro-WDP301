const mongoose = require('mongoose');

const slotProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  slots: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
  originalPrice: { type: Number, min: 0 },
  features: [{ type: String, trim: true }],
  popular: { type: Boolean, default: false },
  imageUrl: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

slotProductSchema.index({ status: 1, sortOrder: 1 });

module.exports = mongoose.model('SlotProduct', slotProductSchema);
