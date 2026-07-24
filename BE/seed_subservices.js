const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

const subServicesTemplate = [
  { name: 'Rửa ngoại thất toàn bộ', price: 0, duration: 15, isOptional: false },
  { name: 'Lau khô', price: 0, duration: 5, isOptional: false },
  { name: 'Vệ sinh bánh xe', price: 0, duration: 10, isOptional: false },
  { name: 'Xịt gầm xe', price: 30000, duration: 10, isOptional: true },
  { name: 'Khử mùi sinh học', price: 50000, duration: 15, isOptional: true },
  { name: 'Đánh bóng sơn', price: 150000, duration: 30, isOptional: true },
  { name: 'Phủ Ceramic', price: 800000, duration: 60, isOptional: true },
  { name: 'Tẩy ố kính', price: 100000, duration: 20, isOptional: true },
  { name: 'Vệ sinh khoang máy', price: 200000, duration: 30, isOptional: true },
  { name: 'Bảo dưỡng da nội thất', price: 120000, duration: 20, isOptional: true },
];

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected to DB. Updating packages...');
  const result = await mongoose.connection.collection('packages').updateMany(
    {}, // all packages
    { $set: { subServices: subServicesTemplate } }
  );
  console.log(`Updated ${result.modifiedCount} packages.`);
  process.exit(0);
}).catch(console.error);
