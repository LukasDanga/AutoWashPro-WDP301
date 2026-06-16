const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const { Branch, Package } = require('./src/models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/washpro';

const BRANCHES = [
  {
    name: 'AutoWash Cầu Giấy',
    address: '122 Cầu Giấy, Q. Cầu Giấy, Hà Nội',
    phone: '0888.123.456',
    openingTime: '06:00',
    closingTime: '20:00',
    status: 'active',
    location: { type: 'Point', coordinates: [105.801, 21.032] },
  },
  {
    name: 'AutoWash Thanh Xuân',
    address: 'Nguyễn Trãi, Q. Thanh Xuân, Hà Nội',
    phone: '0888.123.457',
    openingTime: '06:00',
    closingTime: '20:00',
    status: 'active',
    location: { type: 'Point', coordinates: [105.798, 20.995] },
  },
  {
    name: 'AutoWash Quận 1',
    address: 'Lê Lợi, P. Bến Nghé, Q. 1, TP.HCM',
    phone: '0888.123.458',
    openingTime: '06:00',
    closingTime: '21:00',
    status: 'active',
    location: { type: 'Point', coordinates: [106.695, 10.776] },
  },
  {
    name: 'AutoWash Thủ Đức',
    address: 'Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức, TP.HCM',
    phone: '0888.123.459',
    openingTime: '06:00',
    closingTime: '21:00',
    status: 'active',
    location: { type: 'Point', coordinates: [106.762, 10.850] },
  },
  {
    name: 'AutoWash Hải Châu',
    address: 'Nguyễn Văn Linh, Q. Hải Châu, Đà Nẵng',
    phone: '0888.123.460',
    openingTime: '06:00',
    closingTime: '20:00',
    status: 'active',
    location: { type: 'Point', coordinates: [108.220, 16.054] },
  },
];

const BRANCH_PACKAGES = [
  {
    name: 'Gói Rửa Cơ Bản',
    description: 'Rửa ngoại thất, xịt áp lực cao, lau khô',
    price: 99000,
    duration: 30,
    category: 'external',
    vehicleTypes: ['sedan', 'suv', 'pickup', 'van', 'motorcycle'],
    status: 'active',
    subServices: [
      { name: 'Phủ sáp bóng (Wax)', price: 100000, duration: 20, isOptional: true },
      { name: 'Xịt gầm chuyên sâu', price: 50000, duration: 15, isOptional: true },
    ],
  },
  {
    name: 'Gói Rửa Cao Cấp',
    description: 'Rửa ngoại thất, hút bụi nội thất, đánh bóng nhanh',
    price: 249000,
    duration: 60,
    category: 'full',
    vehicleTypes: ['sedan', 'suv', 'pickup', 'van'],
    status: 'active',
    subServices: [
      { name: 'Phủ sáp bóng (Wax)', price: 100000, duration: 20, isOptional: true },
      { name: 'Tẩy ố kính', price: 150000, duration: 30, isOptional: true },
      { name: 'Khử mùi nội thất', price: 80000, duration: 15, isOptional: true },
    ],
  },
  {
    name: 'Gói Vệ Sinh Nội Thất',
    description: 'Giặt ghế, vệ sinh trần, bảng điều khiển, khử mùi',
    price: 399000,
    duration: 90,
    category: 'internal',
    vehicleTypes: ['sedan', 'suv', 'pickup'],
    status: 'active',
    subServices: [
      { name: 'Phủ nano kính lái', price: 200000, duration: 40, isOptional: true },
    ],
  },
  {
    name: 'Gói Chăm Sóc VIP',
    description: 'Chăm sóc toàn diện: rửa ngoài, vệ sinh nội thất, phủ sáp, bảo dưỡng nhanh',
    price: 599000,
    duration: 120,
    category: 'full',
    vehicleTypes: ['sedan', 'suv'],
    status: 'active',
    subServices: [
      { name: 'Tẩy ố kính', price: 150000, duration: 30, isOptional: true },
      { name: 'Phủ sáp bóng (Wax)', price: 100000, duration: 20, isOptional: true },
      { name: 'Khử mùi nội thất', price: 80000, duration: 15, isOptional: true },
      { name: 'Rửa khoang máy', price: 100000, duration: 30, isOptional: true },
    ],
  },
];

async function seedBranches() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB:', MONGODB_URI);

    const existingBranches = await Branch.countDocuments();
    if (existingBranches > 0) {
      console.log(`Found ${existingBranches} existing branches. Skipping branch creation.`);
      console.log('Run with FORCE=true to re-create: node seed-branches.js');
      if (process.env.FORCE !== 'true') {
        await mongoose.disconnect();
        process.exit(0);
      }
      await Branch.deleteMany({});
      await Package.deleteMany({ branchId: { $ne: null } });
      console.log('Force mode: deleted existing branches and branch-specific packages.');
    }

    const createdBranches = [];
    for (const data of BRANCHES) {
      const branch = await Branch.create(data);
      createdBranches.push(branch);
      console.log(`  + Created Branch: ${branch.name}`);
    }

    let pkgCount = 0;
    for (const branch of createdBranches) {
      for (const pkgData of BRANCH_PACKAGES) {
        const existing = await Package.findOne({ name: pkgData.name, branchId: branch._id });
        if (!existing) {
          await Package.create({ ...pkgData, branchId: branch._id });
          pkgCount++;
          console.log(`  + Package: ${pkgData.name} @ ${branch.name}`);
        }
      }
    }
    console.log(`\n✓ Created ${createdBranches.length} branches with ${pkgCount} packages`);

    console.log('\n═══════════════════════════════════════');
    console.log('SEED BRANCHES COMPLETE');
    console.log('Branches with packages available for booking.');
    console.log('═══════════════════════════════════════');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seedBranches();
