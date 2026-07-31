/**
 * One-time migration: backfill price snapshots for records created before
 * the snapshot feature:
 *   - Booking.packagePrice      (from Package.price tại thời điểm ghi)
 *   - SlotPack.packageName / packageDuration (từ Package)
 *   - Payment.packageName / packagePrice     (từ Booking/Booking.packageId)
 *
 * Usage: node BE/scripts/backfill-price-snapshots.js
 */
const mongoose = require('mongoose');
const path = require('path');

// Load env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Booking, Package, SlotPack, Payment } = require('../src/models');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  console.log('Connected.');

  // ── 1. Booking.packagePrice ──
  let bookingCursor = Booking.find({
    $or: [{ packagePrice: { $exists: false } }, { packagePrice: null }],
  }).cursor();
  let bookingUpdated = 0;
  let bookingFailed = 0;
  for (let doc = await bookingCursor.next(); doc != null; doc = await bookingCursor.next()) {
    try {
      const pkg = await Package.findById(doc.packageId);
      doc.packagePrice = pkg ? pkg.price : (doc.packagePrice ?? 0);
      await doc.save();
      bookingUpdated++;
    } catch (err) {
      console.error(`Failed booking ${doc._id}:`, err.message);
      bookingFailed++;
    }
  }
  console.log(`[Booking] updated: ${bookingUpdated}, failed: ${bookingFailed}`);

  // ── 2. SlotPack.packageName / packageDuration ──
  let packCursor = SlotPack.find({
    $or: [{ packageName: { $exists: false } }, { packageName: null }],
  }).cursor();
  let packUpdated = 0;
  let packFailed = 0;
  for (let doc = await packCursor.next(); doc != null; doc = await packCursor.next()) {
    try {
      const pkg = await Package.findById(doc.packageId);
      doc.packageName = pkg ? pkg.name : (doc.packageName || '');
      doc.packageDuration = pkg ? pkg.duration : (doc.packageDuration ?? 0);
      await doc.save();
      packUpdated++;
    } catch (err) {
      console.error(`Failed slotPack ${doc._id}:`, err.message);
      packFailed++;
    }
  }
  console.log(`[SlotPack] updated: ${packUpdated}, failed: ${packFailed}`);

  // ── 3. Payment.packageName / packagePrice ──
  let payCursor = Payment.find({
    $or: [{ packageName: { $exists: false } }, { packageName: null }],
  }).cursor();
  let payUpdated = 0;
  let payFailed = 0;
  for (let doc = await payCursor.next(); doc != null; doc = await payCursor.next()) {
    try {
      if (doc.bookingId) {
        const booking = await Booking.findById(doc.bookingId).populate('packageId', 'name price');
        if (booking) {
          doc.packageName = booking.packageName || booking.packageId?.name || '';
          doc.packagePrice = booking.packagePrice ?? booking.packageId?.price ?? 0;
        }
      } else if (doc.slotPackId) {
        const pack = await SlotPack.findById(doc.slotPackId);
        if (pack) {
          doc.packageName = pack.packageName || '';
          doc.packagePrice = pack.unitPrice ?? 0;
        }
      }
      await doc.save();
      payUpdated++;
    } catch (err) {
      console.error(`Failed payment ${doc._id}:`, err.message);
      payFailed++;
    }
  }
  console.log(`[Payment] updated: ${payUpdated}, failed: ${payFailed}`);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => { console.error(err); process.exit(1); });
