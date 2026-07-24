const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const optionalServices = [
  { name: 'Xịt gầm xe', price: 30000, duration: 10, isOptional: true },
  { name: 'Khử mùi sinh học', price: 50000, duration: 15, isOptional: true },
  { name: 'Đánh bóng sơn', price: 150000, duration: 30, isOptional: true },
  { name: 'Phủ Ceramic', price: 800000, duration: 60, isOptional: true },
  { name: 'Tẩy ố kính', price: 100000, duration: 20, isOptional: true },
  { name: 'Bảo dưỡng da nội thất', price: 120000, duration: 20, isOptional: true },
  { name: 'Phủ gầm cao su non', price: 300000, duration: 45, isOptional: true },
  { name: 'Vệ sinh giàn lạnh', price: 150000, duration: 30, isOptional: true },
  { name: 'Phục hồi nhựa nhám', price: 80000, duration: 15, isOptional: true },
  { name: 'Tẩy nhựa đường', price: 50000, duration: 10, isOptional: true },
];

const includedMap = {
  'Rửa xe cơ bản': [
    { name: 'Rửa ngoại thất toàn bộ', price: 0, duration: 15, isOptional: false },
    { name: 'Lau khô', price: 0, duration: 5, isOptional: false },
    { name: 'Vệ sinh bánh xe', price: 0, duration: 10, isOptional: false }
  ],
  'Rửa xe + Phủ Nano': [
    { name: 'Rửa ngoại thất chuyên sâu', price: 0, duration: 20, isOptional: false },
    { name: 'Phủ bảo vệ nano', price: 0, duration: 30, isOptional: false }
  ],
  'Vệ sinh toàn diện': [
    { name: 'Chăm sóc ngoại thất', price: 0, duration: 30, isOptional: false },
    { name: 'Vệ sinh nội thất', price: 0, duration: 30, isOptional: false },
    { name: 'Vệ sinh khoang máy', price: 0, duration: 30, isOptional: false }
  ],
  'Rửa xe máy': [
    { name: 'Rửa xe máy sạch bóng', price: 0, duration: 10, isOptional: false },
    { name: 'Lau khô', price: 0, duration: 5, isOptional: false },
    { name: 'Kiểm tra sên xe', price: 0, duration: 5, isOptional: false }
  ]
};

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to DB. Updating packages specifically...');
  const packages = await mongoose.connection.collection('packages').find().toArray();
  
  let updated = 0;
  for (const pkg of packages) {
    let included = includedMap[pkg.name] || [{ name: 'Rửa xe thử nghiệm', price: 0, duration: 5, isOptional: false }];
    const allSubs = [...included, ...optionalServices];
    
    await mongoose.connection.collection('packages').updateOne(
      { _id: pkg._id },
      { $set: { subServices: allSubs } }
    );
    updated++;
  }
  
  console.log(`Updated ${updated} packages specifically.`);
  process.exit(0);
}).catch(console.error);
