/**
 * seed-loyalty.js
 * Tạo dữ liệu mẫu: Khách hàng ở các hạng khác nhau (Đồng, Bạc, Vàng, Kim Cương) 
 * và các Voucher mẫu (Đổi điểm, Sinh nhật, Từng hạng).
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const { User, Voucher } = require('./src/models');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/washpro';

const sampleUsers = [
  {
    name: 'Khách Đồng',
    email: 'dong@washpro.vn',
    password: 'Password123!',
    phone: '0900000001',
    role: 'customer',
    loyaltyPoints: 5000,
    lifetimePoints: 5000,
    tier: 'bronze',
    pointsExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // +6 months
  },
  {
    name: 'Khách Bạc',
    email: 'bac@washpro.vn',
    password: 'Password123!',
    phone: '0900000002',
    role: 'customer',
    loyaltyPoints: 120000,
    lifetimePoints: 120000,
    tier: 'silver',
    pointsExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
  },
  {
    name: 'Khách Vàng',
    email: 'vang@washpro.vn',
    password: 'Password123!',
    phone: '0900000003',
    role: 'customer',
    loyaltyPoints: 550000,
    lifetimePoints: 550000,
    tier: 'gold',
    pointsExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
  },
  {
    name: 'Khách Kim Cương',
    email: 'kimcuong@washpro.vn',
    password: 'Password123!',
    phone: '0900000004',
    role: 'customer',
    loyaltyPoints: 1500000,
    lifetimePoints: 1500000,
    tier: 'diamond',
    pointsExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
  },
];

const sampleVouchers = [
  {
    code: 'REDEEM50K',
    name: 'Đổi điểm - Giảm 50K',
    description: 'Dùng 100,000 điểm để lấy mã giảm giá 50.000đ',
    type: 'fixed',
    value: 50000,
    quantity: 9999,
    remaining: 9999,
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    status: 'active',
    isTemplate: true, // Đây là mẫu để đổi
    requiredPoints: 100000,
    applicableToAllPackages: true,
    applicableToAllBranches: true,
  },
  {
    code: 'HAPPYBDAY',
    name: 'Mừng Sinh Nhật',
    description: 'Giảm 20% tối đa 100K cho khách hàng trong tháng sinh nhật',
    type: 'percentage',
    value: 20,
    maxDiscount: 100000,
    quantity: 9999,
    remaining: 9999,
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    status: 'active',
    isTemplate: false, // Code này public hoặc sẽ gửi riêng
    isBirthdayVoucher: true,
    applicableToAllPackages: true,
    applicableToAllBranches: true,
  },
  {
    code: 'VANGKIMCUONG',
    name: 'Tri ân VIP',
    description: 'Giảm 100K cho hóa đơn từ 300K, dành riêng hạng Vàng và Kim Cương',
    type: 'fixed',
    value: 100000,
    minOrder: 300000,
    quantity: 500,
    remaining: 500,
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status: 'active',
    applicableTiers: ['gold', 'diamond'],
    applicableToAllPackages: true,
    applicableToAllBranches: true,
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');

    let admin = await User.findOne({ role: 'admin' });
    
    // Seed Users
    for (const u of sampleUsers) {
      const existing = await User.findOne({ email: u.email });
      if (existing) {
        Object.assign(existing, u);
        await existing.save();
        console.log(`Updated user: ${u.email} (Tier: ${u.tier})`);
      } else {
        await User.create(u);
        console.log(`Created user: ${u.email} (Tier: ${u.tier})`);
      }
    }

    // Seed Vouchers
    for (const v of sampleVouchers) {
      if (admin) v.createdBy = admin._id;
      
      const existing = await Voucher.findOne({ code: v.code });
      if (existing) {
        Object.assign(existing, v);
        await existing.save();
        console.log(`Updated voucher: ${v.code}`);
      } else {
        await Voucher.create(v);
        console.log(`Created voucher: ${v.code}`);
      }
    }

    console.log('\n✅ Seed Loyalty Data Successfully!\n');
    console.log('Tài khoản test khách hàng:');
    sampleUsers.forEach(u => console.log(`- ${u.email} / ${u.password} (${u.tier}, ${u.loyaltyPoints}đ)`));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
