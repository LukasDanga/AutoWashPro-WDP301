/**
 * One-time migration: backfill packageName / packageDuration for bookings
 * created before the schema change.
 *
 * Usage: node BE/scripts/backfill-package-info.js
 */
const mongoose = require('mongoose');
const path = require('path');

// Load env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Booking, Package } = require('../src/models');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('Connected.');

  const cursor = Booking.find({
    $or: [
      { packageName: { $exists: false } },
      { packageDuration: { $exists: false } },
    ],
  }).cursor();

  let updated = 0;
  let failed = 0;

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    try {
      const pkg = await Package.findById(doc.packageId);
      doc.packageName = pkg ? pkg.name : (doc.packageName || 'Gói dịch vụ');
      doc.packageDuration = pkg ? pkg.duration : (doc.packageDuration || 30);
      await doc.save();
      updated++;
    } catch (err) {
      console.error(`Failed booking ${doc._id}:`, err.message);
      failed++;
    }
  }

  console.log(`Done. Updated: ${updated}, Failed: ${failed}`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
