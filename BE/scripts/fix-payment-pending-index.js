/**
 * Sửa unique index sai trên collection `payments`.
 *
 * Index cũ dùng `partialFilterExpression: { status: 'pending', bookingId: { $ne: null } }`.
 * MongoDB KHÔNG hỗ trợ `$ne` trong partialFilterExpression, nên index này
 * hoặc build lỗi, hoặc trở thành unique thường trên { bookingId, status }.
 * Hệ quả: các provisional payment (bookingId = null, status = 'pending') đụng
 * khóa { null, pending } và server trả về E11000 "bookingId already exists".
 *
 * Script này drop mọi index unique cũ trên { bookingId, status } rồi tạo lại
 * index đúng với `{ bookingId: { $exists: true }, status: 'pending' }`.
 *
 * Chạy: node scripts/fix-payment-pending-index.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

// Một số môi trường có DNS resolver cục bộ từ chối truy vấn SRV (cần cho
// chuỗi kết nối mongodb+srv:// của Atlas). Ép dùng DNS công cộng để phân giải
// được. Không ảnh hưởng khi DNS hệ thống vốn đã hoạt động.
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', ...dns.getServers()]);
} catch (_) {
  /* bỏ qua nếu môi trường không cho set */
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/washpro';

const isTargetKey = (key) =>
  key && key.bookingId !== undefined && key.status !== undefined && Object.keys(key).length === 2;

async function run() {
  await mongoose.connect(uri);
  const coll = mongoose.connection.db.collection('payments');
  console.log('Connected. Inspecting payments indexes...');

  const indexes = await coll.indexes();
  for (const idx of indexes) {
    if (isTargetKey(idx.key)) {
      console.log(`Dropping old index: ${idx.name} ->`, JSON.stringify(idx.partialFilterExpression || '(no filter)'));
      await coll.dropIndex(idx.name);
    }
  }

  // Dọn trùng: nếu một booking đang có nhiều payment 'pending' (do index cũ
  // hỏng nên không chặn được), giữ lại cái mới nhất, đánh dấu các cái cũ là
  // 'failed' — nếu không, createIndex unique bên dưới sẽ thất bại.
  const dups = await coll.aggregate([
    { $match: { status: 'pending', bookingId: { $ne: null } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$bookingId', ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();

  let staleCount = 0;
  for (const d of dups) {
    const [, ...older] = d.ids; // bỏ cái mới nhất (đầu mảng sau sort desc)
    if (older.length) {
      await coll.updateMany(
        { _id: { $in: older } },
        { $set: { status: 'failed', failureReason: 'Superseded pending payment (index migration)' } }
      );
      staleCount += older.length;
    }
  }
  if (staleCount) console.log(`Marked ${staleCount} duplicate pending payment(s) as failed.`);

  console.log('Creating corrected partial unique index...');
  await coll.createIndex(
    { bookingId: 1, status: 1 },
    {
      unique: true,
      partialFilterExpression: { bookingId: { $exists: true }, status: 'pending' },
      name: 'bookingId_1_status_1',
    }
  );

  const after = await coll.indexes();
  console.log('Done. Current { bookingId, status } indexes:');
  after.filter((i) => isTargetKey(i.key)).forEach((i) =>
    console.log(`  - ${i.name}:`, JSON.stringify(i.partialFilterExpression || '(no filter)'))
  );

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
