const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

require(path.join(__dirname, '..', 'src', 'models', 'reward.schema'));
const Reward = mongoose.model('Reward');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/washpro';

const sampleRewards = [
  // ── HẠNG ĐỒNG (Bronze - Mọi hạng, từ 15k - 50k điểm) ──
  {
    name: 'Nước hoa khử mùi ô tô cao cấp D.A.S (50ml)',
    description: 'Chiết xuất tinh dầu tự nhiên giúp loại bỏ mùi hôi, ẩm mốc và mang lại cảm giác thư thái, dễ chịu cho khoang nội thất xe.',
    imageUrl: 'https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=800&auto=format&fit=crop&q=80',
    pointCost: 15000,
    stock: 45,
    requiredTier: 'bronze',
    status: 'active',
    sortOrder: 1,
  },
  {
    name: 'Bộ khăn lau xe Microfiber chuyên dụng 40x40cm (Bộ 4 cái)',
    description: 'Khăn dệt sợi Microfiber siêu thấm hút, siêu mềm mịn không để lại vệt xước trên bề mặt sơn và kính xe.',
    imageUrl: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=800&auto=format&fit=crop&q=80',
    pointCost: 25000,
    stock: 30,
    requiredTier: 'bronze',
    status: 'active',
    sortOrder: 2,
  },
  {
    name: 'Dung dịch rửa kính chống bám nước AutoWash (Can 1L)',
    description: 'Tẩy sạch bụi bẩn, dầu mỡ, xác côn trùng trên kính lái; tạo hiệu ứng lá sen giúp tầm nhìn rõ ràng khi đi mưa.',
    imageUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&auto=format&fit=crop&q=80',
    pointCost: 35000,
    stock: 25,
    requiredTier: 'bronze',
    status: 'active',
    sortOrder: 3,
  },

  // ── HẠNG BẠC (Silver - Từ 65k - 120k điểm) ──
  {
    name: 'Dầu nhớt động cơ tổng hợp Shell Helix 5W-30 (4 Liters)',
    description: 'Dầu nhớt ô tô cao cấp giúp động cơ vận hành êm ái, bôi trơn hoàn hảo, giảm ma sát và tiết kiệm nhiên liệu tối ưu.',
    imageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=80',
    pointCost: 65000,
    stock: 20,
    requiredTier: 'silver',
    status: 'active',
    sortOrder: 4,
  },
  {
    name: 'Chai xịt dưỡng bóng lốp & phục hồi nhựa nhám 3M Gloss (500ml)',
    description: 'Phục hồi độ bóng đen nguyên bản cho lốp xe và chi tiết nhựa nội ngoại thất, chống lão hóa và tác động tia UV.',
    imageUrl: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=800&auto=format&fit=crop&q=80',
    pointCost: 85000,
    stock: 18,
    requiredTier: 'silver',
    status: 'active',
    sortOrder: 5,
  },
  {
    name: 'Bơm lốp ô tô mini điện tử 12V tự động ngắt màn hình LCD',
    description: 'Máy bơm lốp cầm tay thông minh, đo áp suất lốp chính xác, tự động dừng khi đạt áp suất chuẩn, kèm đèn LED chiếu sáng.',
    imageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&auto=format&fit=crop&q=80',
    pointCost: 110000,
    stock: 15,
    requiredTier: 'silver',
    status: 'active',
    sortOrder: 6,
  },

  // ── HẠNG VÀNG (Gold - Từ 180k - 300k điểm) ──
  {
    name: 'Máy hút bụi ô tô cầm tay không dây công suất lớn 120W',
    description: 'Sử dụng pin sạc Lithium, lực hút cực mạnh 12.000Pa kết hợp màng lọc HEPA rửa được, dọn sạch vụn thức ăn và bụi bẩn.',
    imageUrl: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&auto=format&fit=crop&q=80',
    pointCost: 180000,
    stock: 12,
    requiredTier: 'gold',
    status: 'active',
    sortOrder: 7,
  },
  {
    name: 'Bộ máy & hóa chất đánh bóng nội thất ô tô chuyên nghiệp',
    description: 'Combo sản phẩm chăm sóc toàn diện: Xi đánh bóng táp-lô, dung dịch dưỡng da thật cao cấp và chổi cước làm sạch khe hẹp.',
    imageUrl: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?w=800&auto=format&fit=crop&q=80',
    pointCost: 230000,
    stock: 10,
    requiredTier: 'gold',
    status: 'active',
    sortOrder: 8,
  },
  {
    name: 'Camera hành trình 4K ghi hình kép trước sau tích hợp Wifi',
    description: 'Ghi hình Ultra HD 4K sắc nét cả ngày lẫn đêm, ống kính góc rộng 170 độ, phát Wifi xem và tải clip trực tiếp về điện thoại.',
    imageUrl: 'https://images.unsplash.com/photo-1508974239320-0a029497e820?w=800&auto=format&fit=crop&q=80',
    pointCost: 290000,
    stock: 8,
    requiredTier: 'gold',
    status: 'active',
    sortOrder: 9,
  },

  // ── HẠNG KIM CƯƠNG (Diamond - Từ 350k - 600k điểm) ──
  {
    name: 'Bộ gối tựa cổ & tựa lưng cao su non đúc nguyên khối bọc da Nappa',
    description: 'Thiết kế chuẩn nhân trắc học nâng đỡ cột sống cổ và thắt lưng, chất liệu cao su non Memory Foam chống mệt mỏi đường dài.',
    imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80',
    pointCost: 360000,
    stock: 8,
    requiredTier: 'diamond',
    status: 'active',
    sortOrder: 10,
  },
  {
    name: 'Máy lọc không khí ô tô màng HEPA H13 & Phát Ion âm diệt khuẩn',
    description: 'Lọc sạch 99.97% bụi mịn PM2.5, khói thuốc và nấm mốc; phát ra 10 triệu Ion âm/cm3 thanh lọc không khí khoang xe.',
    imageUrl: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&auto=format&fit=crop&q=80',
    pointCost: 450000,
    stock: 6,
    requiredTier: 'diamond',
    status: 'active',
    sortOrder: 11,
  },
  {
    name: 'Gói phủ Ceramic Nano cao cấp 9H bảo vệ sơn xe 2 năm',
    description: 'Thi công phủ bóng 3 lớp Ceramic 9H chuẩn Pro, tăng độ sáng bóng như gương 200%, chống trầy xước dăm và kháng hóa chất.',
    imageUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80',
    pointCost: 580000,
    stock: 5,
    requiredTier: 'diamond',
    status: 'active',
    sortOrder: 12,
  },
];

async function seedRewards() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected successfully!');

    // Xóa dữ liệu quà cũ nếu có
    await Reward.deleteMany({});
    console.log('Cleared old rewards collection.');

    // Thêm danh sách quà mới
    const created = await Reward.insertMany(sampleRewards);
    console.log(`Successfully seeded ${created.length} physical rewards into database!`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding rewards:', error);
    process.exit(1);
  }
}

seedRewards();
