// Clean up payments with bookingId=null that corrupt the unique partial index.
// Run: node scripts/clean-null-booking-payments.js
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const coll = db.collection('payments');

  // Mark stale pending payments with bookingId=null as failed
  const r = await coll.updateMany(
    { bookingId: null, status: 'pending' },
    { $set: { status: 'failed', failureReason: 'Stale pending payment cleaned up' } }
  );
  console.log(`Marked ${r.modifiedCount} payments with bookingId=null as failed.`);

  // Verify
  const remaining = await coll.countDocuments({ bookingId: null, status: 'pending' });
  console.log(`Remaining pending payments with bookingId=null: ${remaining}`);

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });