const bookingService = require('../services/booking.service');
const paymentService = require('../services/payment.service');
const vnpayService = require('../services/vnpay.service');
const sseService = require('../services/sse.service');
const { catchAsync, success } = require('../utils/helpers');
const QRCode = require('qrcode');

exports.createBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.createBooking({ ...req.body, userId: req.userId });
  sseService.broadcastToAll('slots_updated');
  sseService.sendToUser(booking.userId?._id || booking.userId || req.userId, 'my_bookings_updated', {});
  success(res, booking, 'Booking created', 201);
});

exports.checkRecurringConflicts = catchAsync(async (req, res) => {
  const result = await bookingService.checkRecurringConflicts({ ...req.body, userId: req.userId });
  success(res, result, 'Conflict check completed');
});

exports.createRecurringBooking = catchAsync(async (req, res) => {
  const result = await bookingService.createRecurringBooking({ ...req.body, userId: req.userId });
  sseService.broadcastToAll('slots_updated');
  sseService.sendToUser(req.userId, 'my_bookings_updated', {});
  success(res, result, `Recurring booking created: ${result.totalCreated} bookings`, 201);
});

exports.cancelRecurringGroup = catchAsync(async (req, res) => {
  const result = await bookingService.cancelRecurringGroup(req.params.groupId, req.userId, req.user.role);
  sseService.broadcastToAll('slots_updated');
  sseService.sendToUser(req.userId, 'my_bookings_updated', {});
  success(res, result, `Cancelled ${result.cancelled} bookings in recurring group`);
});

exports.getAllBookings = catchAsync(async (req, res) => {
  const bookings = await bookingService.getAllBookings(req.query, req.user.role, req.userId);
  success(res, bookings, 'Bookings retrieved');
});

exports.getMyBookings = catchAsync(async (req, res) => {
  const result = await bookingService.getAllBookings(req.query, 'customer', req.userId);
  success(res, result, 'My bookings retrieved');
});

exports.getBookingById = catchAsync(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id, req.user.role, req.userId, req.user.branchId);
  success(res, booking, 'Booking retrieved');
});

exports.updateBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.updateBooking(req.params.id, req.body, req.user.role, req.userId);
  sseService.broadcastToAll('slots_updated');
  if (booking && booking.userId) sseService.sendToUser(booking.userId?._id || booking.userId, 'my_bookings_updated', {});
  success(res, booking, 'Booking updated');
});

exports.updateBookingStatus = catchAsync(async (req, res) => {
  const updateData = { ...req.body };
  if (req.body.status === 'checked_in') {
    updateData.staffId = req.userId;
  }
  const booking = await bookingService.updateBookingStatus(req.params.id, req.body.status, updateData, req.user.role, req.user.branchId);
  sseService.broadcastToAll('slots_updated');
  if (booking && booking.userId) sseService.sendToUser(booking.userId?._id || booking.userId, 'my_bookings_updated', {});
  success(res, booking, 'Booking status updated');
});

exports.updateSubServices = catchAsync(async (req, res) => {
  const booking = await bookingService.updateSubServices(req.params.id, req.body.subServices, req.user.role, req.user.branchId, req.userId);
  sseService.broadcastToAll('slots_updated');
  if (booking && booking.userId) sseService.sendToUser(booking.userId?._id || booking.userId, 'my_bookings_updated', {});
  success(res, booking, 'Updated sub-services successfully');
});

exports.extendGracePeriod = catchAsync(async (req, res) => {
  const booking = await bookingService.extendGracePeriod(req.params.id, req.user.role, req.user.branchId);
  success(res, booking, 'Đã gia hạn thời gian check-in cho đơn');
});

exports.cancelBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.cancelBooking(req.params.id, req.userId, req.user.role, req.body.cancellationReason);
  sseService.broadcastToAll('slots_updated');
  if (booking && booking.userId) sseService.sendToUser(booking.userId?._id || booking.userId, 'my_bookings_updated', {});
  success(res, booking, 'Booking cancelled');
});

exports.deleteBooking = catchAsync(async (req, res) => {
  await bookingService.deleteBooking(req.params.id, req.user.role);
  sseService.broadcastToAll('slots_updated');
  success(res, null, 'Booking deleted');
});

exports.deleteBookingsByDateRange = catchAsync(async (req, res) => {
  const { dateFrom, dateTo, all } = req.query;
  let result;
  if (all === 'true') {
    result = await bookingService.deleteAllBookings();
  } else {
    if (!dateFrom || !dateTo) {
      throw Object.assign(new Error('Vui lòng cung cấp dateFrom và dateTo'), { statusCode: 400 });
    }
    result = await bookingService.deleteBookingsByDateRange(dateFrom, dateTo);
  }
  sseService.broadcastToAll('slots_updated');
  success(res, result, `Đã xóa ${result.deletedCount} đặt lịch`);
});

exports.getAvailableSlots = catchAsync(async (req, res) => {
  const { branchId, date, packageId } = req.query;
  console.log('--- GET SLOTS CALLED ---', req.query);
  const slots = await bookingService.getAvailableSlots(branchId, date, packageId);
  console.log('--- SLOTS RETURNED ---', slots.length);
  success(res, slots, 'Available slots retrieved');
});

exports.createPayment = catchAsync(async (req, res) => {
  const { bookingId, method, paymentType, amount } = req.body;
  const payment = await paymentService.createPayment(bookingId, req.userId, req.user.role, method, paymentType || 'full', amount);
  
  const result = payment.toObject ? payment.toObject() : { ...payment };
  
  if (method === 'bank') {
    result.bankInfo = {
      bankName: 'Ngân hàng TMCP Quân đội (MB)',
      bankId: process.env.SEPAY_BANK_ID || 'MB',
      accountNumber: process.env.SEPAY_BANK_ACCOUNT || '',
      accountHolder: 'CONG TY CO PHAN AUTO WASH PRO',
      transferContent: `${paymentType === 'full' ? 'THANH TOAN' : 'DAT COC'} ${payment.transactionId}`,
    };
  }
  
  success(res, result, 'Payment created', 201);
});

exports.confirmBookings = catchAsync(async (req, res) => {
  const { ids } = req.body;
  const result = await bookingService.confirmBookings(ids, req.user.role, req.userId);
  const parts = [`Đã xác nhận ${result.confirmed} đơn`];
  if (result.skippedCount > 0) {
    parts.push(`${result.skippedCount} đơn bị bỏ qua vì chưa đặt cọc`);
  }
  success(res, result, parts.join(' — '));
});

exports.confirmPayment = catchAsync(async (req, res) => {
  const { transactionId, method, gatewayTransactionId } = req.body;
  const payment = await paymentService.confirmPayment(transactionId, method, gatewayTransactionId);
  success(res, payment, 'Payment confirmed');
});

exports.getPaymentByBooking = catchAsync(async (req, res) => {
  const payment = await paymentService.getPaymentByBooking(req.params.bookingId, req.userId, req.user.role);
  success(res, payment, 'Payment retrieved');
});

exports.getPaymentById = catchAsync(async (req, res) => {
  const payment = await paymentService.getPaymentById(req.params.id, req.userId, req.user.role);
  if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404 });
  success(res, payment, 'Payment retrieved');
});

exports.getAllPayments = catchAsync(async (req, res) => {
  const result = await paymentService.getAllPayments(req.query, req.user.role, req.userId);
  success(res, result.data, 'Payments retrieved', 200, result.pagination);
});

exports.getMyPayments = catchAsync(async (req, res) => {
  const result = await paymentService.getMyPaymentHistory(req.userId, req.query);
  success(res, result.data, 'My payments retrieved', 200, result.pagination);
});

exports.markPaymentViewed = catchAsync(async (req, res) => {
  const payment = await paymentService.markPaymentViewed(req.params.id, req.user.role);
  success(res, payment, 'Payment marked as viewed');
});

exports.countUnviewedPayments = catchAsync(async (req, res) => {
  const count = await paymentService.countUnviewedPayments();
  success(res, { count }, 'Unviewed payments count');
});

exports.refundPayment = catchAsync(async (req, res) => {
  const { bookingId } = req.body;
  const payment = await paymentService.refundPayment(bookingId);
  success(res, payment, 'Payment refunded');
});

exports.deletePaymentsByDateRange = catchAsync(async (req, res) => {
  const { dateFrom, dateTo, all } = req.query;
  let result;
  if (all === 'true') {
    result = await paymentService.deleteAllPayments();
  } else {
    if (!dateFrom || !dateTo) {
      throw Object.assign(new Error('Vui lòng cung cấp dateFrom và dateTo'), { statusCode: 400 });
    }
    result = await paymentService.deletePaymentsByDateRange(dateFrom, dateTo);
  }
  success(res, result, `Đã xóa ${result.deletedCount} giao dịch`);
});


exports.getFeedbacks = catchAsync(async (req, res) => {
  const feedbacks = await bookingService.getFeedbacks(req.user, req.query);
  success(res, feedbacks, 'Feedbacks retrieved');
});

exports.getCustomers = catchAsync(async (req, res) => {
  const customers = await bookingService.getCustomers(req.user, req.query);
  success(res, customers, 'Customers retrieved');
});

exports.submitFeedback = catchAsync(async (req, res) => {
  const { rating, feedback } = req.body;
  const booking = await bookingService.submitFeedback(req.params.id, req.userId, { rating, feedback });
  success(res, booking, 'Feedback submitted');
});

exports.replyToFeedback = catchAsync(async (req, res) => {
  const booking = await bookingService.replyToFeedback(req.params.id, req.userId, req.body.reply);
  success(res, booking, 'Reply submitted');
});

exports.rebookBooking = catchAsync(async (req, res) => {
  const { bookingDate, startTime, selectedSubServices, voucherCode } = req.body;
  const booking = await bookingService.rebookBooking(req.params.id, req.userId, req.user.role, { bookingDate, startTime, selectedSubServices, voucherCode });
  success(res, booking, 'Booking rebooked', 201);
});

exports.getBookingQR = catchAsync(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id, req.user.role, req.userId, req.user.branchId);
  if (!booking) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  // QR payload: JSON with bookingId + branchId for cross-validation
  const payload = JSON.stringify({ bookingId: String(booking._id), branchId: String(booking.branchId?._id || booking.branchId) });
  const dataUrl = await QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 2, width: 300 });
  success(res, { qrDataUrl: dataUrl, bookingId: booking._id }, 'QR generated');
});

exports.sepayWebhook = catchAsync(async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^(Apikey|Bearer)\s+/i, '').trim();
  if (process.env.SEPAY_API_KEY && token !== process.env.SEPAY_API_KEY) {
    return res.status(401).json({ success: false, message: 'Invalid API Key' });
  }

  const { content, referenceCode, transferType } = req.body;
  
  // Chỉ xử lý giao dịch nhận tiền
  if (transferType !== 'in') {
    return res.json({ success: true, message: 'Ignored outbound transaction' });
  }

  // Tìm mã giao dịch trong nội dung (ví dụ: TXN123456ABC)
  // content có thể là "WASHPRO TXN123456ABC"
  const match = content ? content.match(/TXN\d+[A-Z0-9]+/) : null;
  if (!match) {
    return res.json({ success: true, message: 'No transaction ID found in content' });
  }

  const transactionId = match[0];
  
  try {
    const payment = await paymentService.confirmPaymentCallback(transactionId, referenceCode || 'SEPAY', true);
    success(res, payment, 'SePay webhook processed successfully');
  } catch (err) {
    // Trả về 200 để SePay không gửi lại webhook nếu giao dịch đã được xử lý hoặc không hợp lệ
    console.error('SePay Webhook error:', err.message);
    res.json({ success: true, message: err.message });
  }
});

exports.simulatePayment = catchAsync(async (req, res) => {
  const { transactionId, gatewayTransactionId } = req.body;
  const payment = await paymentService.confirmPaymentCallback(transactionId, gatewayTransactionId || 'SIMULATED', true);
  success(res, payment, 'Payment simulated successfully');
});

exports.createVnpayProvisional = catchAsync(async (req, res) => {
  const { amount, paymentType } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount' });
  }
  const ipAddr = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';

  const paymentService = require('../services/payment.service');
  const Payment = require('../models/payment.schema');

  const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const payment = new Payment({
    userId: req.userId,
    amount,
    method: 'vnpay',
    paymentType: paymentType || 'full',
    status: 'pending',
    transactionId,
  });
  await payment.save();

  const client = req.body.client || 'web';
  const baseReturnUrl = process.env.VNP_RETURN_URL;
  const targetReturnUrl = baseReturnUrl ? `${baseReturnUrl}?client=${client}` : undefined;

  const vnpayUrl = vnpayService.createPaymentUrl({
    amount,
    ipAddr,
    txnRef: transactionId,
    returnUrl: targetReturnUrl,
  });

  success(res, { paymentUrl: vnpayUrl, transactionId, payment }, 'VNPay provisional URL created');
});

exports.createBankProvisional = catchAsync(async (req, res) => {
  const { amount, paymentType } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount' });
  }
  const paymentService = require('../services/payment.service');
  const payment = await paymentService.createProvisionalBankPayment(req.userId, amount, paymentType || 'deposit');
  success(res, payment, 'Bank provisional payment created');
});

exports.vnpayCallback = catchAsync(async (req, res) => {
  const { transactionId, gatewayTransactionId, status: paymentStatus } = req.body;
  if (!transactionId) {
    return res.status(400).json({ success: false, message: 'Missing transactionId' });
  }
  const isSuccess = paymentStatus !== 'failed';
  const payment = await paymentService.confirmPaymentCallback(transactionId, gatewayTransactionId || 'VNPAY', isSuccess);
  success(res, payment, isSuccess ? 'VNPay payment confirmed' : 'VNPay payment failed');
});

exports.createVnpayPayment = catchAsync(async (req, res) => {
  const { bookingId, paymentType, amount, returnUrl } = req.body;
  const ipAddr = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';

  // Tạo payment record trước
  const payment = await paymentService.createPayment(bookingId, req.userId, req.user.role, 'vnpay', paymentType || 'deposit', amount);
  const client = req.body.client || 'web';
  const baseReturnUrl = process.env.VNP_RETURN_URL;
  const targetReturnUrl = baseReturnUrl 
    ? `${baseReturnUrl}?client=${client}&bookingId=${encodeURIComponent(bookingId)}`
    : (returnUrl || undefined);

  const vnpayUrl = vnpayService.createPaymentUrl({
    amount: payment.amount,
    ipAddr,
    txnRef: payment.transactionId,
    returnUrl: targetReturnUrl,
  });

  success(res, { paymentUrl: vnpayUrl, transactionId: payment.transactionId, payment }, 'VNPay URL created');
});

exports.handleVnpayReturn = catchAsync(async (req, res) => {
  console.log('=== VNPay Return Called ===');
  const result = vnpayService.verifyReturnUrl(req.query);

  const feUrl = process.env.FE_URL || 'http://localhost:5173';
  const resultJson = JSON.stringify(result);
  const encoded = encodeURIComponent(resultJson);

  // Mobile deep link support: if client=mobile was passed in returnUrl,
  // redirect to the app scheme so Expo Router picks it up.
  const isMobile = req.query.client === 'mobile';
  const mobileBookingId = req.query.bookingId || '';

  let isTopup = false;
  const txnRef = result.data?.txnRef || req.query.vnp_TxnRef;
  if (txnRef) {
    try {
      const Payment = require('../models/payment.schema');
      const payment = await Payment.findOne({ transactionId: txnRef });
      if (payment && payment.paymentType === 'topup') {
        isTopup = true;
      }
    } catch (e) {
      console.error('Error checking topup payment:', e);
    }
  }

  if (result.success) {
    try {
      const payment = await paymentService.confirmPaymentCallback(txnRef, result.data.transactionNo || 'VNPAY', true);
      if (isMobile) {
        const deepLinkId = mobileBookingId;
        return res.redirect(302, `autowashpro://payment/checkout?bookingId=${encodeURIComponent(deepLinkId)}&vnpay_result=${encoded}`);
      }
      if (isTopup) {
        return res.redirect(302, `${feUrl}/profile?tab=wallet&vnpay_result=${encoded}`);
      }
      // Provisional & slot pack đều redirect về / (App routing handles dispatch)
      if (payment && (!payment.bookingId || payment.slotPackId)) {
        return res.redirect(302, `${feUrl}/?vnpay_result=${encoded}`);
      }
    } catch (err) {
      console.error('Confirm payment error:', err.message);
    }
  }

  if (isMobile) {
    const deepLinkId = mobileBookingId;
    return res.redirect(302, `autowashpro://payment/checkout?bookingId=${encodeURIComponent(deepLinkId)}&vnpay_result=${encoded}`);
  }
  if (isTopup) {
    return res.redirect(302, `${feUrl}/profile?tab=wallet&vnpay_result=${encoded}`);
  }
  return res.redirect(302, `${feUrl}/booking?vnpay_result=${encoded}`);
});

exports.handleVnpayIPN = catchAsync(async (req, res) => {
  console.log('=== VNPay IPN Called ===');
  const result = vnpayService.verifyReturnUrl(req.query);

  if (result.success) {
    const txnRef = result.data.txnRef;
    try {
      await paymentService.confirmPaymentCallback(txnRef, result.data.transactionNo || 'VNPAY', true);
    } catch (err) {
      console.error('IPN confirm error:', err.message);
    }
    return res.json({ RspCode: '00', Message: 'Confirm Success' });
  }

  return res.json({ RspCode: '97', Message: 'Invalid signature' });
});
