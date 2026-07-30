const mongoose = require('mongoose');
const path = require('path');

require(path.join(__dirname, '..', 'src', 'models', 'booking.schema'));
require(path.join(__dirname, '..', 'src', 'models', 'user.schema'));
require(path.join(__dirname, '..', 'src', 'models', 'branch.schema'));
require(path.join(__dirname, '..', 'src', 'models', 'vehicle.schema'));
require(path.join(__dirname, '..', 'src', 'models', 'package.schema'));

const Booking = mongoose.model('Booking');
const User = mongoose.model('User');
const Branch = mongoose.model('Branch');
const Vehicle = mongoose.model('Vehicle');
const Package = mongoose.model('Package');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/washpro';

const FEEDBACK_DATA = [
  { name: 'Lê Văn Cường', content: 'Dịch vụ tốt, đội ngũ chuyên nghiệp. Tôi đặt lịch trước qua website, đến nơi có khoang trống vào rửa ngay không phải xếp hàng chờ đợi cực kỳ tiện lợi.' },
  { name: 'Phạm Thị Dung', content: 'Rửa rất sạch, nhân viên nhiệt tình hỗ trợ dọn sạch nội thất bụi bẩn. Phòng chờ có điều hòa mát mẻ và nước uống phục vụ chu đáo.' },
  { name: 'Nguyễn Văn An', content: 'Công nghệ rửa xe tiên tiến với bọt tuyết chuẩn quốc tế, bảo vệ nước sơn bóng của xe hiệu quả. Đặt lịch rất mượt mà.' },
  { name: 'Trần Minh Tuấn', content: 'Ceramic coating dọn xe cực kỳ bóng bẩy, nhân viên chu đáo hướng dẫn kỹ các lưu ý bảo vệ sơn xe rất tận tâm.' },
  { name: 'Hoàng Thị Mai', content: 'Giao diện Web trực quan. Giá cả minh bạch, chất lượng dọn dẹp xe tuyệt vời đến từng chi tiết nhỏ nhất. Sẽ quay lại.' },
  { name: 'Đặng Văn Hải', content: 'Lần đầu tiên rửa xe ở AutoWash Pro, chất lượng làm sạch nội thất rất kỹ. Xe mình đi cả tuần bụi bẩn bám đầy, sau khi rửa xong sạch bong như mới.' },
  { name: 'Vũ Thị Thanh', content: 'Gói rửa cao cấp rất đáng tiền! Xe được chăm sóc từng chi tiết từ mâm, lốp cho đến nội thất bên trong. Nhân viên tư vấn nhiệt tình, thái độ chuyên nghiệp.' },
  { name: 'Bùi Quốc Bảo', content: 'Đặt lịch online nhanh gọn, tới là có chỗ ngay. Nhân viên kỹ thuật làm việc rất bài bản, có check list trước sau rõ ràng. Mình rất yên tâm.' },
  { name: 'Đỗ Thị Hồng', content: 'Đội ngũ nhân viên thân thiện, không khí phòng chờ thoải mái. Chất lượng đánh bóng sơn vượt ngoài mong đợi, giá cả hợp lý. Cả nhà ai cũng khen.' },
  { name: 'Ngô Văn Phúc', content: 'Mua gói giặt nội thất cho xe 7 chỗ, kết quả rất ưng ý. Xe hết sạch mùi ẩm mốc, ghế da được dưỡng bóng đẹp. Chắc chắn sẽ quay lại thường xuyên.' },
  { name: 'Trương Thị Thu', content: 'Web đặt lịch dễ dùng, chọn được khung giờ phù hợp. Nhân viên hỗ trợ tận nơi hướng dẫn tận tình. Dịch vụ rửa xe tại chỗ chu đáo, nhanh chóng.' },
  { name: 'Phan Đức Duy', content: 'Chăm sóc khách hàng rất tốt, có nhắn tin nhắc lịch trước khi đến. Xe rửa xong sạch sẽ, thơm tho. Mình đã giới thiệu cho bạn bè và ai cũng hài lòng.' },
];

async function seed() {
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const users = await User.find({ role: 'customer' }).limit(20).lean();
  const branches = await Branch.find().limit(20).lean();
  const vehicles = await Vehicle.find().limit(20).lean();
  const pkg = await Package.findOne().lean();

  if (!users.length || !branches.length || !vehicles.length || !pkg) {
    console.log('Missing reference data:', { users: users.length, branches: branches.length, vehicles: vehicles.length, pkg: !!pkg });
    await mongoose.disconnect();
    return;
  }
  console.log(`Found ${users.length} customers, ${branches.length} branches, ${vehicles.length} vehicles, 1+ packages`);

  // Try to update existing bookings first (paid/deposit_paid/completed without feedback)
  let targetBookings = await Booking.find({
    $or: [
      { paymentStatus: 'paid' },
      { paymentStatus: 'deposit_paid' },
    ],
  }).limit(FEEDBACK_DATA.length).lean();

  console.log(`Found ${targetBookings.length} target bookings`);

  let updatedCount = 0;
  for (let i = 0; i < Math.min(targetBookings.length, FEEDBACK_DATA.length); i++) {
    const booking = targetBookings[i];
    const fb = FEEDBACK_DATA[i];
    await Booking.findByIdAndUpdate(booking._id, {
      status: 'completed',
      rating: 5,
      feedback: fb.content,
      feedbackAt: new Date(),
    });
    updatedCount++;
  }

  // Insert remaining as new bookings
  if (updatedCount < FEEDBACK_DATA.length) {
    const remaining = FEEDBACK_DATA.slice(updatedCount);
    const docs = remaining.map((fb, i) => {
      const idx = updatedCount + i;
      const d = new Date();
      d.setDate(d.getDate() - idx);
      return {
        userId: users[idx % users.length]._id,
        branchId: branches[idx % branches.length]._id,
        vehicleId: vehicles[idx % vehicles.length]._id,
        packageId: pkg._id,
        bookingDate: d,
        startTime: '08:00',
        endTime: '09:00',
        status: 'completed',
        paymentStatus: 'paid',
        rating: 5,
        feedback: fb.content,
        feedbackAt: d,
        finalPrice: 200000,
        bookingCode: `AW-SEED-${Date.now()}-${idx}`,
      };
    });
    await Booking.insertMany(docs);
    updatedCount += docs.length;
    console.log(`Inserted ${docs.length} new booking records`);
  }

  console.log(`Total testimonials seeded: ${updatedCount}`);
  await mongoose.disconnect();
  console.log('Done');
}

seed().catch(err => { console.error(err); process.exit(1); });
