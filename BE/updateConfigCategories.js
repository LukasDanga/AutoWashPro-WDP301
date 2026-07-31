const mongoose = require('mongoose');
const { SystemConfig } = require('./src/models');
require('dotenv').config();

const categorize = {
  general: ['DEFAULT_BRANCH_CAPACITY'],
  booking: [
    'MIN_ADVANCE_BOOKING_MINUTES', 
    'LATE_WARNING_OFFSET_MINUTES',
    'GRACE_EXTENSION_STEP_MINUTES',
    'MAX_GRACE_EXTENSION_MINUTES',
    'AUTO_CANCEL_GRACE_MINUTES'
  ],
  payment: [
    'DEPOSIT_RATE',
    'LATE_CANCEL_THRESHOLD_MINUTES',
    'LATE_CANCEL_PENALTY_FULL_PERCENT',
    'LATE_CANCEL_PENALTY_DEPOSIT_PERCENT'
  ]
};

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  for (const [category, keys] of Object.entries(categorize)) {
    for (const key of keys) {
      await SystemConfig.updateMany({ key }, { category });
    }
  }
  
  console.log('Categories updated!');
  process.exit(0);
}
run();
