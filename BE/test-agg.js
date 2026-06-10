const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const { VoucherUsage } = require('./src/models');
const voucherService = require('./src/services/voucher.service');

async function test() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/washpro');
    console.log('Connected to DB');
    const result = await voucherService.getVoucherUsageReport();
    console.log('Success:', result);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
}

test();
