const mongoose = require('mongoose');
const QRCode = require('qrcode');
const { Payment, Booking } = require('../models');
const notificationService = require('./notification.service');
const sseService = require('./sse.service');
const voucherService = require('./voucher.service');
const emailService = require('./email.service');
const loyaltyService = require('./loyalty.service');

const generateTransactionId = () => `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
const VALID_METHODS = ['cash', 'bank', 'vnpay', 'momo', 'wallet'];

/**
 * Khi thanh toán TOÀN BỘ (full) cho 1 booking thuộc nhóm ĐỊNH KỲ, tiền đã bao gồm
 * giá của tất cả các buổi trong nhóm (xem cách tính fullPrice ở createPayment).
 * Vì vậy phải đánh dấu luôn các buổi còn lại là 'paid' — nếu không, khách đã trả
 * đủ tiền online vẫn bị hệ thống coi là chưa thanh toán ở các buổi sau.
 */
const markRecurringSiblingsPaid = async (booking, paymentMethod, session) => {
  if (booking.bookingType !== 'recurring' || !booking.recurringGroupId) return;
  const q = Booking.updateMany(
    {
      recurringGroupId: booking.recurringGroupId,
      _id: { $ne: booking._id },
      status: { $ne: 'cancelled' },
    },
    { paymentStatus: 'paid', paidAt: new Date(), paymentMethod, depositPaid: true }
  );
  if (session) q.session(session);
  await q;
};

const markRecurringSiblingsDepositPaid = async (booking, paymentMethod, session) => {
  if (booking.bookingType !== 'recurring' || !booking.recurringGroupId) return;
  const q = Booking.updateMany(
    {
      recurringGroupId: booking.recurringGroupId,
      _id: { $ne: booking._id },
      status: { $ne: 'cancelled' },
    },
    { paymentStatus: 'deposit_paid', depositPaidAt: new Date(), paymentMethod, depositPaid: true }
  );
  if (session) q.session(session);
  await q;
};

const generateQrDataUrl = async (transactionId, amount, method, paymentType) => {
  let content;
  if (method === 'bank') {
    const bankId = process.env.SEPAY_BANK_ID;
    const acc = process.env.SEPAY_BANK_ACCOUNT;
    const prefix = paymentType === 'full' ? 'THANH TOAN' : 'DAT COC';
    if (bankId && acc) {
      return `https://qr.sepay.vn/img?bank=${bankId}&acc=${acc}&amount=${amount}&des=${prefix} ${transactionId}`;
    }
    content = `AUTOWASH ${prefix}\nMã GD: ${transactionId}\nSố tiền: ${amount.toLocaleString('vi-VN')}đ`;
    return QRCode.toDataURL(content, { width: 300, margin: 1 });
  }
  return QRCode.toDataURL('Invalid format', { width: 300, margin: 1 });
};

// Hàm poll SePay transactions
const pollSepayTransaction = async (transactionId, amount) => {
  try {
    const apiKey = process.env.SEPAY_API_KEY;
    if (!apiKey) return false;
    // Tự động poll API của SePay để kiểm tra giao dịch (cho môi trường local/không có webhook)
    const res = await fetch('https://my.sepay.vn/userapi/transactions/list', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data && data.transactions && Array.isArray(data.transactions)) {
      // Tìm giao dịch có chứa mã transactionId và số tiền >= yêu cầu
      const match = data.transactions.find(tx => 
        tx.transaction_content?.includes(transactionId) && 
        Number(tx.amount_in) >= amount
      );
      return !!match;
    }
  } catch (err) {
    console.error('Error polling sepay:', err.message);
  }
  return false;
};

exports.createPayment = async (bookingId, requesterId, userRole, method, paymentType = 'full', overrideAmount) => {
  if (!VALID_METHODS.includes(method)) {
    throw Object.assign(new Error('Phương thức thanh toán không hợp lệ'), { statusCode: 400, code: 'INVALID_METHOD' });
  }
  if (!['deposit', 'remaining', 'full'].includes(paymentType)) {
    throw Object.assign(new Error('Loại thanh toán không hợp lệ'), { statusCode: 400, code: 'INVALID_PAYMENT_TYPE' });
  }

  const booking = await Booking.findById(bookingId).populate('packageId');
  if (!booking) throw Object.assign(new Error('Lịch hẹn không tồn tại'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
  if (userRole === 'customer' && String(booking.userId) !== String(requesterId)) {
    throw Object.assign(new Error('Không có quyền truy cập'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  if (booking.status === 'cancelled') {
    throw Object.assign(new Error('Lịch hẹn đã bị hủy'), { statusCode: 400, code: 'BOOKING_CANCELLED' });
  }
  if (!booking.packageId) {
    throw Object.assign(new Error('Gói dịch vụ không tồn tại'), { statusCode: 400, code: 'PACKAGE_NOT_FOUND' });
  }
  if (booking.paymentStatus === 'paid') {
    throw Object.assign(new Error('Lịch hẹn đã được thanh toán'), { statusCode: 409, code: 'ALREADY_PAID' });
  }

  // Với booking ĐỊNH KỲ (recurring): tiền cọc được gộp toàn nhóm vào buổi đầu
  // (isRecurringFirst) còn `finalPrice` của MỖI booking chỉ là giá 1 buổi. Vì vậy
  // khi tính "tổng tiền phải trả" (full) ta phải CỘNG finalPrice của TẤT CẢ buổi
  // trong nhóm — nếu chỉ lấy booking.finalPrice sẽ thu nhầm tiền của 1 buổi.
  let fullPrice = booking.finalPrice ?? booking.packageId.price;
  if (booking.bookingType === 'recurring' && booking.recurringGroupId) {
    const groupBookings = await Booking.find({
      recurringGroupId: booking.recurringGroupId,
      status: { $ne: 'cancelled' },
    })
      .select('finalPrice packageId')
      .populate('packageId', 'price');
    if (groupBookings.length > 0) {
      fullPrice = groupBookings.reduce(
        (sum, b) => sum + (b.finalPrice ?? b.packageId?.price ?? 0),
        0
      );
    }
  }

  const deposit = booking.depositAmount || 0;

  let amount;
  let isDeposit = false;
  if (paymentType === 'deposit') {
    if (deposit <= 0 && !overrideAmount) throw Object.assign(new Error('Đơn này không yêu cầu đặt cọc'), { statusCode: 400, code: 'NO_DEPOSIT_REQUIRED' });
    if (booking.depositPaid) throw Object.assign(new Error('Đã đặt cọc trước đó'), { statusCode: 409, code: 'DEPOSIT_ALREADY_PAID' });
    amount = overrideAmount || deposit;
    isDeposit = true;
  } else {
    // Full: thu phần còn lại nếu đã cọc, ngược lại thu toàn bộ (đã bao gồm cả nhóm nếu recurring)
    amount = booking.depositPaid ? Math.max(0, fullPrice - deposit) : fullPrice;
  }

  const allowedStatuses = isDeposit
    ? ['pending', 'confirmed']
    : ['pending', 'confirmed', 'checked_in', 'in_progress', 'completed'];
  if (!allowedStatuses.includes(booking.status)) {
    throw Object.assign(new Error(`Không thể tạo thanh toán cho lịch hẹn ở trạng thái '${booking.status}'`), { statusCode: 400, code: 'INVALID_BOOKING_STATUS' });
  }

  const targetUserId = booking.userId;

  // Atomically create or get existing pending payment (prevents E11000 race on concurrent requests)
  let payment = await Payment.findOneAndUpdate(
    { bookingId, status: 'pending' },
    {
      $setOnInsert: {
        bookingId,
        userId: targetUserId,
        amount,
        method,
        paymentType,
        transactionId: generateTransactionId(),
        status: 'pending',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Generate QR code for bank deposit if missing
  if (method === 'bank' && isDeposit && !payment.qrCode) {
    payment.qrCode = await generateQrDataUrl(payment.transactionId, amount, method, paymentType);
    await payment.save();
  }

  if (booking.voucherCode) {
    const VoucherUsage = mongoose.model('VoucherUsage');
    const existingUsage = await VoucherUsage.findOne({ bookingId, userId: targetUserId });
    if (!existingUsage) {
      await voucherService.reserveVoucher(booking.voucherCode, targetUserId, bookingId, booking.discountAmount || 0);
    }
  }

  // Cash or Wallet: auto-confirm ngay lập tức
  if (method === 'cash' || method === 'wallet') {
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
          reason: `Thanh toán ${isDeposit ? 'tiền cọc' : 'đơn'} cho lịch hẹn`,
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
        await Booking.findByIdAndUpdate(
          booking._id,
          { paymentStatus: 'paid', paidAt: new Date(), paymentMethod: method },
          { session }
        );
        await markRecurringSiblingsPaid(booking, method, session);
        await loyaltyService.addPointsFromPayment(targetUserId, fullPrice, bookingId, session);
        await mongoose.model('User').findByIdAndUpdate(targetUserId, { $inc: { spinCount: 1 } }, { session });
        sseService.sendToUser(targetUserId, 'spin_added', { count: 1 });
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
    const methodLabel = method === 'wallet' ? 'Ví AutoWash' : 'tiền mặt';
    notificationService.send(booking.userId, 'Thanh toán thành công', `Đã thanh toán ${label} ${amount.toLocaleString('vi-VN')}đ bằng ${methodLabel}.`, 'payment_confirmed', { bookingId, paymentId: payment._id }).catch(() => {});
    notificationService.sendToAdminAndManager(booking.branchId, isDeposit ? 'Khách đã đặt cọc' : 'Thanh toán hoàn tất', `Khách hàng đã thanh toán ${label} ${amount.toLocaleString('vi-VN')}đ cho lịch hẹn.`, 'payment_confirmed', { bookingId, branchId: booking.branchId }).catch(() => {});
    sseService.broadcastToManagers(booking.branchId, 'payment_new', { paymentId: payment._id, bookingId: booking._id });
    return payment;
  }

  // Bank: tạo QR code (deposit hoặc full)
  if (method === 'bank') {
    payment.qrCode = await generateQrDataUrl(payment.transactionId, amount, method, paymentType);
  }
  // VNPay / MoMo: không cần QR, trả về payment record để FE gọi payment service tạo URL
  await payment.save();
  return payment;
};

exports.createSlotPackPayment = async (slotPackId, userId, method, amount) => {
  const slotPack = await mongoose.model('SlotPack').findById(slotPackId);
  if (!slotPack) throw Object.assign(new Error('Gói lượt không tồn tại'), { statusCode: 404, code: 'NOT_FOUND' });

  const existingPending = await Payment.findOne({ slotPackId, status: 'pending' });
  if (existingPending) return existingPending;

  const transactionId = generateTransactionId();
  const payment = new Payment({
    slotPackId,
    userId,
    amount: amount || slotPack.finalPriceAfterVoucher || slotPack.finalPrice,
    method,
    paymentType: 'full',
    status: 'pending',
    transactionId,
  });

  if (method === 'bank') {
    payment.qrCode = await generateQrDataUrl(transactionId, payment.amount, method, 'full');
  }

  try {
    await payment.save();
  } catch (err) {
    console.error('[createSlotPackPayment] save error:', {
      code: err.code,
      message: err.message,
      keyPattern: err.keyPattern,
      bookingIdInDoc: payment.bookingId,
      slotPackId: payment.slotPackId,
      method: payment.method,
      status: payment.status,
      toJSON: JSON.stringify(payment.toObject()),
    });
    throw err;
  }
  return payment;
};

exports.createProvisionalBankPayment = async (userId, amount, paymentType = 'deposit') => {
  const transactionId = generateTransactionId();
  const payment = new Payment({
    userId,
    amount,
    method: 'bank',
    paymentType,
    status: 'pending',
    transactionId,
  });
  payment.qrCode = await generateQrDataUrl(transactionId, amount, 'bank', paymentType);
  await payment.save();
  return payment;
};

exports.getPaymentBySlotPack = async (slotPackId) => {
  let payment = await Payment.findOne({ slotPackId })
    .populate('slotPackId', 'packCode finalPrice paymentStatus')
    .populate('userId', 'name email');

  if (!payment) throw Object.assign(new Error('Thanh toán không tồn tại'), { statusCode: 404, code: 'PAYMENT_NOT_FOUND' });

  // Auto-poll SePay
  if (payment.status !== 'paid' && payment.method === 'bank') {
    const isPaid = await pollSepayTransaction(payment.transactionId, payment.amount);
    if (isPaid) {
      await exports.confirmPaymentCallback(payment.transactionId, 'SEPAY_POLLED', true);
      payment = await Payment.findOne({ slotPackId })
        .populate('slotPackId', 'packCode finalPrice paymentStatus')
        .populate('userId', 'name email');
    }
  }

  return payment;
};

exports.confirmPayment = async (transactionId, method, gatewayTransactionId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const payment = await Payment.findOne({ transactionId }).session(session);
    if (!payment) {
      await session.abortTransaction();
      throw Object.assign(new Error('Thanh toán không tồn tại'), { statusCode: 404, code: 'PAYMENT_NOT_FOUND' });
    }
    if (payment.status === 'paid') {
      await session.commitTransaction();
      return payment;
    }

    if (!payment.bookingId && !payment.slotPackId) {
      payment.status = 'paid';
      payment.paidAt = new Date();
      payment.gatewayTransactionId = gatewayTransactionId || payment.gatewayTransactionId;
      await payment.save({ session });

      if (payment.paymentType === 'topup') {
        const user = await mongoose.model('User').findById(payment.userId).session(session);
        if (user) {
          user.walletBalance = (user.walletBalance || 0) + payment.amount;
          await user.save({ session });
          await mongoose.model('WalletTransaction').create([{
            userId: payment.userId,
            amount: payment.amount,
            type: 'credit',
            reason: 'Nạp tiền vào ví'
          }], { session });
          sseService.sendToUser(payment.userId, 'wallet_topup_success', { amount: payment.amount });
        }
      }
      await session.commitTransaction();
      return payment;
    }

    const booking = await Booking.findById(payment.bookingId).session(session);
    if (!booking) {
      await session.abortTransaction();
      throw Object.assign(new Error('Lịch hẹn không tồn tại'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
    }
    if (!VALID_METHODS.includes(method)) {
      await session.abortTransaction();
      throw Object.assign(new Error('Phương thức thanh toán không hợp lệ'), { statusCode: 400, code: 'INVALID_METHOD' });
    }
    if (booking.status === 'cancelled') {
      await session.abortTransaction();
      throw Object.assign(new Error('Không thể xác nhận thanh toán cho lịch hẹn đã hủy'), { statusCode: 400, code: 'BOOKING_CANCELLED' });
    }

    payment.status = 'paid';
    payment.paidAt = new Date();
    payment.gatewayTransactionId = gatewayTransactionId || payment.gatewayTransactionId;
    await payment.save({ session });

    if (payment.paymentType === 'deposit') {
      await Booking.findByIdAndUpdate(booking._id, { paymentStatus: 'deposit_paid', depositPaid: true, depositPaidAt: new Date(), paymentMethod: payment.method }).session(session);
      await markRecurringSiblingsDepositPaid(booking, payment.method, session);
    } else {
      await Booking.findByIdAndUpdate(booking._id, { paymentStatus: 'paid', paidAt: new Date(), paymentMethod: payment.method }).session(session);
      await markRecurringSiblingsPaid(booking, payment.method, session);
      await loyaltyService.addPointsFromPayment(payment.userId, payment.amount, booking._id, session);
      await mongoose.model('User').findByIdAndUpdate(payment.userId, { $inc: { spinCount: 1 } }, { session });
      sseService.sendToUser(payment.userId, 'spin_added', { count: 1 });
    }

    await session.commitTransaction();

    const label = payment.paymentType === 'deposit' ? 'tiền cọc' : 'thanh toán';
    notificationService.send(booking.userId, 'Thanh toán thành công', `${label} ${payment.amount.toLocaleString('vi-VN')}đ bằng ${payment.method.toUpperCase()} đã được xác nhận.`, 'payment_confirmed', { bookingId: booking._id, paymentId: payment._id }).catch(() => {});
    notificationService.sendToAdminAndManager(booking.branchId, `Thanh toán ${payment.method.toUpperCase()}`, `Khách hàng đã ${label} ${payment.amount.toLocaleString('vi-VN')}đ qua ${payment.method.toUpperCase()}.`, 'payment_confirmed', { bookingId: booking._id, branchId: booking.branchId }).catch(() => {});
    sseService.broadcastToManagers(booking.branchId, 'payment_new', { paymentId: payment._id, bookingId: booking._id });
    return payment;
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
  }
};

exports.countUnviewedPayments = async () => {
  const expiry = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await Payment.updateMany({ viewedAt: null, createdAt: { $lte: expiry } }, { viewedAt: expiry });
  return Payment.countDocuments({ viewedAt: null, status: 'paid' });
};
exports.confirmPaymentCallback = async (transactionId, gatewayTransactionId, success) => {
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
          const user = await mongoose.model('User').findById(payment.userId).session(session);
          if (!user || user.walletBalance < payment.amount) {
            throw Object.assign(new Error('Số dư ví không đủ để thanh toán'), { statusCode: 400, code: 'INSUFFICIENT_BALANCE' });
          }
          user.walletBalance -= payment.amount;
          await user.save({ session });
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
        notificationService.send(payment.userId, 'Thanh toán gói lượt thành công', `Gói lượt ${sPack.packCode} đã được kích hoạt.`, 'slot_pack_paid', { slotPackId: payment.slotPackId }).catch(() => {});
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
          const user = await mongoose.model('User').findById(payment.userId).session(session);
          if (user) {
            user.walletBalance = (user.walletBalance || 0) + payment.amount;
            await user.save({ session });
            await mongoose.model('WalletTransaction').create([{
              userId: payment.userId,
              amount: payment.amount,
              type: 'credit',
              reason: 'Nạp tiền vào ví',
            }], { session });
            sseService.sendToUser(payment.userId, 'wallet_topup_success', { amount: payment.amount });
            notificationService.send(payment.userId, 'Nạp tiền thành công', `Đã nạp ${payment.amount.toLocaleString('vi-VN')}đ vào ví AutoWash.`, 'wallet_topup_success', {}).catch(() => {});
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
      } else {
        await Booking.findByIdAndUpdate(booking._id, { paymentStatus: 'paid', paidAt: new Date(), paymentMethod: payment.method }).session(session);
        await markRecurringSiblingsPaid(booking, payment.method, session);
        await loyaltyService.addPointsFromPayment(payment.userId, payment.amount, booking._id, session);
        await mongoose.model('User').findByIdAndUpdate(payment.userId, { $inc: { spinCount: 1 } }, { session });
        sseService.sendToUser(payment.userId, 'spin_added', { count: 1 });
      }
    } else {
      payment.status = 'failed';
      await payment.save({ session });

      if (booking.voucherCode) {
        await voucherService.rollbackVoucher(booking.voucherCode, payment.userId, booking._id, session);
      }
    }

    await session.commitTransaction();

    if (success) {
      sseService.broadcastToManagers(booking.branchId, 'payment_new', { paymentId: payment._id, bookingId: payment.bookingId });
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
};

exports.getPaymentByBooking = async (bookingId, userId, userRole) => {
  let payment = await Payment.findOne({ bookingId })
    .populate({ path: 'bookingId', populate: { path: 'branchId', select: 'name' }, select: 'bookingDate startTime status userId branchId' })
    .populate('userId', 'name email phone');
  if (!payment) throw Object.assign(new Error('Thanh toán không tồn tại'), { statusCode: 404, code: 'PAYMENT_NOT_FOUND' });
  if (userRole === 'customer' && String(payment.userId?._id || payment.userId) !== String(userId)) {
    throw Object.assign(new Error('Không có quyền truy cập'), { statusCode: 403, code: 'FORBIDDEN' });
  }

  // Tự động kiểm tra trên SePay nếu chưa thanh toán (để hỗ trợ local testing giống Flutter polling)
  if (payment.status !== 'paid' && payment.method === 'bank') {
    const isPaid = await pollSepayTransaction(payment.transactionId, payment.amount);
    if (isPaid) {
      await exports.confirmPaymentCallback(payment.transactionId, 'SEPAY_POLLED', true);
      // Load lại payment sau khi update
      payment = await Payment.findOne({ bookingId })
        .populate({ path: 'bookingId', populate: { path: 'branchId', select: 'name' }, select: 'bookingDate startTime status userId branchId' })
        .populate('userId', 'name email phone');
    }
  }

  return payment;
};

exports.getPaymentById = async (id) => {
  let payment = await Payment.findById(id)
    .populate({ path: 'bookingId', populate: [{ path: 'branchId', select: 'name' }, { path: 'packageId', select: 'name price' }], select: 'bookingDate startTime status branchId packageId' })
    .populate({ path: 'slotPackId', populate: [{ path: 'branchId', select: 'name' }, { path: 'packageId', select: 'name price' }], select: 'packCode totalSlots remainingSlots status branchId packageId' })
    .populate('userId', 'name email phone tier');
  if (!payment) throw Object.assign(new Error('Thanh toán không tồn tại'), { statusCode: 404, code: 'PAYMENT_NOT_FOUND' });

  // Auto-poll SePay if pending & bank method
  if (payment.status !== 'paid' && payment.method === 'bank') {
    const isPaid = await pollSepayTransaction(payment.transactionId, payment.amount);
    if (isPaid) {
      await exports.confirmPaymentCallback(payment.transactionId, 'SEPAY_POLLED', true);
      payment = await Payment.findById(id)
        .populate({ path: 'bookingId', populate: [{ path: 'branchId', select: 'name' }, { path: 'packageId', select: 'name price' }], select: 'bookingDate startTime status branchId packageId' })
        .populate({ path: 'slotPackId', populate: [{ path: 'branchId', select: 'name' }, { path: 'packageId', select: 'name price' }], select: 'packCode totalSlots remainingSlots status branchId packageId' })
        .populate('userId', 'name email phone tier');
    }
  }

  return payment;
};

exports.markPaymentViewed = async (id, userRole) => {
  if (userRole === 'customer') {
    throw Object.assign(new Error('Không có quyền truy cập'), { statusCode: 403, code: 'FORBIDDEN' });
  }
  const payment = await Payment.findByIdAndUpdate(id, { viewedAt: new Date() }, { new: true });
  if (!payment) throw Object.assign(new Error('Thanh toán không tồn tại'), { statusCode: 404, code: 'PAYMENT_NOT_FOUND' });
  return payment;
};

exports.getAllPayments = async (filters = {}, userRole, userId) => {
  const query = {};
  if (userRole === 'customer') {
    query.userId = userId;
  } else {
    if (filters.userId) query.userId = filters.userId;
    if (filters.status) {
      query.status = filters.status;
    } else {
      query.status = { $ne: 'pending' };
    }
    if (filters.method) query.method = filters.method;
    if (filters.dateFrom || filters.dateTo) {
      const dateQuery = {};
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        from.setHours(0, 0, 0, 0);
        if (!isNaN(from.getTime())) dateQuery.$gte = from;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        if (!isNaN(to.getTime())) dateQuery.$lte = to;
      }
      if (Object.keys(dateQuery).length) query.createdAt = dateQuery;
    } else if (filters.today === 'true' || filters.today === true) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    } else if (filters.date) {
      const day = new Date(filters.date);
      const start = new Date(day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(day);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }
  }
  // Auto-mark payments older than 24h as viewed
  const expiry = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await Payment.updateMany({ viewedAt: null, createdAt: { $lte: expiry } }, { viewedAt: expiry });

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Payment.find(query)
      .populate({ path: 'bookingId', populate: [{ path: 'branchId', select: 'name' }, { path: 'packageId', select: 'name price' }], select: 'bookingDate startTime status branchId packageId' })
      .populate({ path: 'slotPackId', populate: [{ path: 'branchId', select: 'name' }, { path: 'packageId', select: 'name price' }], select: 'packCode totalSlots remainingSlots status branchId packageId' })
      .populate('userId', 'name email phone tier')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(query),
  ]);

  let stats = null;
  if (filters.withStats === 'true' || filters.withStats === true) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0,0,0,0);
    
    // Revenue stats grouped by month
    const rawStats = await Payment.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          totalAmount: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    
    stats = rawStats.map(s => ({
      label: `Th${s._id.month}/${s._id.year.toString().slice(-2)}`,
      totalAmount: s.totalAmount
    }));
  }

  return {
    data: (filters.withStats === 'true' || filters.withStats === true) ? { payments: data, stats } : data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
    }
  };
};

exports.getMyPaymentHistory = async (userId, filters = {}) => {
  const query = { userId };
  
  if (filters.status && filters.status !== 'all') {
    query.status = filters.status;
  }
  
  if (filters.paymentType && filters.paymentType !== 'all') {
    query.paymentType = filters.paymentType;
  }
  
  if (filters.month) { // e.g. "2026-07"
    const start = new Date(`${filters.month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    query.createdAt = { $gte: start, $lt: end };
  }

  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 50)); // Default 50
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Payment.find(query)
      .populate({ path: 'bookingId', populate: [{ path: 'branchId', select: 'name' }, { path: 'packageId', select: 'name price' }, { path: 'vehicleId', select: 'licensePlate brand model vehicleType' }], select: 'bookingDate startTime status branchId packageId finalPrice vehicleId' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(query),
  ]);
  
  // If we also want stats (e.g. chart data for the last 6 months)
  let stats = null;
  if (filters.withStats) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0,0,0,0);
    const uid = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    const rawStats = await Payment.aggregate([
      { $match: { userId: uid, status: 'paid', createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          totalAmount: { $sum: "$amount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    
    // Format stats for charting
    const formattedStats = rawStats.map(s => ({
      label: `Th${s._id.month}/${s._id.year.toString().slice(-2)}`,
      totalAmount: s.totalAmount
    }));

    // Vehicle Stats
    const rawVehicleStats = await Payment.aggregate([
      { $match: { userId: uid, status: 'paid' } },
      {
        $lookup: {
          from: 'bookings',
          localField: 'bookingId',
          foreignField: '_id',
          as: 'booking',
        },
      },
      { $unwind: { path: '$booking', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'booking.vehicleId',
          foreignField: '_id',
          as: 'vehicle',
        },
      },
      { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            vehicleId: '$vehicle._id',
            licensePlate: '$vehicle.licensePlate',
            vehicleType: '$vehicle.vehicleType',
            brand: '$vehicle.brand'
          },
          totalAmount: { $sum: "$amount" }
        }
      },
      { $sort: { "totalAmount": -1 } }
    ]);
    const vehicleStats = rawVehicleStats.map(s => ({
      vehicleId: s._id.vehicleId,
      licensePlate: s._id.licensePlate || 'Chưa cập nhật',
      vehicleType: s._id.vehicleType || 'unknown',
      brand: s._id.brand || '',
      totalAmount: s.totalAmount
    }));

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    
    const [currentRes, prevRes] = await Promise.all([
      Payment.aggregate([
        { $match: { userId: uid, status: 'paid', createdAt: { $gte: currentMonthStart } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Payment.aggregate([
        { $match: { userId: uid, status: 'paid', createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    stats = {
      months: formattedStats,
      vehicles: vehicleStats,
      currentMonthTotal: currentRes[0]?.total || 0,
      previousMonthTotal: prevRes[0]?.total || 0,
    };
  }

  return {
    data: filters.withStats ? { payments: data, stats } : data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    }
  };
};

exports.refundPayment = async (bookingId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findById(bookingId).session(session);
    if (!booking) {
      await session.abortTransaction();
      throw Object.assign(new Error('Booking not found'), { statusCode: 404, code: 'BOOKING_NOT_FOUND' });
    }

    const payment = await Payment.findOneAndUpdate(
      { bookingId, status: 'paid' },
      { status: 'refunded', refundedAt: new Date() },
      { new: true, session }
    );
    if (!payment) {
      await session.abortTransaction();
      throw Object.assign(new Error('Chỉ có thể hoàn tiền cho thanh toán đã được thanh toán'), { statusCode: 400, code: 'INVALID_REFUND' });
    }

    if (booking.status === 'in_progress') {
      await session.abortTransaction();
      throw Object.assign(new Error('Không thể hoàn tiền cho lịch hẹn đang thực hiện'), { statusCode: 400, code: 'BOOKING_IN_PROGRESS' });
    }

    await Booking.findByIdAndUpdate(bookingId, { status: 'cancelled', paymentStatus: 'refunded' }).session(session);

    if (booking.voucherCode) {
      await voucherService.rollbackVoucher(booking.voucherCode, payment.userId, bookingId, session);
    }

    // Tự động hoàn tiền vào Ví AutoWash của khách hàng
    const user = await mongoose.model('User').findById(payment.userId).session(session);
    if (user) {
      user.walletBalance = (user.walletBalance || 0) + payment.amount;
      await user.save({ session });
      
      await mongoose.model('WalletTransaction').create([{
        userId: user._id,
        amount: payment.amount,
        type: 'credit',
        reason: `Hoàn tiền cho đơn đặt lịch #${bookingId}`,
        bookingId: booking._id
      }], { session });
    }

    await session.commitTransaction();

    notificationService.send(
      payment.userId,
      'Hoàn tiền thành công',
      `Yêu cầu hoàn tiền ${payment.amount.toLocaleString('vi-VN')}đ đã được xử lý.`,
      'refund',
      { bookingId, paymentId: payment._id }
    ).catch(() => {});

    // Notify admin + manager
    notificationService.sendToAdminAndManager(
      booking.branchId,
      'Hoàn tiền',
      `Đã hoàn tiền ${payment.amount.toLocaleString('vi-VN')}đ cho khách hàng.`,
      'refund',
      { bookingId, branchId: booking.branchId }
    ).catch(() => {});

    return payment;
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
  }
};

exports.deletePaymentsByDateRange = async (dateFrom, dateTo) => {
  const from = new Date(dateFrom);
  from.setHours(0, 0, 0, 0);
  const to = new Date(dateTo);
  to.setHours(23, 59, 59, 999);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    throw Object.assign(new Error('Ngày không hợp lệ'), { statusCode: 400 });
  }
  const result = await Payment.deleteMany({
    createdAt: { $gte: from, $lte: to },
  });
  return { deletedCount: result.deletedCount };
};

exports.deleteAllPayments = async () => {
  const result = await Payment.deleteMany({});
  return { deletedCount: result.deletedCount };
};

