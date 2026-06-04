/**
 * seed-test-data.js
 * Tạo dữ liệu test: vouchers + gán điểm loyalty cho tất cả customers.
 *
 * Chạy: node seed-test-data.js
 *
 * Vouchers tạo:
 *   PUBLIC10    - 10% off, tất cả đều dùng được
 *   PUBLIC50K   - Giảm 50,000đ, tất cả đều dùng được
 *   SILVER20    - 20% off, chỉ Silver+
 *   GOLD30      - 30% off, chỉ Gold+
 *   DIAMOND50   - 50% off, chỉ Diamond
 *   POINTS_V1   - Template đổi 200 điểm lấy giảm 100k (redeemable)
 *   POINTS_V2   - Template đổi 500 điểm lấy giảm 250k (redeemable)
 *
 * Điểm: Mỗi customer nhận 1,000 điểm để test.
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const { User, Voucher } = require('./src/models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/washpro';

const ADMIN_ID_PLACEHOLDER = '000000000000000000000001'; // will be replaced

const oneYearLater = new Date();
oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
const startNow = new Date();
startNow.setMinutes(startNow.getMinutes() - 1); // vừa started

const VOUCHERS = [
  {
    code: 'PUBLIC10',
    name: 'Giảm 10% cho tất cả',
    description: 'Voucher công khai — áp dụng cho mọi đơn hàng từ 50,000đ',
    type: 'percentage',
    value: 10,
    maxDiscount: 50000,
    minOrder: 50000,
    quantity: 500,
    remaining: 500,
    startDate: startNow,
    endDate: oneYearLater,
    applicableToAllPackages: true,
    applicableToAllBranches: true,
    maxUsagePerUser: 3,
    applicableTiers: [],   // tất cả hạng
    isTemplate: false,
  },
  {
    code: 'PUBLIC50K',
    name: 'Giảm 50,000đ cho tất cả',
    description: 'Voucher công khai — giảm thẳng 50k cho mọi đơn từ 100,000đ',
    type: 'fixed',
    value: 50000,
    minOrder: 100000,
    quantity: 300,
    remaining: 300,
    startDate: startNow,
    endDate: oneYearLater,
    applicableToAllPackages: true,
    applicableToAllBranches: true,
    maxUsagePerUser: 2,
    applicableTiers: [],
    isTemplate: false,
  },
  {
    code: 'SILVER20',
    name: '✦ Ưu đãi Silver — Giảm 20%',
    description: 'Dành riêng cho thành viên Silver và cao hơn. Giảm 20%, tối đa 100k.',
    type: 'percentage',
    value: 20,
    maxDiscount: 100000,
    minOrder: 80000,
    quantity: 200,
    remaining: 200,
    startDate: startNow,
    endDate: oneYearLater,
    applicableToAllPackages: true,
    applicableToAllBranches: true,
    maxUsagePerUser: 5,
    applicableTiers: ['silver', 'gold', 'diamond'],
    isTemplate: false,
  },
  {
    code: 'GOLD30',
    name: '✦✦ Đặc quyền Gold — Giảm 30%',
    description: 'Dành riêng cho thành viên Gold và Diamond. Giảm 30%, tối đa 200k.',
    type: 'percentage',
    value: 30,
    maxDiscount: 200000,
    minOrder: 100000,
    quantity: 100,
    remaining: 100,
    startDate: startNow,
    endDate: oneYearLater,
    applicableToAllPackages: true,
    applicableToAllBranches: true,
    maxUsagePerUser: 5,
    applicableTiers: ['gold', 'diamond'],
    isTemplate: false,
  },
  {
    code: 'DIAMOND50',
    name: '💎 Đặc quyền Diamond — Giảm 50%',
    description: 'Chỉ dành cho thành viên Diamond. Giảm 50%, tối đa 500k.',
    type: 'percentage',
    value: 50,
    maxDiscount: 500000,
    minOrder: 150000,
    quantity: 50,
    remaining: 50,
    startDate: startNow,
    endDate: oneYearLater,
    applicableToAllPackages: true,
    applicableToAllBranches: true,
    maxUsagePerUser: 10,
    applicableTiers: ['diamond'],
    isTemplate: false,
  },
  {
    code: 'POINTS_V1',
    name: '🎯 Đổi điểm: Giảm 100,000đ',
    description: 'Dùng 200 điểm đổi voucher giảm 100,000đ cho bất kỳ dịch vụ nào.',
    type: 'fixed',
    value: 100000,
    minOrder: 80000,
    quantity: 999,
    remaining: 999,
    startDate: startNow,
    endDate: oneYearLater,
    applicableToAllPackages: true,
    applicableToAllBranches: true,
    maxUsagePerUser: 99,
    requiredPoints: 200,
    applicableTiers: [],
    isTemplate: true,
  },
  {
    code: 'POINTS_V2',
    name: '🎯 Đổi điểm: Giảm 250,000đ',
    description: 'Dùng 500 điểm đổi voucher giảm 250,000đ. Tiết kiệm nhiều hơn!',
    type: 'fixed',
    value: 250000,
    minOrder: 200000,
    quantity: 999,
    remaining: 999,
    startDate: startNow,
    endDate: oneYearLater,
    applicableToAllPackages: true,
    applicableToAllBranches: true,
    maxUsagePerUser: 99,
    requiredPoints: 500,
    applicableTiers: [],
    isTemplate: true,
  },
];

const TEST_POINTS = 1000; // điểm tặng cho mỗi customer để test

async function seedTestData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB:', MONGODB_URI);

    // Lấy admin để set createdBy
    const admin = await User.findOne({ role: 'admin' });
    const adminId = admin?._id || new mongoose.Types.ObjectId(ADMIN_ID_PLACEHOLDER);

    // Upsert vouchers
    let created = 0, updated = 0;
    for (const v of VOUCHERS) {
      const existing = await Voucher.findOne({ code: v.code });
      if (existing) {
        await Voucher.findOneAndUpdate({ code: v.code }, { ...v, createdBy: adminId });
        updated++;
        console.log(`  ↺ Updated: ${v.code}`);
      } else {
        await Voucher.create({ ...v, createdBy: adminId });
        created++;
        console.log(`  + Created: ${v.code} — ${v.name}`);
      }
    }

    console.log(`\n✓ Vouchers: ${created} created, ${updated} updated`);

    // Gán điểm cho tất cả customer
    const result = await User.updateMany(
      { role: 'customer' },
      {
        $inc: { loyaltyPoints: TEST_POINTS, lifetimePoints: TEST_POINTS },
        $setOnInsert: {},
      }
    );

    console.log(`✓ Added ${TEST_POINTS} loyalty points to ${result.modifiedCount} customers`);

    console.log('\n═══════════════════════════════════════');
    console.log('VOUCHER CODES FOR TESTING:');
    console.log('  PUBLIC10   - 10% off (anyone)');
    console.log('  PUBLIC50K  - 50k off (anyone)');
    console.log('  SILVER20   - 20% off (Silver+)');
    console.log('  GOLD30     - 30% off (Gold+)');
    console.log('  DIAMOND50  - 50% off (Diamond only)');
    console.log('  POINTS_V1  - Exchange 200pts → -100k');
    console.log('  POINTS_V2  - Exchange 500pts → -250k');
    console.log('═══════════════════════════════════════');
    console.log(`Each customer got +${TEST_POINTS} loyalty points\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seedTestData();
