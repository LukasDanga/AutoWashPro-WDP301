require('dotenv').config();
const mongoose = require('mongoose');
require('./src/models');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const SlotPack = mongoose.model('SlotPack');
  const User = mongoose.model('User');
  const WalletTransaction = mongoose.model('WalletTransaction');
  
  const packs = await SlotPack.find({ status: 'cancelled', refundStatus: 'pending', refundAmount: { $gt: 0 } });
  for (const p of packs) {
     console.log('Refunding pack:', p.packCode, p.refundAmount);
     await User.findByIdAndUpdate(p.userId, { $inc: { walletBalance: p.refundAmount } });
     await WalletTransaction.create({
       userId: p.userId,
       amount: p.refundAmount,
       type: 'credit',
       reason: 'Hoàn tiền hủy gói lượt ' + p.packCode
     });
     p.refundStatus = 'completed';
     await p.save();
  }
  console.log('Fixed', packs.length, 'packs');
  process.exit(0);
});
