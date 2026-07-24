require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const mongoose = require('mongoose');

const CAR_WASH_TEMPLATES = [
  {
    name: 'Rửa ô tô cơ bản',
    legacyNames: ['Rửa xe cơ bản', 'Rửa ô tô cơ bản'],
    description: 'Rửa vỏ ô tô tự động bằng hệ thống chổi xoay & phun bọt tuyết, lau khô ngoại thất và dưỡng bóng lốp xe.',
    price: 100000,
    duration: 30,
    category: 'external',
    vehicleTypes: ['sedan', 'suv', 'van', 'pickup'],
    subServices: [
      { name: 'Phun bọt tuyết tự động', price: 0, duration: 5, isOptional: false },
      { name: 'Rửa vỏ xe bằng chổi xoay tự động', price: 0, duration: 15, isOptional: false },
      { name: 'Xịt sấy khô tự động', price: 0, duration: 5, isOptional: false },
      { name: 'Dưỡng bóng lốp xe', price: 0, duration: 5, isOptional: false },
      { name: 'Xịt rửa gầm áp lực cao', price: 30000, duration: 10, isOptional: true },
      { name: 'Hút bụi nội thất ô tô', price: 50000, duration: 15, isOptional: true },
      { name: 'Xịt nước hoa cabin', price: 20000, duration: 5, isOptional: true },
    ]
  },
  {
    name: 'Rửa ô tô + Phủ Nano',
    legacyNames: ['Rửa xe + Phủ Nano', 'Rửa ô tô + Phủ Nano'],
    description: 'Rửa vỏ ô tô tự động chuyên sâu, xịt gầm áp lực cao và phủ sáp Nano bảo vệ sơn xe bóng đẹp tới 3 tháng.',
    price: 250000,
    duration: 50,
    category: 'external',
    vehicleTypes: ['sedan', 'suv', 'pickup'],
    subServices: [
      { name: 'Phun bọt tuyết & rửa tự động chuyên sâu', price: 0, duration: 15, isOptional: false },
      { name: 'Xịt rửa gầm áp lực cao', price: 0, duration: 10, isOptional: false },
      { name: 'Phủ sáp bóng Nano bảo vệ sơn xe', price: 0, duration: 15, isOptional: false },
      { name: 'Sấy khô & lau kính sạch bóng', price: 0, duration: 10, isOptional: false },
      { name: 'Vệ sinh khoang máy bằng hơi nước', price: 100000, duration: 20, isOptional: true },
      { name: 'Tẩy nhựa đường & vết ố kính', price: 80000, duration: 15, isOptional: true },
      { name: 'Hút bụi & bảo dưỡng da nội thất', price: 120000, duration: 20, isOptional: true },
    ]
  },
  {
    name: 'Vệ sinh toàn diện ô tô',
    legacyNames: ['Vệ sinh toàn diện', 'Vệ sinh toàn diện ô tô'],
    description: 'Dịch vụ chăm sóc ô tô toàn bộ: Rửa xe tự động, xịt gầm, hút bụi vệ sinh nội thất chi tiết và khử mùi cabin.',
    price: 380000,
    duration: 90,
    category: 'full',
    vehicleTypes: ['sedan', 'suv', 'pickup', 'van'],
    subServices: [
      { name: 'Rửa xe tự động & xịt gầm cao cấp', price: 0, duration: 20, isOptional: false },
      { name: 'Hút bụi & Vệ sinh nội thất chi tiết', price: 0, duration: 30, isOptional: false },
      { name: 'Khử mùi sinh học / Khử trùng Ozone', price: 0, duration: 25, isOptional: false },
      { name: 'Phủ bóng sáp sơn xe & dưỡng lốp', price: 0, duration: 15, isOptional: false },
      { name: 'Phủ Ceramic sơn xe tạm thời', price: 150000, duration: 20, isOptional: true },
      { name: 'Tẩy ố kính & Phục hồi nhựa nhám', price: 100000, duration: 20, isOptional: true },
      { name: 'Phủ gầm cao su chống gỉ', price: 300000, duration: 45, isOptional: true },
    ]
  },
  {
    name: 'Đánh bóng sơn ô tô nhanh',
    legacyNames: ['Đánh bóng nhanh', 'Đánh bóng sơn ô tô nhanh'],
    description: 'Rửa xe tự động, đánh bóng nhanh xóa xước dăm và phục hồi độ bóng bẩy cho sơn ô tô.',
    price: 180000,
    duration: 40,
    category: 'external',
    vehicleTypes: ['sedan', 'suv', 'pickup', 'van'],
    subServices: [
      { name: 'Rửa xe tự động bọt tuyết', price: 0, duration: 15, isOptional: false },
      { name: 'Đánh bóng bề mặt sơn ô tô', price: 0, duration: 20, isOptional: false },
      { name: 'Dưỡng bóng lốp & nhựa ngoại thất', price: 0, duration: 5, isOptional: false },
      { name: 'Phủ wax bảo vệ sơn', price: 80000, duration: 15, isOptional: true },
      { name: 'Đánh bóng đèn pha ô tô', price: 60000, duration: 10, isOptional: true },
    ]
  }
];

async function updateDbInstance(uri, label) {
  console.log(`\n==================================================`);
  console.log(`>>> CONNECTING TO ${label}: ${uri}`);
  console.log(`==================================================`);
  
  const conn = await mongoose.createConnection(uri).asPromise();
  console.log(`Connected to ${label} successfully!`);

  const BranchModel = conn.model('Branch', require('./src/models/branch.schema.js').schema);
  const PackageModel = conn.model('Package', require('./src/models/package.schema.js').schema);

  // 1. Delete all motorbike packages in this DB instance
  const delRes = await PackageModel.deleteMany({
    $or: [
      { name: /xe máy/i },
      { name: /rửa xe máy/i },
      { description: /xe máy/i }
    ]
  });
  console.log(`[${label}] Deleted ${delRes.deletedCount} motorbike/inappropriate packages.`);

  // 2. Fetch all branches
  const branches = await BranchModel.find({});
  console.log(`[${label}] Found ${branches.length} total branches:`);
  branches.forEach(b => console.log(`  - Branch ID: ${b._id} | Name: "${b.name}"`));

  let totalUpdated = 0;
  let totalCreated = 0;

  for (const branch of branches) {
    console.log(`\nProcessing Branch: "${branch.name}" (${branch._id})...`);
    for (const tpl of CAR_WASH_TEMPLATES) {
      let existing = await PackageModel.findOne({
        branchId: branch._id,
        name: { $in: tpl.legacyNames }
      });

      if (existing) {
        existing.name = tpl.name;
        existing.description = tpl.description;
        existing.price = tpl.price;
        existing.duration = tpl.duration;
        existing.category = tpl.category;
        existing.vehicleTypes = tpl.vehicleTypes;
        existing.subServices = tpl.subServices;
        existing.status = 'active';
        existing.isDeleted = false;
        await existing.save();
        console.log(`  ✓ Updated package: "${tpl.name}"`);
        totalUpdated++;
      } else {
        await PackageModel.create({
          name: tpl.name,
          description: tpl.description,
          price: tpl.price,
          duration: tpl.duration,
          category: tpl.category,
          vehicleTypes: tpl.vehicleTypes,
          branchId: branch._id,
          status: 'active',
          isDeleted: false,
          subServices: tpl.subServices
        });
        console.log(`  + Created package: "${tpl.name}"`);
        totalCreated++;
      }
    }
  }

  console.log(`\n[${label}] SUMMARY: Updated ${totalUpdated} packages, Created ${totalCreated} packages.`);
  await conn.close();
}

async function main() {
  const targetURIs = [
    { uri: process.env.MONGODB_URI, label: 'MONGODB ATLAS (ONLINE)' },
    { uri: 'mongodb://127.0.0.1:27017/washpro', label: 'LOCAL MONGODB' }
  ];

  for (const target of targetURIs) {
    if (!target.uri) continue;
    try {
      await updateDbInstance(target.uri, target.label);
    } catch (err) {
      console.error(`Error processing ${target.label}:`, err.message);
    }
  }

  console.log('\nALL DATABASE INSTANCES UPDATED SUCCESSFULLY!');
  process.exit(0);
}

main();
