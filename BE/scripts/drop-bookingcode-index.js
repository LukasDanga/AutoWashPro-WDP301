const mongoose = require('mongoose');

async function dropBookingCodeIndex() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/washpro';
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const indexes = await db.collection('bookings').indexes();
  const stale = indexes.find(idx => idx.key && idx.key.bookingCode !== undefined);
  if (stale) {
    await db.collection('bookings').dropIndex(stale.name);
    console.log(`Dropped stale index: ${stale.name} (bookingCode)`);
  } else {
    console.log('No stale bookingCode index found.');
  }
  await mongoose.disconnect();
}

dropBookingCodeIndex().catch(console.error);
