/**
 * Backfill spinEarned = true cho các booking đã thanh toán đủ trước đây.
 *
 * Chạy MỘT LẦN sau khi deploy bản fix ở payment.service.js (các nhánh hoàn thành
 * giờ đã set spinEarned=true). Script này gắn cờ cho các booking cũ mà lúc đó
 * mới có `paymentStatus='paid'` nhưng chưa có cờ spinEarned, để đơn hoàn thành
 * cũ hiển thị dòng "Vòng quay may mắn: Đã tặng 1 lượt quay".
 *
 * Cách dùng:
 *   node scripts/backfill-spinEarned.js --dry-run      # xem trước, không ghi
 *   DEBUG_SPIN_BACKFILL=1 node scripts/backfill-spinEarned.js   # chạy thật
 *
 * Chống chạy nhầm trên môi trường production/Atlas trừ khi set DEBUG_SPIN_BACKFILL=1.
 */
const mongoose = require('mongoose');

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (process.env.DEBUG_SPIN_BACKFILL !== '1' && (isProduction || uri.includes('mongodb+srv'))) {
    console.warn('⚠️  Đây có vẻ là DB production/Atlas. Set DEBUG_SPIN_BACKFILL=1 nếu bạn chắc chắn muốn chạy.');
    process.exit(0);
  }

  const dryRun = process.argv.includes('--dry-run');

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
    const bookings = mongoose.connection.db.collection('bookings');
    const filter = { paymentStatus: 'paid', spinEarned: { $ne: true } };

    const total = await bookings.countDocuments(filter);
    console.log(`Booking 'paid' chưa có spinEarned: ${total}`);

    if (dryRun) {
      console.log('(dry-run) Không ghi gì vào DB.');
      await mongoose.disconnect();
      process.exit(0);
    }

    const res = await bookings.updateMany(filter, { $set: { spinEarned: true } });
    console.log(`Đã cập nhật spinEarned=true cho ${res.modifiedCount} booking.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Lỗi:', err);
    process.exit(1);
  }
})();