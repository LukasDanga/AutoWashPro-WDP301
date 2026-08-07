const mongoose = require('mongoose');

const redemptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reward: { type: mongoose.Schema.Types.ObjectId, ref: 'Reward', required: true, index: true },
  rewardSnapshot: {
    name: { type: String, required: true },
    imageUrl: { type: String },
    pointCost: { type: Number, required: true },
    requiredTier: { type: String, enum: ['bronze', 'silver', 'gold', 'diamond'], default: 'bronze' },
  },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  pointsSpent: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['claimed', 'sent', 'received', 'cancelled'], default: 'claimed' },
  sentAt: { type: Date },
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  branchSnapshot: {
    id: { type: String },
    name: { type: String },
    code: { type: String },
  },
  sentBySnapshot: {
    id: { type: String },
    name: { type: String },
    phone: { type: String },
    email: { type: String },
    role: { type: String },
  },
  receivedAt: { type: Date },
  cancelledAt: { type: Date },
  cancelReason: { type: String, trim: true },
}, { timestamps: true });

redemptionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Redemption', redemptionSchema);