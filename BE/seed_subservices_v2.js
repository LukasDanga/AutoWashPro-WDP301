const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const optionalServices = [
  { name: 'Xịt rửa gầm áp lực cao', price: 30000, duration: 10, isOptional: true },
  { name: 'Hút bụi nội thất ô tô', price: 50000, duration: 15, isOptional: true },
  { name: 'Khử mùi sinh học', price: 50000, duration: 15, isOptional: true },
  { name: 'Đánh bóng sơn', price: 150000, duration: 30, isOptional: true },
  { name: 'Phủ Ceramic', price: 800000, duration: 60, isOptional: true },
  { name: 'Tẩy ố kính', price: 100000, duration: 20, isOptional: true },
  { name: 'Bảo dưỡng da nội thất', price: 120000, duration: 20, isOptional: true },
  { name: 'Phủ gầm cao su chống gỉ', price: 300000, duration: 45, isOptional: true },
  { name: 'Vệ sinh khoang máy bằng hơi nước', price: 150000, duration: 30, isOptional: true },
  { name: 'Phục hồi nhựa nhám', price: 80000, duration: 15, isOptional: true },
  { name: 'Tẩy nhựa đường', price: 50000, duration: 10, isOptional: true },
];

const includedMap = {
  'Rửa ô tô cơ bản': [
    { name: 'Phun bọt tuyết tự động', price: 0, duration: 5, isOptional: false },
    { name: 'Rửa vỏ xe bằng chổi xoay tự động', price: 0, duration: 15, isOptional: false },
    { name: 'Xịt sấy khô tự động', price: 0, duration: 5, isOptional: false },
    { name: 'Dưỡng bóng lốp xe', price: 0, duration: 5, isOptional: false }
  ],
  'Rửa ô tô + Phủ Nano': [
    { name: 'Phun bọt tuyết & rửa tự động chuyên sâu', price: 0, duration: 15, isOptional: false },
    { name: 'Xịt rửa gầm áp lực cao', price: 0, duration: 10, isOptional: false },
    { name: 'Phủ sáp bóng Nano bảo vệ sơn xe', price: 0, duration: 15, isOptional: false },
    { name: 'Sấy khô & lau kính sạch bóng', price: 0, duration: 10, isOptional: false }
  ],
  'Vệ sinh toàn diện ô tô': [
    { name: 'Rửa xe tự động & xịt gầm cao cấp', price: 0, duration: 20, isOptional: false },
    { name: 'Hút bụi & Vệ sinh nội thất chi tiết', price: 0, duration: 30, isOptional: false },
    { name: 'Khử mùi sinh học / Khử trùng Ozone', price: 0, duration: 25, isOptional: false },
    { name: 'Phủ bóng sáp sơn xe & dưỡng lốp', price: 0, duration: 15, isOptional: false }
  ],
  'Đánh bóng sơn ô tô nhanh': [
    { name: 'Rửa xe tự động bọt tuyết', price: 0, duration: 15, isOptional: false },
    { name: 'Đánh bóng bề mặt sơn ô tô', price: 0, duration: 20, isOptional: false },
    { name: 'Dưỡng bóng lốp & nhựa ngoại thất', price: 0, duration: 5, isOptional: false }
  ]
};

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/washpro';
  try {
    console.log('Connecting to DB...');
    await mongoose.connect(uri);
    console.log('Connected to DB. Updating packages specifically...');
    
    // Delete motorbike packages
    await mongoose.connection.collection('packages').deleteMany({
      $or: [{ name: /xe máy/i }, { description: /xe máy/i }]
    });

    const packages = await mongoose.connection.collection('packages').find().toArray();
    
    let updated = 0;
    for (const pkg of packages) {
      let included = includedMap[pkg.name] || [
        { name: 'Rửa vỏ ô tô tự động', price: 0, duration: 15, isOptional: false },
        { name: 'Sấy khô tự động', price: 0, duration: 5, isOptional: false }
      ];
      const allSubs = [...included, ...optionalServices];
      
      await mongoose.connection.collection('packages').updateOne(
        { _id: pkg._id },
        { $set: { subServices: allSubs } }
      );
      updated++;
    }
    
    console.log(`Updated ${updated} packages specifically.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
