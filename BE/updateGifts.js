const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Voucher = require('./src/models/voucher.schema');
  const res = await Voucher.updateMany(
    { name: { $regex: '^Quà từ vòng quay' } },
    { $set: { applicableToAllBranches: true, applicableToAllPackages: true } }
  );
  console.log('Updated gift vouchers:', res);
  mongoose.disconnect();
});
