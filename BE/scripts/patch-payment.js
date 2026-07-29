const fs = require('fs');

const path = 'src/services/payment.service.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix createPayment: session.startTransaction -> session.withTransaction
const oldCreatePayment = `  if (method === 'cash' || method === 'wallet') {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      if (method === 'wallet') {
        const user = await mongoose.model('User').findById(targetUserId).session(session);
        if (!user || user.walletBalance < amount) {
          throw Object.assign(new Error('Số dư ví không đủ để thanh toán'), { statusCode: 400, code: 'INSUFFICIENT_BALANCE' });
        }
        user.walletBalance -= amount;
        await user.save({ session });
        
        await mongoose.model('WalletTransaction').create([{
          userId: targetUserId,
          amount,
          type: 'debit',
          reason: \`Thanh toán \${isDeposit ? 'tiền cọc' : 'đơn'} cho lịch hẹn\`,
          bookingId: booking._id
        }], { session });
      }

      payment.status = 'paid';
      payment.paidAt = new Date();
      await payment.save({ session });

      if (isDeposit) {
        await Booking.findByIdAndUpdate(
          booking._id,
          { paymentStatus: 'deposit_paid', depositPaid: true, depositPaidAt: new Date(), paymentMethod: method },
          { session }
        );
        await markRecurringSiblingsDepositPaid(booking, method, session);
      } else {
        const updateData = { paymentStatus: 'paid', paidAt: new Date(), paymentMethod: method, depositPaid: true, depositAmount: booking.finalPrice };
        if (booking.status === 'awaiting_payment') {
          updateData.status = 'completed';
          updateData.checkOutTime = new Date();
        }
        await Booking.findByIdAndUpdate(
          booking._id,
          updateData,
          { session }
        );
        await markRecurringSiblingsPaid(booking, method, session);
        await loyaltyService.addPointsFromPayment(targetUserId, fullPrice, bookingId, session);
        if (['awaiting_payment', 'completed'].includes(booking.status)) {
          await mongoose.model('User').findByIdAndUpdate(targetUserId, { $inc: { spinCount: 1 } }, { session });
          sseService.sendToUser(targetUserId, 'spin_added', { count: 1 });
        }
      }

      await session.commitTransaction();
    } catch (err) {
      if (session.inTransaction()) { await session.abortTransaction(); }
      if (booking.voucherCode) { await voucherService.rollbackVoucher(booking.voucherCode, targetUserId, bookingId).catch(() => {}); }
      throw err;
    } finally {
      session.endSession();
    }

    const label = isDeposit ? 'tiền cọc' : 'phần còn lại';
    notificationService.send(booking.userId, 'Thanh toán thành công', \`Đã thanh toán \${label} \${amount.toLocaleString('vi-VN')}đ bằng \${method === 'wallet' ? 'Ví AutoWash' : 'tiền mặt'}.\`, 'payment_confirmed', { bookingId, paymentId: payment._id }).catch(() => {});
    notificationService.sendToAdminAndManager(booking.branchId, 'Khách thanh toán thành công', \`Khách hàng đã thanh toán \${label} \${amount.toLocaleString('vi-VN')}đ bằng \${method.toUpperCase()} cho lịch hẹn.\`, 'payment_confirmed', { bookingId, branchId: booking.branchId }).catch(() => {});
    sseService.broadcastToManagers(booking.branchId, 'payment_new', { paymentId: payment._id, bookingId: booking._id });
    return payment;
  }`;

const newCreatePayment = `  if (method === 'cash' || method === 'wallet') {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (method === 'wallet') {
          const user = await mongoose.model('User').findOneAndUpdate(
            { _id: targetUserId, walletBalance: { $gte: amount } },
            { $inc: { walletBalance: -amount } },
            { new: true, session }
          );
          if (!user) {
            throw Object.assign(new Error('Số dư ví không đủ để thanh toán'), { statusCode: 400, code: 'INSUFFICIENT_BALANCE' });
          }
          
          await mongoose.model('WalletTransaction').create([{
            userId: targetUserId,
            amount,
            type: 'debit',
            reason: \`Thanh toán \${isDeposit ? 'tiền cọc' : 'đơn'} cho lịch hẹn\`,
            bookingId: booking._id
          }], { session });
        }

        payment.status = 'paid';
        payment.paidAt = new Date();
        await payment.save({ session });

        if (isDeposit) {
          await Booking.findByIdAndUpdate(
            booking._id,
            { paymentStatus: 'deposit_paid', depositPaid: true, depositPaidAt: new Date(), paymentMethod: method },
            { session }
          );
          await markRecurringSiblingsDepositPaid(booking, method, session);
        } else {
          const updateData = { paymentStatus: 'paid', paidAt: new Date(), paymentMethod: method, depositPaid: true, depositAmount: booking.finalPrice };
          if (booking.status === 'awaiting_payment') {
            updateData.status = 'completed';
            updateData.checkOutTime = new Date();
          }
          await Booking.findByIdAndUpdate(
            booking._id,
            updateData,
            { session }
          );
          await markRecurringSiblingsPaid(booking, method, session);
          await loyaltyService.addPointsFromPayment(targetUserId, fullPrice, bookingId, session);
          if (['awaiting_payment', 'completed'].includes(booking.status)) {
            await mongoose.model('User').findByIdAndUpdate(targetUserId, { $inc: { spinCount: 1 } }, { session });
            sseService.sendToUser(targetUserId, 'spin_added', { count: 1 });
          }
        }
      });
    } catch (err) {
      if (booking.voucherCode) { await voucherService.rollbackVoucher(booking.voucherCode, targetUserId, bookingId).catch(() => {}); }
      throw err;
    } finally {
      session.endSession();
    }

    const label = isDeposit ? 'tiền cọc' : 'phần còn lại';
    notificationService.send(booking.userId, 'Thanh toán thành công', \`Đã thanh toán \${label} \${amount.toLocaleString('vi-VN')}đ bằng \${method === 'wallet' ? 'Ví AutoWash' : 'tiền mặt'}.\`, 'payment_confirmed', { bookingId, paymentId: payment._id }).catch(() => {});
    notificationService.sendToAdminAndManager(booking.branchId, 'Khách thanh toán thành công', \`Khách hàng đã thanh toán \${label} \${amount.toLocaleString('vi-VN')}đ bằng \${method.toUpperCase()} cho lịch hẹn.\`, 'payment_confirmed', { bookingId, branchId: booking.branchId }).catch(() => {});
    sseService.broadcastToManagers(booking.branchId, 'payment_new', { paymentId: payment._id, bookingId: booking._id });
    return payment;
  }`;

content = content.replace(oldCreatePayment, newCreatePayment);

// 2. Fix confirmPaymentCallback
const oldConfirmPaymentCallback = \`exports.confirmPaymentCallback = async (transactionId, gatewayTransactionId, success) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await Payment.findOne({ transactionId }).session(session);
    if (!payment) {
      await session.abortTransaction();
      throw Object.assign(new Error('Thanh toán không tồn tại'), { statusCode: 404, code: 'PAYMENT_NOT_FOUND' });
    }

    if (payment.slotPackId) {
      // Xử lý thanh toán cho SlotPack
      const slotPack = await mongoose.model('SlotPack').findById(payment.slotPackId).session(session);
      if (!slotPack) {
        await session.abortTransaction();
        throw Object.assign(new Error('Gói lượt không tồn tại'), { statusCode: 404, code: 'NOT_FOUND' });
      }

      if (success) {
        payment.status = 'paid';
        payment.paidAt = new Date();
        payment.gatewayTransactionId = gatewayTransactionId || payment.gatewayTransactionId;
        await payment.save({ session });

        if (payment.method === 'wallet') {
          const user = await mongoose.model('User').findOneAndUpdate(
            { _id: payment.userId, walletBalance: { $gte: payment.amount } },
            { $inc: { walletBalance: -payment.amount } },
            { new: true, session }
          );
          if (!user) {
            throw Object.assign(new Error('Số dư ví không đủ để thanh toán'), { statusCode: 400, code: 'INSUFFICIENT_BALANCE' });
          }
          await mongoose.model('WalletTransaction').create([{
            userId: payment.userId,
            amount: payment.amount,
            type: 'debit',
            reason: 'Thanh toán gói lượt rửa xe',
          }], { session });
        }

        await mongoose.model('SlotPack').findByIdAndUpdate(slotPack._id, { paymentStatus: 'paid', paidAt: new Date() }).session(session);
        
        await loyaltyService.addPointsFromPayment(payment.userId, payment.amount, payment.slotPackId, session);
        await mongoose.model('User').findByIdAndUpdate(payment.userId, { $inc: { spinCount: 1 } }, { session });
        sseService.sendToUser(payment.userId, 'spin_added', { count: 1 });
      } else {
        payment.status = 'failed';
        await payment.save({ session });
      }

      await session.commitTransaction();
      if (success) {
        const sPack = await mongoose.model('SlotPack').findById(payment.slotPackId);
        sseService.sendToUser(payment.userId, 'slot_pack_paid', { slotPackId: payment.slotPackId, paymentId: payment._id });
        const user = await mongoose.model('User').findById(payment.userId);
        notificationService.send(payment.userId, 'Thanh toán gói lượt thành công', \`Gói lượt \${sPack.packCode} đã được kích hoạt.\`, 'slot_pack_paid', { slotPackId: payment.slotPackId }).catch(() => {});
        if (user && user.email) {
          emailService.sendSlotPackConfirmationEmail(user.email, sPack).catch(e => console.error('Lỗi gửi email gói lượt:', e));
        }
      }
      return payment;
    }

    // Provisional payment (no bookingId, no slotPackId) — just mark as paid
    if (!payment.bookingId && !payment.slotPackId) {
      if (success) {
        payment.status = 'paid';
        payment.paidAt = new Date();
        payment.gatewayTransactionId = gatewayTransactionId || payment.gatewayTransactionId;
        await payment.save({ session });

        if (payment.paymentType === 'topup') {
          const user = await mongoose.model('User').findOneAndUpdate(
            { _id: payment.userId },
            { $inc: { walletBalance: payment.amount } },
            { new: true, session }
          );
          if (user) {
            await mongoose.model('WalletTransaction').create([{
              userId: payment.userId,
              amount: payment.amount,
              type: 'credit',
              reason: 'Nạp tiền vào ví',
            }], { session });
            sseService.sendToUser(payment.userId, 'wallet_topup_success', { amount: payment.amount });
            notificationService.send(payment.userId, 'Nạp tiền thành công', \`Đã nạp \${payment.amount.toLocaleString('vi-VN')}đ vào ví AutoWash.\`, 'wallet_topup_success', {}).catch(() => {});
          }
        }
      } else {
        payment.status = 'failed';
        await payment.save({ session });
      }
      await session.commitTransaction();
      return payment;
    }

    const booking = await Booking.findById(payment.bookingId).session(session);
    if (!booking) {
      await session.abortTransaction();
      throw Object.assign(new Error('Lịch hẹn không tồn tại'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
    }

    if (success) {
      payment.status = 'paid';
      payment.paidAt = new Date();
      payment.gatewayTransactionId = gatewayTransactionId || payment.gatewayTransactionId;
      await payment.save({ session });

      if (payment.paymentType === 'deposit') {
        await Booking.findByIdAndUpdate(booking._id, { paymentStatus: 'deposit_paid', depositPaid: true, depositPaidAt: new Date(), paymentMethod: payment.method }).session(session);
        await markRecurringSiblingsDepositPaid(booking, payment.method, session);
      } else if (payment.paymentType === 'remaining') {
        // Thanh toán phần còn lại: chỉ đánh dấu booking hiện tại là 'paid',
        // KHÔNG đụng siblings. Giữ nguyên depositAmount.
        const updateData = {
          paymentStatus: 'paid',
          paidAt: new Date(),
          paymentMethod: payment.method,
          depositPaid: true,
        };
        if (booking.status === 'awaiting_payment') {
          updateData.status = 'completed';
          updateData.checkOutTime = new Date();
        }
        await Booking.findByIdAndUpdate(booking._id, updateData, { session });
        if (['awaiting_payment', 'completed'].includes(booking.status)) {
          await mongoose.model('User').findByIdAndUpdate(payment.userId, { $inc: { spinCount: 1 } }, { session });
          sseService.sendToUser(payment.userId, 'spin_added', { count: 1 });
        }
      } else {
        // 'full': thanh toán toàn bộ — đánh dấu booking hiện tại + siblings là 'paid'.
        const updateData = { paymentStatus: 'paid', paidAt: new Date(), paymentMethod: payment.method, depositPaid: true, depositAmount: booking.finalPrice };
        if (booking.status === 'awaiting_payment') {
          updateData.status = 'completed';
          updateData.checkOutTime = new Date();
        }
        await Booking.findByIdAndUpdate(booking._id, updateData).session(session);
        await markRecurringSiblingsPaid(booking, payment.method, session);
        await loyaltyService.addPointsFromPayment(payment.userId, payment.amount, booking._id, session);
        if (['awaiting_payment', 'completed'].includes(booking.status)) {
          await mongoose.model('User').findByIdAndUpdate(payment.userId, { $inc: { spinCount: 1 } }, { session });
          sseService.sendToUser(payment.userId, 'spin_added', { count: 1 });
        }
      }
    } else {
      payment.status = 'failed';
      await payment.save({ session });
    }

    await session.commitTransaction();

    const label = payment.paymentType === 'deposit' ? 'tiền cọc' : 'phần còn lại';
    if (success) {
      notificationService.send(booking.userId, 'Thanh toán thành công', \`Đã thanh toán \${label} \${payment.amount.toLocaleString('vi-VN')}đ.\`, 'payment_confirmed', { bookingId: booking._id, paymentId: payment._id }).catch(() => {});
      notificationService.sendToAdminAndManager(booking.branchId, 'Khách thanh toán thành công', \`Khách hàng đã thanh toán \${label} \${payment.amount.toLocaleString('vi-VN')}đ qua \${payment.method.toUpperCase()}.\`, 'payment_confirmed', { bookingId: booking._id, branchId: booking.branchId }).catch(() => {});
      sseService.broadcastToManagers(booking.branchId, 'payment_new', { paymentId: payment._id, bookingId: booking._id });
    }

    return payment;
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
  }
};\`;

const newConfirmPaymentCallback = \`exports.confirmPaymentCallback = async (transactionId, gatewayTransactionId, success) => {
  const session = await mongoose.startSession();
  let paymentResult = null;

  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findOne({ transactionId }).session(session);
      if (!payment) {
        throw Object.assign(new Error('Thanh toán không tồn tại'), { statusCode: 404, code: 'PAYMENT_NOT_FOUND' });
      }

      // Idempotency check: if already processed, return immediately
      if (payment.status === 'paid' || payment.status === 'failed') {
        paymentResult = payment;
        return; // Break out of withTransaction safely
      }

      if (payment.slotPackId) {
        const slotPack = await mongoose.model('SlotPack').findById(payment.slotPackId).session(session);
        if (!slotPack) {
          throw Object.assign(new Error('Gói lượt không tồn tại'), { statusCode: 404, code: 'NOT_FOUND' });
        }

        if (success) {
          payment.status = 'paid';
          payment.paidAt = new Date();
          payment.gatewayTransactionId = gatewayTransactionId || payment.gatewayTransactionId;
          await payment.save({ session });

          if (payment.method === 'wallet') {
            const user = await mongoose.model('User').findOneAndUpdate(
              { _id: payment.userId, walletBalance: { $gte: payment.amount } },
              { $inc: { walletBalance: -payment.amount } },
              { new: true, session }
            );
            if (!user) {
              throw Object.assign(new Error('Số dư ví không đủ để thanh toán'), { statusCode: 400, code: 'INSUFFICIENT_BALANCE' });
            }
            await mongoose.model('WalletTransaction').create([{
              userId: payment.userId,
              amount: payment.amount,
              type: 'debit',
              reason: 'Thanh toán gói lượt rửa xe',
            }], { session });
          }

          await mongoose.model('SlotPack').findByIdAndUpdate(slotPack._id, { paymentStatus: 'paid', paidAt: new Date() }).session(session);
          
          await loyaltyService.addPointsFromPayment(payment.userId, payment.amount, payment.slotPackId, session);
          await mongoose.model('User').findByIdAndUpdate(payment.userId, { $inc: { spinCount: 1 } }, { session });
          sseService.sendToUser(payment.userId, 'spin_added', { count: 1 });
        } else {
          payment.status = 'failed';
          await payment.save({ session });
        }

        paymentResult = payment;
        return;
      }

      if (!payment.bookingId && !payment.slotPackId) {
        if (success) {
          payment.status = 'paid';
          payment.paidAt = new Date();
          payment.gatewayTransactionId = gatewayTransactionId || payment.gatewayTransactionId;
          await payment.save({ session });

          if (payment.paymentType === 'topup') {
            const user = await mongoose.model('User').findOneAndUpdate(
              { _id: payment.userId },
              { $inc: { walletBalance: payment.amount } },
              { new: true, session }
            );
            if (user) {
              await mongoose.model('WalletTransaction').create([{
                userId: payment.userId,
                amount: payment.amount,
                type: 'credit',
                reason: 'Nạp tiền vào ví',
              }], { session });
            }
          }
        } else {
          payment.status = 'failed';
          await payment.save({ session });
        }
        paymentResult = payment;
        return;
      }

      const booking = await Booking.findById(payment.bookingId).session(session);
      if (!booking) {
        throw Object.assign(new Error('Lịch hẹn không tồn tại'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
      }

      if (success) {
        payment.status = 'paid';
        payment.paidAt = new Date();
        payment.gatewayTransactionId = gatewayTransactionId || payment.gatewayTransactionId;
        await payment.save({ session });

        if (payment.paymentType === 'deposit') {
          await Booking.findByIdAndUpdate(booking._id, { paymentStatus: 'deposit_paid', depositPaid: true, depositPaidAt: new Date(), paymentMethod: payment.method }).session(session);
          await markRecurringSiblingsDepositPaid(booking, payment.method, session);
        } else if (payment.paymentType === 'remaining') {
          const updateData = {
            paymentStatus: 'paid',
            paidAt: new Date(),
            paymentMethod: payment.method,
            depositPaid: true,
          };
          if (booking.status === 'awaiting_payment') {
            updateData.status = 'completed';
            updateData.checkOutTime = new Date();
          }
          await Booking.findByIdAndUpdate(booking._id, updateData, { session });
          if (['awaiting_payment', 'completed'].includes(booking.status)) {
            await mongoose.model('User').findByIdAndUpdate(payment.userId, { $inc: { spinCount: 1 } }, { session });
            sseService.sendToUser(payment.userId, 'spin_added', { count: 1 });
          }
        } else {
          const updateData = { paymentStatus: 'paid', paidAt: new Date(), paymentMethod: payment.method, depositPaid: true, depositAmount: booking.finalPrice };
          if (booking.status === 'awaiting_payment') {
            updateData.status = 'completed';
            updateData.checkOutTime = new Date();
          }
          await Booking.findByIdAndUpdate(booking._id, updateData).session(session);
          await markRecurringSiblingsPaid(booking, payment.method, session);
          await loyaltyService.addPointsFromPayment(payment.userId, payment.amount, booking._id, session);
          if (['awaiting_payment', 'completed'].includes(booking.status)) {
            await mongoose.model('User').findByIdAndUpdate(payment.userId, { $inc: { spinCount: 1 } }, { session });
            sseService.sendToUser(payment.userId, 'spin_added', { count: 1 });
          }
        }
      } else {
        payment.status = 'failed';
        await payment.save({ session });
      }

      paymentResult = payment;
    });

    const payment = paymentResult;

    if (!payment) return payment;
    
    // Side effects only on successful first process
    if (success && (payment.status === 'paid' || payment.status === 'failed')) {
      if (payment.slotPackId) {
        const sPack = await mongoose.model('SlotPack').findById(payment.slotPackId);
        if (sPack) {
          sseService.sendToUser(payment.userId, 'slot_pack_paid', { slotPackId: payment.slotPackId, paymentId: payment._id });
          const user = await mongoose.model('User').findById(payment.userId);
          notificationService.send(payment.userId, 'Thanh toán gói lượt thành công', \`Gói lượt \${sPack.packCode} đã được kích hoạt.\`, 'slot_pack_paid', { slotPackId: payment.slotPackId }).catch(() => {});
          if (user && user.email) {
            emailService.sendSlotPackConfirmationEmail(user.email, sPack).catch(e => console.error('Lỗi gửi email gói lượt:', e));
          }
        }
      } else if (!payment.bookingId && !payment.slotPackId) {
        if (payment.paymentType === 'topup') {
          sseService.sendToUser(payment.userId, 'wallet_topup_success', { amount: payment.amount });
          notificationService.send(payment.userId, 'Nạp tiền thành công', \`Đã nạp \${payment.amount.toLocaleString('vi-VN')}đ vào ví AutoWash.\`, 'wallet_topup_success', {}).catch(() => {});
        }
      } else if (payment.bookingId) {
        const booking = await Booking.findById(payment.bookingId);
        if (booking) {
          const label = payment.paymentType === 'deposit' ? 'tiền cọc' : 'phần còn lại';
          notificationService.send(booking.userId, 'Thanh toán thành công', \`Đã thanh toán \${label} \${payment.amount.toLocaleString('vi-VN')}đ.\`, 'payment_confirmed', { bookingId: booking._id, paymentId: payment._id }).catch(() => {});
          notificationService.sendToAdminAndManager(booking.branchId, 'Khách thanh toán thành công', \`Khách hàng đã thanh toán \${label} \${payment.amount.toLocaleString('vi-VN')}đ qua \${payment.method.toUpperCase()}.\`, 'payment_confirmed', { bookingId: booking._id, branchId: booking.branchId }).catch(() => {});
          sseService.broadcastToManagers(booking.branchId, 'payment_new', { paymentId: payment._id, bookingId: booking._id });
        }
      }
    }

    return payment;
  } catch (err) {
    throw err;
  } finally {
    session.endSession();
  }
};\`;

content = content.replace(oldConfirmPaymentCallback, newConfirmPaymentCallback);

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully patched payment.service.js');
