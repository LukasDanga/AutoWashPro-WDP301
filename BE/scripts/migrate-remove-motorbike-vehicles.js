/**
 * Migration: Remap unsupported vehicleTypes to 'sedan'
 *
 * BE schema enum VEHICLE_TYPE = ['sedan', 'suv', 'pickup', 'van'] — but older
 * data or manual inserts may have created documents with vehicleType = 'motorbike'.
 * This script finds those documents and resets vehicleType to 'sedan' so the
 * enum constraint is respected.
 *
 * Usage: node scripts/migrate-remove-motorbike-vehicles.js
 */

require('../src/config/env');
const mongoose = require('mongoose');
const Vehicle = require('../src/models/vehicle.schema');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function main() {
  if (!MONGO_URI) {
    console.error('❌  No MONGO_URI / MONGODB_URI found in environment.');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);

  const result = await Vehicle.updateMany(
    { vehicleType: 'motorbike' },
    { $set: { vehicleType: 'sedan' } }
  );

  console.log(`✅  Updated ${result.modifiedCount} vehicle(s) from 'motorbike' → 'sedan'.`);
  console.log(`   Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}.`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌  Migration failed:', err.message);
  process.exit(1);
});
