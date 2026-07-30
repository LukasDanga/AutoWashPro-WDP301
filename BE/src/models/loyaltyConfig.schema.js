const mongoose = require('mongoose');

const tierItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    minPoints: { type: Number, required: true, min: 0 },
    multiplier: { type: Number, required: true, min: 0.1 },
    color: { type: String },
    bg: { type: String },
    border: { type: String },
    colorTheme: { type: String },
    icon: { type: String, default: 'Circle' },
    benefits: [{ type: String }],
  },
  { _id: false }
);

const loyaltyConfigSchema = new mongoose.Schema(
  {
    baseEarningRate: { type: Number, default: 5, min: 0, max: 100 },
    pointExpirationMonths: { type: Number, default: 6, min: 1 },
    tiers: [tierItemSchema],
    isDefault: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LoyaltyConfig', loyaltyConfigSchema);
