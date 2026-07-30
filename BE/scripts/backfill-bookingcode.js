require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const cursor = db.collection('bookings').find({
    $or: [
      { bookingCode: { $exists: false } },
      { bookingCode: null },
      { bookingCode: '' },
    ],
  });

  let count = 0;
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
    const code = `AW-${dateStr}-${rand}`;

    await db.collection('bookings').updateOne(
      { _id: doc._id },
      { $set: { bookingCode: code } }
    );
    count++;
    console.log(`  [${count}] Booking ${doc._id} → ${code}`);
  }

  console.log(`\nDone. Updated ${count} bookings.`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
