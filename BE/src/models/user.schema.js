const mongoose = require('mongoose');
const { ROLES, USER_STATUS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'Thành viên mới', trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    phone: { type: String, trim: true },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.CUSTOMER },
    status: { type: String, enum: Object.values(USER_STATUS), default: USER_STATUS.ACTIVE },
    avatar: { type: String },
    dateOfBirth: { type: Date },
    refreshToken: { type: String, select: false },
    lastLogin: { type: Date },
    forgotPasswordToken: { type: String, select: false },
    forgotPasswordExpires: { type: Date, select: false },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    loyaltyPoints: { type: Number, default: 0 },
    lifetimePoints: { type: Number, default: 0 },
    tier: { type: String, enum: ['bronze', 'silver', 'gold', 'diamond'], default: 'bronze' },
    pointsExpiresAt: { type: Date },
    // Số lần bị hệ thống tự hủy do no-show (chưa đến quá giờ). Giảm dần khi hoàn thành booking thành công.
    noShowCount: { type: Number, default: 0, min: 0 },
    // Lượt quay vòng quay may mắn
    spinCount: { type: Number, default: 0, min: 0 },
    // Số dư ví nội bộ (cho phép thanh toán hoặc nhận hoàn tiền)
    walletBalance: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

userSchema.index({ phone: 1 });
userSchema.index({ branchId: 1 });
userSchema.index({ forgotPasswordToken: 1 });

userSchema.pre('save', function (next) {
  if (this.isModified('password')) {
    const bcrypt = require('bcryptjs');
    this.password = bcrypt.hashSync(this.password, 12);
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return require('bcryptjs').compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
