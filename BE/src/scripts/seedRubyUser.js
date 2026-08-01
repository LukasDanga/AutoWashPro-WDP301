/* Tạo 1 tài khoản khách hàng hạng Ruby với ví 10,000,000đ
 * Cách chạy: node src/scripts/seedRubyUser.js
 */
require('dotenv').config({ path: __dirname + '/../../.env' });
require('../config/dns'); // Fix Atlas SRV DNS cho script độc lập
const mongoose = require('mongoose');
const { User } = require('../models');

const EMAIL = 'ruby.washpro@gmail.com';
const PASSWORD = '123456';
const NAME = 'Khách Hạng Ruby';
const WALLET = 10000000; // 10 triệu đồng

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ email: EMAIL }).lean();
  if (existing) {
    console.log(`User ${EMAIL} already exists (id=${existing._id})`);
    await mongoose.disconnect();
    return;
  }

  const user = new User({
    name: NAME,
    email: EMAIL,
    password: PASSWORD,
    phone: '0900000888',
    role: 'customer',
    status: 'active',
    tier: 'Ruby',
    walletBalance: WALLET,
    loyaltyPoints: 2000000,
    lifetimePoints: 2000000,
  });
  await user.save();

  console.log('=== Created Ruby user ===');
  console.log({ id: user._id.toString(), email: user.email, name: user.name, tier: user.tier, walletBalance: user.walletBalance });
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
