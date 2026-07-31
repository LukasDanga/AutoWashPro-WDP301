/**
 * One-time migration script: backfill includedSubServices and packageSnapshot
 * for all existing Booking and PointHistory records.
 *
 * Usage: node BE/scripts/backfill-snapshots.js
 */
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (_) {}

const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Booking, Package, PointHistory } = require('../src/models');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('No MONGODB_URI found in env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');

  // 1. Backfill Bookings
  const bookings = await Booking.find({});
  let bookingUpdatedCount = 0;
  for (const b of bookings) {
    let modified = false;
    let pkg = null;
    if (b.packageId) {
      try {
        pkg = await Package.findById(b.packageId);
      } catch (_) {}
    }

    if (!Array.isArray(b.includedSubServices) || b.includedSubServices.length === 0) {
      if (pkg && Array.isArray(pkg.subServices)) {
        b.includedSubServices = pkg.subServices
          .filter(s => s.isOptional === false || s.isOptional === undefined)
          .map(s => ({
            name: typeof s === 'string' ? s : s.name,
            price: typeof s === 'object' ? s.price || 0 : 0,
            duration: typeof s === 'object' ? s.duration || 0 : 0,
            isOptional: false,
          }));
        modified = true;
      }
    }

    if (!b.packageSnapshot || !b.packageSnapshot.name) {
      if (pkg) {
        b.packageSnapshot = {
          name: pkg.name,
          price: pkg.price,
          duration: pkg.duration,
          description: pkg.description,
          subServices: Array.isArray(pkg.subServices)
            ? pkg.subServices.map(s => ({
                name: typeof s === 'string' ? s : s.name,
                price: typeof s === 'object' ? s.price || 0 : 0,
                duration: typeof s === 'object' ? s.duration || 0 : 0,
                isOptional: s.isOptional !== false,
              }))
            : [],
        };
        modified = true;
      }
    }

    if (modified) {
      await b.save();
      bookingUpdatedCount++;
    }
  }
  console.log(`[Booking] Backfilled snapshots for ${bookingUpdatedCount} bookings.`);

  // 2. Backfill PointHistory
  const pointHistories = await PointHistory.find({}).populate('referenceId');
  let pointHistoryUpdatedCount = 0;
  for (const ph of pointHistories) {
    let modified = false;
    if (!ph.snapshot) ph.snapshot = {};

    const refBooking = ph.referenceId;
    let pkg = null;
    if (refBooking && refBooking.packageId) {
      try {
        pkg = await Package.findById(refBooking.packageId);
      } catch (_) {}
    }

    if (!Array.isArray(ph.snapshot.includedSubServices) || ph.snapshot.includedSubServices.length === 0) {
      if (refBooking && Array.isArray(refBooking.includedSubServices) && refBooking.includedSubServices.length > 0) {
        ph.snapshot.includedSubServices = refBooking.includedSubServices;
        modified = true;
      } else if (pkg && Array.isArray(pkg.subServices)) {
        ph.snapshot.includedSubServices = pkg.subServices
          .filter(s => s.isOptional === false || s.isOptional === undefined)
          .map(s => ({
            name: typeof s === 'string' ? s : s.name,
            price: typeof s === 'object' ? s.price || 0 : 0,
            duration: typeof s === 'object' ? s.duration || 0 : 0,
            isOptional: false,
          }));
        modified = true;
      }
    }

    if (!ph.snapshot.voucherCode && refBooking && refBooking.voucherCode) {
      ph.snapshot.voucherCode = refBooking.voucherCode;
      modified = true;
    }
    if ((ph.snapshot.discountAmount === undefined || ph.snapshot.discountAmount === 0) && refBooking && refBooking.discountAmount) {
      ph.snapshot.discountAmount = refBooking.discountAmount;
      modified = true;
    }

    if (modified) {
      await ph.save();
      pointHistoryUpdatedCount++;
    }
  }
  console.log(`[PointHistory] Backfilled snapshots for ${pointHistoryUpdatedCount} point history records.`);

  console.log('Migration complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
