/**
 * seed-manager.js
 * Tạo tài khoản Branch Manager để test.
 *
 * Chạy: node seed-manager.js
 *
 * KHÔNG xóa dữ liệu cũ — chỉ upsert tài khoản manager.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const { User } = require('./src/models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/washpro';

const MANAGER_ACCOUNT = {
  name: 'Nguyen Van Quan Ly',
  email: 'manager@washpro.vn',
  password: 'Manager123!',
  phone: '0912345678',
  role: 'manager',
  status: 'active',
};

async function seedManager() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected:', MONGODB_URI);

    const existing = await User.findOne({ email: MANAGER_ACCOUNT.email });

    if (existing) {
      existing.name = MANAGER_ACCOUNT.name;
      existing.phone = MANAGER_ACCOUNT.phone;
      existing.role = MANAGER_ACCOUNT.role;
      existing.status = MANAGER_ACCOUNT.status;
      existing.password = MANAGER_ACCOUNT.password; // pre-save hook will hash
      await existing.save();
      console.log('Updated existing manager account.');
    } else {
      await User.create(MANAGER_ACCOUNT);
      console.log('Created new manager account.');
    }

    console.log('');
    console.log('=== BRANCH MANAGER ACCOUNT ===');
    console.log('Email   :', MANAGER_ACCOUNT.email);
    console.log('Password:', MANAGER_ACCOUNT.password);
    console.log('Role    : manager');
    console.log('==============================');
    console.log('Login at: http://localhost:5173');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seedManager();