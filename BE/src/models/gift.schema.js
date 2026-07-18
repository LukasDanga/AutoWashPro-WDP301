const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  type: { type: String, enum: ['percentage', 'fixed', 'none'], default: 'none' },
  value: { type: Number, default: 0, min: 0 },
  probability: { type: Number, required: true, min: 0, max: 100, default: 10 },
  color: { type: String, default: '#10b981' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

giftSchema.index({ status: 1, sortOrder: 1 });

module.exports = mongoose.model('Gift', giftSchema);
