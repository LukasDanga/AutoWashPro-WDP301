const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  imageUrl: { type: String, trim: true },
  pointCost: { type: Number, required: true, min: 1 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  // Hạng thành viên tối thiểu để được đổi phần thưởng này
  requiredTier: { type: String, enum: ['bronze', 'silver', 'gold', 'diamond'], default: 'bronze' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  sortOrder: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

rewardSchema.index({ status: 1, sortOrder: 1 });
rewardSchema.index({ pointCost: 1 });

module.exports = mongoose.model('Reward', rewardSchema);