const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  isCustomPrice: { type: Boolean, default: false },
  emoji: { type: String },
  bgColor: { type: String },
  imageUrl: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

giftSchema.index({ status: 1, sortOrder: 1 });

module.exports = mongoose.model('Gift', giftSchema);
