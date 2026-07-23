// Script: Drop old unique index on payments collection
// The index `bookingId_1_status_1` was previously created without a proper
// `partialFilterExpression`. This caused E11000 "bookingID already exists"
// when creating multiple pending payments without a bookingId (e.g., slot
// pack payments).
//
// Run: node scripts/fix-payment-index.js

const mongoose = require('mongoose');
require('dotenv').config();

const INDEX_NAME = 'bookingId_1_status_1';
const COLLECTION = 'payments';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const indexes = await db.collection(COLLECTION).indexes();

  console.log('Current indexes on', COLLECTION, ':');
  for (const idx of indexes) {
    console.log(' -', idx.name, JSON.stringify(idx.key), idx.unique ? '(unique)' : '', idx.partialFilterExpression ? JSON.stringify(idx.partialFilterExpression) : '(no partial filter)');
  }

  const bad = indexes.find(i => i.name === INDEX_NAME && (!i.partialFilterExpression || !i.partialFilterExpression.bookingId?.['$exists']));
  if (bad) {
    console.log('\nFound bad index (no proper partial filter). Dropping...');
    await db.collection(COLLECTION).dropIndex(INDEX_NAME);
    console.log('Dropped. Mongoose will recreate it on next app start with correct partialFilterExpression.');
  } else {
    console.log('\nIndex looks correct — no action needed.');
  }

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
