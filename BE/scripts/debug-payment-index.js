// Debug script to test unique index behavior
const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // 1. Show EXACT index definition from MongoDB
  const indexes = await db.collection('payments').indexes();
  for (const idx of indexes) {
    console.log('Index:', idx.name, '- keys:', JSON.stringify(idx.key), 
      idx.unique ? 'UNIQUE' : '', 
      idx.partialFilterExpression ? `partial: ${JSON.stringify(idx.partialFilterExpression)}` : 'NO partial filter');
  }

  // 2. Check for any existing payments without bookingId but with pending status
  const noBookingPending = await db.collection('payments').find({
    bookingId: { $exists: false },
    status: 'pending'
  }).toArray();
  console.log(`\nPending payments without bookingId: ${noBookingPending.length}`);
  for (const p of noBookingPending) {
    console.log(`  _id: ${p._id}, slotPackId: ${p.slotPackId || '(none)'}, transactionId: ${p.transactionId}, method: ${p.method}`);
  }

  // 3. Manually try to insert two payments without bookingId
  // This simulates what happens when creating two slot pack payments
  console.log('\n--- Test: Creating payment without bookingId ---');
  const testId = new mongoose.Types.ObjectId();
  const testId2 = new mongoose.Types.ObjectId();
  try {
    await db.collection('payments').insertOne({
      _id: testId,
      slotPackId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      amount: 100000,
      method: 'bank',
      paymentType: 'full',
      status: 'pending',
      transactionId: 'TEST_' + Date.now(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('  First insert: OK');
  } catch (err) {
    console.log('  First insert FAILED:', err.message);
  }
  try {
    await db.collection('payments').insertOne({
      _id: testId2,
      slotPackId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      amount: 200000,
      method: 'bank',
      paymentType: 'full',
      status: 'pending',
      transactionId: 'TEST2_' + Date.now(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('  Second insert: OK');
  } catch (err) {
    console.log('  Second insert FAILED:', err.message);
    if (err.code === 11000) {
      console.log('  keyPattern:', JSON.stringify(err.keyPattern));
    }
  }

  // 4. Cleanup test data
  await db.collection('payments').deleteOne({ _id: testId });
  await db.collection('payments').deleteOne({ _id: testId2 });
  console.log('\nTest data cleaned up');

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });