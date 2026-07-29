const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    reason: { type: String, required: true }, // e.g. "Refund for booking #123", "Payment for booking #456"
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }, // Optional, linking to the specific booking
  },
  { timestamps: true }
);

walletTransactionSchema.index({ userId: 1, createdAt: -1 });

// Hook for .save() or .create() (if passing single object)
walletTransactionSchema.post('save', async function (doc, next) {
  try {
    const notificationService = require('../services/notification.service');
    const title = doc.type === 'credit' ? 'Cộng tiền vào ví' : 'Trừ tiền trong ví';
    const amountStr = doc.amount.toLocaleString('vi-VN') + '₫';
    const message = doc.type === 'credit' 
      ? `Ví của bạn vừa được cộng ${amountStr}. Lý do: ${doc.reason}`
      : `Ví của bạn vừa bị trừ ${amountStr}. Lý do: ${doc.reason}`;
    
    await notificationService.send(doc.userId, title, message, 'wallet_transaction', {
      transactionId: doc._id,
      bookingId: doc.bookingId
    });
  } catch (error) {
    console.error('Error generating wallet transaction notification:', error);
  }
  next();
});

// Hook for .insertMany() or .create() with array
walletTransactionSchema.post('insertMany', async function (docs, next) {
  try {
    const notificationService = require('../services/notification.service');
    for (const doc of docs) {
      const title = doc.type === 'credit' ? 'Cộng tiền vào ví' : 'Trừ tiền trong ví';
      const amountStr = doc.amount.toLocaleString('vi-VN') + '₫';
      const message = doc.type === 'credit' 
        ? `Ví của bạn vừa được cộng ${amountStr}. Lý do: ${doc.reason}`
        : `Ví của bạn vừa bị trừ ${amountStr}. Lý do: ${doc.reason}`;
      
      await notificationService.send(doc.userId, title, message, 'wallet_transaction', {
        transactionId: doc._id,
        bookingId: doc.bookingId
      });
    }
  } catch (error) {
    console.error('Error generating wallet transaction notifications:', error);
  }
  next();
});

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
