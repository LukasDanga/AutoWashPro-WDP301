const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const { User, Package, Vehicle } = require('./src/models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/washpro';

async function seedAdvanced() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB:', MONGODB_URI);

    // 1. Seed Packages with Sub-services
    const advancedPackages = [
      {
        name: 'Gói Chăm Sóc VIP Combo',
        description: 'Gói chăm sóc toàn diện kèm nhiều lựa chọn thêm tùy ý',
        price: 350000,
        duration: 90,
        category: 'full',
        vehicleTypes: ['sedan', 'suv'],
        status: 'active',
        subServices: [
          { name: 'Xịt gầm chuyên sâu', price: 50000, duration: 15, isOptional: true },
          { name: 'Phủ sáp bóng (Wax)', price: 100000, duration: 20, isOptional: true },
          { name: 'Tẩy ố kính', price: 150000, duration: 30, isOptional: true },
          { name: 'Khử mùi nội thất', price: 80000, duration: 15, isOptional: true }
        ]
      },
      {
        name: 'Gói Rửa Cơ Bản Plus',
        description: 'Rửa ngoài, hút bụi và một số dịch vụ thêm',
        price: 100000,
        duration: 45,
        category: 'external',
        vehicleTypes: ['sedan', 'suv', 'pickup'],
        status: 'active',
        subServices: [
          { name: 'Rửa khoang máy (cơ bản)', price: 100000, duration: 30, isOptional: true },
          { name: 'Phủ nano kính lái', price: 200000, duration: 40, isOptional: true }
        ]
      }
    ];

    let pkgCreated = 0;
    for (const pkg of advancedPackages) {
      const existing = await Package.findOne({ name: pkg.name });
      if (!existing) {
        await Package.create(pkg);
        pkgCreated++;
        console.log(`  + Created Package: ${pkg.name}`);
      } else {
        await Package.findByIdAndUpdate(existing._id, pkg);
        console.log(`  ↺ Updated Package: ${pkg.name}`);
      }
    }
    console.log(`✓ Seeded ${pkgCreated} combo packages`);

    // 2. Seed Vehicles for baokhang@washpro.vn and others
    const baoKhang = await User.findOne({ email: 'baokhang@washpro.vn' });
    if (baoKhang) {
      const existingBKVehicles = await Vehicle.countDocuments({ userId: baoKhang._id });
      if (existingBKVehicles === 0) {
        await Vehicle.create([
          {
            userId: baoKhang._id,
            licensePlate: '51H-12345',
            vehicleType: 'sedan',
            brand: 'Mazda 3',
            color: 'Đỏ',
            isDefault: true
          },
          {
            userId: baoKhang._id,
            licensePlate: '51F-67890',
            vehicleType: 'suv',
            brand: 'Ford Everest',
            color: 'Đen',
            isDefault: false
          }
        ]);
        console.log(`✓ Added 2 vehicles for ${baoKhang.email}`);
      } else {
        console.log(`✓ ${baoKhang.email} already has ${existingBKVehicles} vehicles`);
      }
    } else {
      console.log('! VIP User baokhang@washpro.vn not found');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seedAdvanced();
