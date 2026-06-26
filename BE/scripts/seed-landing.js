const mongoose = require('mongoose');
const path = require('path');

require(path.join(__dirname, '..', 'src', 'models', 'slotProduct.schema'));
require(path.join(__dirname, '..', 'src', 'models', 'gift.schema'));

const SlotProduct = mongoose.model('SlotProduct');
const Gift = mongoose.model('Gift');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/washpro';

async function seed() {
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  if (process.env.FORCE) {
    await SlotProduct.deleteMany({});
    await Gift.deleteMany({});
    console.log('Cleared existing data');
  }

  const existingProducts = await SlotProduct.countDocuments();
  if (existingProducts === 0 || process.env.FORCE) {
    await SlotProduct.insertMany([
      {
        name: 'Cơ bản',
        description: 'Gói 5 lượt rửa xe tiết kiệm',
        slots: 5, price: 399000, originalPrice: 495000,
        features: ['Rửa cơ bản', 'Xịt gầm', 'Lau khô', 'Hút bụi nhanh'],
        popular: false, sortOrder: 1, status: 'active',
      },
      {
        name: 'Tiêu chuẩn',
        description: 'Gói 10 lượt rửa xe phổ biến nhất',
        slots: 10, price: 699000, originalPrice: 990000,
        features: ['Rửa cơ bản', 'Rửa cao cấp', 'Vệ sinh nội thất', 'Ưu tiên xếp lịch'],
        popular: true, sortOrder: 2, status: 'active',
      },
      {
        name: 'Cao cấp',
        description: 'Gói 20 lượt rửa xe cho khách VIP',
        slots: 20, price: 1190000, originalPrice: 1980000,
        features: ['Tất cả dịch vụ', 'Phủ ceramic giảm 20%', 'Ưu tiên khung giờ VIP', 'Hỗ trợ ưu tiên 24/7'],
        popular: false, sortOrder: 3, status: 'active',
      },
    ]);
    console.log('Seeded slot products');
  } else {
    console.log('Slot products already exist, skipping');
  }

  const existingGifts = await Gift.countDocuments();
  if (existingGifts === 0 || process.env.FORCE) {
    await Gift.insertMany([
      {
        name: 'Voucher rửa xe',
        description: 'Tặng bạn bè một lần rửa xe cao cấp bất kì chi nhánh',
        price: 249000, emoji: '🎁', bgColor: 'from-rose-50 to-amber-50',
        sortOrder: 1, status: 'active',
      },
      {
        name: 'Gói chăm sóc 3 tháng',
        description: '3 tháng rửa xe không giới hạn số lần, tặng kèm vệ sinh nội thất',
        price: 599000, emoji: '✨', bgColor: 'from-blue-50 to-cyan-50',
        sortOrder: 2, status: 'active',
      },
      {
        name: 'Phiếu quà tặng',
        description: 'Thẻ quà tặng mệnh giá tuỳ chọn, có thể nạp vào tài khoản',
        price: 0, isCustomPrice: true, emoji: '💳', bgColor: 'from-purple-50 to-pink-50',
        sortOrder: 3, status: 'active',
      },
      {
        name: 'Combo rửa + phủ Ceramic',
        description: 'Gói phủ ceramic cao cấp + 5 lần rửa miễn phí',
        price: 1790000, emoji: '🌟', bgColor: 'from-emerald-50 to-teal-50',
        sortOrder: 4, status: 'active',
      },
      {
        name: 'Gói chăm sóc nội thất',
        description: 'Giặt ghế, vệ sinh trần, khử mùi chuyên sâu + bảo dưỡng da',
        price: 799000, emoji: '🧹', bgColor: 'from-orange-50 to-yellow-50',
        sortOrder: 5, status: 'active',
      },
      {
        name: 'Thẻ VIP thành viên',
        description: 'Giảm 15% tất cả dịch vụ, ưu tiên xếp lịch, hỗ trợ 24/7',
        price: 299000, emoji: '👑', bgColor: 'from-slate-50 to-zinc-50',
        sortOrder: 6, status: 'active',
      },
    ]);
    console.log('Seeded gifts');
  } else {
    console.log('Gifts already exist, skipping');
  }

  await mongoose.disconnect();
  console.log('Done');
}

seed().catch(err => { console.error(err); process.exit(1); });
