const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 500 },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, min: 0, default: 0 },
    minOrder: { type: Number, min: 0, default: 0 },
    quantity: { type: Number, required: true, min: 0 },
    remaining: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    applicablePackages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Package' }],
    applicableBranches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
    applicableToAllPackages: { type: Boolean, default: false },
    applicableToAllBranches: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    maxUsagePerUser: { type: Number, default: 1 },
    requiredPoints: { type: Number, default: 0, min: 0 },
    applicableTiers: [{ type: String, enum: ['bronze', 'silver', 'gold', 'diamond'] }],
    isBirthdayVoucher: { type: Boolean, default: false },
    isTemplate: { type: Boolean, default: false },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

voucherSchema.index({ status: 1 });
voucherSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Voucher', voucherSchema);
