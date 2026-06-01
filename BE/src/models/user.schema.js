const mongoose = require('mongoose');
const { ROLES, USER_STATUS } = require('../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
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
