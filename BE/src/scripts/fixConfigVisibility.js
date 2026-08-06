require('dotenv').config({ path: __dirname + '/../../.env' });
require('dns').setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const { SystemConfig } = require('../models');

// Các key cần mở isPublic để FE đọc được qua /configs/public
const PUBLIC_KEYS = ['GRACE_EXTENSION_STEP_MINUTES', 'MAX_GRACE_EXTENSION_MINUTES', 'DEFAULT_BRANCH_CAPACITY'];

// Các key bị đặt nhầm category
const CATEGORY_FIXES = {
  DEPOSIT_RATE: 'payment',       // chính sách thanh toán
  DEFAULT_BRANCH_CAPACITY: 'booking', // sức chứa chi nhánh là vận hành
  SYSTEM_CANCEL_BONUS_POINTS: 'booking', // điểm đền bù hủy đơn là booking
};

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  for (const key of PUBLIC_KEYS) {
    const res = await SystemConfig.updateMany(
      { key, scope: 'global' },
      { $set: { isPublic: true } }
    );
    console.log(`${key}: isPublic=true, matched=${res.matchedCount}, modified=${res.modifiedCount}`);
  }

  for (const [key, category] of Object.entries(CATEGORY_FIXES)) {
    const res = await SystemConfig.updateMany(
      { key, scope: 'global' },
      { $set: { category } }
    );
    console.log(`${key}: category=${category}, matched=${res.matchedCount}, modified=${res.modifiedCount}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
