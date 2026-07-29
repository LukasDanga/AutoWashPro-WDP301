#!/usr/bin/env node
/**
 * scripts/clear-all-bookings.js
 *
 * SAFETY: script này xóa TẤT CẢ booking — thao tác cực kỳ nguy hiểm.
 *
 * - Mặc định: SOFT DELETE (set isDeleted=true + deletedAt). Có thể khôi phục.
 * - HARD DELETE (deleteMany thật sự) CHỈ chạy khi truyền --hard --i-understand.
 * - Phải có MONGODB_URI trong env. Có --dry-run để preview.
 *
 * Usage:
 *   node scripts/clear-all-bookings.js --dry-run
 *   node scripts/clear-all-bookings.js
 *   node scripts/clear-all-bookings.js --hard --i-understand
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isHard = args.includes('--hard');
const isConfirmed = args.includes('--i-understand');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);

  const Booking = require('../src/models/booking.schema');
  const total = await Booking.countDocuments({});
  const active = await Booking.countDocuments({ isDeleted: { $ne: true } });
  console.log(`📊 Found ${total} bookings (${active} active, ${total - active} already soft-deleted)`);

  if (isDryRun) {
    console.log('✅ Dry-run mode. No changes made.');
    await mongoose.disconnect();
    process.exit(0);
  }

  if (isHard) {
    if (!isConfirmed) {
      console.error('❌ --hard requires --i-understand flag for safety.');
      process.exit(1);
    }
    console.warn('⚠️  HARD DELETE mode!');
    const ack = await ask(`Type "DELETE ALL BOOKINGS" to confirm (case-sensitive): `);
    if (ack !== 'DELETE ALL BOOKINGS') {
      console.log('❌ Aborted.');
      await mongoose.disconnect();
      process.exit(1);
    }
    const result = await Booking.deleteMany({});
    console.error(`🚨 DELETED ${result.deletedCount} bookings. This action is IRREVERSIBLE.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  // Default: soft delete
  const ack = await ask(`Type "SOFT DELETE" to confirm soft-delete of ${active} active bookings (this hides them, recoverable): `);
  if (ack !== 'SOFT DELETE') {
    console.log('❌ Aborted.');
    await mongoose.disconnect();
    process.exit(1);
  }
  const result = await Booking.updateMany(
    { isDeleted: { $ne: true } },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        status: 'cancelled',
        cancelledBy: 'admin',
        cancellationReason: '[CLEAR-ALL-SCRIPT]',
      },
    },
  );
  console.log(`✅ Soft-deleted ${result.modifiedCount} bookings. Recoverable.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
