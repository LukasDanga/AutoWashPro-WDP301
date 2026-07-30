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
  
  const emailService = require('../services/email.service');
  const User = require('../models/user.schema');
  const user = await User.findById(req.userId);
  if (user && user.email) {
    emailService.sendBookingConfirmationEmail(user.email, booking).catch(e => console.error('Lỗi gửi email xác nhận đặt lịch:', e));
  }

  success(res, booking, 'Đặt lịch thành công', 201);
});

exports.checkRecurringConflicts = catchAsync(async (req, res) => {
  const result = await bookingService.checkRecurringConflicts({ ...req.body, userId: req.userId });
  success(res, result, 'Kiểm tra trùng lịch hoàn tất');
});

exports.createRecurringBooking = catchAsync(async (req, res) => {
  const result = await bookingService.createRecurringBooking({ ...req.body, userId: req.userId });
  sseService.broadcastToAll('slots_updated');
  sseService.sendToUser(req.userId, 'my_bookings_updated', {});
  
  if (result.created && result.created.length > 0) {
    const emailService = require('../services/email.service');
    const User = require('../models/user.schema');
    const user = await User.findById(req.userId);
    if (user && user.email) {
      emailService.sendBookingConfirmationEmail(user.email, result.created[0]).catch(e => console.error('Lỗi gửi email xác nhận đặt lịch định kỳ:', e));
    }
  }

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
  success(res, bookings, 'Đã lấy danh sách đặt lịch');
});

exports.getMyBookings = catchAsync(async (req, res) => {
  const result = await bookingService.getAllBookings(req.query, 'customer', req.userId);
  success(res, result, 'Đã lấy danh sách đặt lịch của tôi');
});

exports.getBookingsByUser = catchAsync(async (req, res) => {
  const { period } = req.query;
  let startDate;
  if (period === 'today') {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'month') {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const bookings = await bookingService.getBookingsByUser(req.params.userId, startDate);
  success(res, bookings, 'Đã lấy danh sách đặt lịch của khách hàng');
});

exports.getBookingsByVehicle = catchAsync(async (req, res) => {
  const { period } = req.query;
  let startDate;
  if (period === 'today') {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'month') {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const bookings = await bookingService.getBookingsByVehicle(req.params.vehicleId, startDate);
  success(res, bookings, 'Đã lấy danh sách đặt lịch của xe');
});

exports.getBookingById = catchAsync(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id, req.user.role, req.userId, req.user.branchId);
  success(res, booking, 'Đã lấy thông tin đặt lịch');
});

exports.updateBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.updateBooking(req.params.id, req.body, req.user.role, req.userId);
  sseService.broadcastToAll('slots_updated');
  if (booking && booking.userId) sseService.sendToUser(booking.userId?._id || booking.userId, 'my_bookings_updated', {});
  success(res, booking, 'Cập nhật đặt lịch thành công');
});

exports.updateBookingStatus = catchAsync(async (req, res) => {
  const updateData = { ...req.body };
  if (req.body.status === 'checked_in') {
    updateData.staffId = req.userId;
  }
  const booking = await bookingService.updateBookingStatus(req.params.id, req.body.status, updateData, req.user.role, req.user.branchId);
  sseService.broadcastToAll('slots_updated');
  if (booking && booking.userId) sseService.sendToUser(booking.userId?._id || booking.userId, 'my_bookings_updated', {});
  success(res, booking, 'Cập nhật trạng thái đặt lịch thành công');
});

exports.updateSubServices = catchAsync(async (req, res) => {
  const booking = await bookingService.updateSubServices(req.params.id, req.body.subServices, req.user.role, req.user.branchId, req.userId);
  sseService.broadcastToAll('slots_updated');
  if (booking && booking.userId) sseService.sendToUser(booking.userId?._id || booking.userId, 'my_bookings_updated', {});
  success(res, booking, 'Cập nhật dịch vụ phụ thành công');
});

exports.extendGracePeriod = catchAsync(async (req, res) => {
  const booking = await bookingService.extendGracePeriod(req.params.id, req.user.role, req.user.branchId);
  success(res, booking, 'Đã gia hạn thời gian check-in cho đơn');
});

exports.getCancelPreview = catchAsync(async (req, res) => {
  const preview = await bookingService.getCancelPreview(req.params.id, req.userId);
  success(res, preview, 'Xem trước hủy lịch');
});

exports.requestCancelOtp = catchAsync(async (req, res) => {
  const emailService = require('../services/email.service');
  const Booking = require('../models/booking.schema');
  
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw Object.assign(new Error('Lịch hẹn không tồn tại'), { statusCode: 404 });
  if (String(booking.userId) !== String(req.userId)) {
    throw Object.assign(new Error('Không có quyền hủy lịch hẹn này'), { statusCode: 403 });
  }
  if (['in_progress', 'completed', 'cancelled'].includes(booking.status)) {
    throw Object.assign(new Error('Không thể yêu cầu OTP hủy lúc này'), { statusCode: 400 });
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const bcrypt = require('bcryptjs');
  
  booking.cancelOtpToken = bcrypt.hashSync(otp, 12);
  booking.cancelOtpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
  await booking.save();

  // Need user email
  const User = require('../models/user.schema');
  const user = await User.findById(req.userId);
  if (user && user.email) {
    emailService.sendCancellationOtpEmail(user.email, otp).catch(e => console.error('Lỗi gửi OTP hủy đơn:', e));
  }

  success(res, null, 'OTP đã được gửi đến email của bạn');
});

exports.cancelBooking = catchAsync(async (req, res) => {
  const bcrypt = require('bcryptjs');
  const Booking = require('../models/booking.schema');

  if (req.user.role === 'customer') {
    if (!req.body.otp) {
      throw Object.assign(new Error('Vui lòng nhập mã OTP để xác nhận hủy đơn'), { statusCode: 400 });
    }
    const booking = await Booking.findById(req.params.id);
    if (!booking || !booking.cancelOtpToken || !booking.cancelOtpExpires) {
      throw Object.assign(new Error('Yêu cầu OTP không hợp lệ hoặc đã hết hạn'), { statusCode: 400 });
    }
    if (Date.now() > booking.cancelOtpExpires) {
      throw Object.assign(new Error('Mã OTP đã hết hạn, vui lòng lấy mã mới'), { statusCode: 400 });
    }
    const isMatch = bcrypt.compareSync(req.body.otp, booking.cancelOtpToken);
    if (!isMatch) {
      throw Object.assign(new Error('Mã OTP không chính xác'), { statusCode: 400 });
    }
  }

  const booking = await bookingService.cancelBooking(req.params.id, req.userId, req.user.role, req.body.cancellationReason);
  
  if (req.user.role === 'customer') {
    // Xóa OTP
    await Booking.findByIdAndUpdate(req.params.id, {
      $unset: { cancelOtpToken: "", cancelOtpExpires: "" }
    });
  }

  sseService.broadcastToAll('slots_updated');
  if (booking && booking.userId) sseService.sendToUser(booking.userId?._id || booking.userId, 'my_bookings_updated', {});
  success(res, booking, 'Hủy lịch thành công');
});
exports.deleteBooking = catchAsync(async (req, res) => {
  await bookingService.deleteBooking(req.params.id, req.user.role);
  sseService.broadcastToAll('slots_updated');
  success(res, null, 'Đã xóa đặt lịch');
});

exports.refundComplete = catchAsync(async (req, res) => {
  const Booking = require('../models/booking.schema');
  const booking = await Booking.findById(req.params.id);
  
  if (!booking) {
    throw Object.assign(new Error('Lịch hẹn không tồn tại'), { statusCode: 404 });
  }
  if (booking.refundStatus !== 'pending') {
    throw Object.assign(new Error('Lịch hẹn này không chờ hoàn tiền'), { statusCode: 400 });
  }
  
  booking.refundStatus = 'completed';
  await booking.save();
  
  success(res, booking, 'Đã xác nhận hoàn tiền thành công');
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
  success(res, slots, 'Đã lấy danh sách khung giờ trống');
});

exports.createPayment = catchAsync(async (req, res) => {
  const { bookingId, method, paymentType, amount } = req.body;
  const payment = await paymentService.createPayment(bookingId, req.userId, req.user.role, method, paymentType || 'full', amount);
  
  const result = payment.toObject ? payment.toObject() : { ...payment };
  
  if (method === 'bank') {
    result.bankInfo = {
      bankName: process.env.SEPAY_BANK_NAME || 'Ngân hàng TMCP Quân đội (MB)',
      bankId: process.env.SEPAY_BANK_ID || 'MB',
      accountNumber: process.env.SEPAY_BANK_ACCOUNT || '',
      accountHolder: process.env.SEPAY_ACCOUNT_NAME || 'CONG TY CO PHAN AUTO WASH PRO',
      transferContent: `${paymentType === 'full' ? 'THANH TOAN' : 'DAT COC'} ${payment.transactionId}`,
    };
  }
  
  success(res, result, 'Tạo thanh toán thành công', 201);
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
  success(res, payment, 'Xác nhận thanh toán thành công');
});

exports.getPaymentByBooking = catchAsync(async (req, res) => {
  const payment = await paymentService.getPaymentByBooking(req.params.bookingId, req.userId, req.user.role);
  success(res, payment, 'Đã lấy thông tin thanh toán');
});

exports.getPaymentById = catchAsync(async (req, res) => {
  const payment = await paymentService.getPaymentById(req.params.id, req.userId, req.user.role);
  if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404 });
  
  const result = payment.toObject ? payment.toObject() : { ...payment };
  if (result.method === 'bank') {
    result.bankInfo = {
      bankName: process.env.SEPAY_BANK_NAME || 'Ngân hàng TMCP Quân đội (MB)',
      bankId: process.env.SEPAY_BANK_ID || 'MB',
      accountNumber: process.env.SEPAY_BANK_ACCOUNT || '',
      accountHolder: process.env.SEPAY_ACCOUNT_NAME || 'CONG TY CO PHAN AUTO WASH PRO',
      transferContent: `${result.paymentType === 'full' ? 'THANH TOAN' : 'DAT COC'} ${result.transactionId}`,
    };
  }
  
  success(res, result, 'Đã lấy thông tin thanh toán');
});

exports.getAllPayments = catchAsync(async (req, res) => {
  const result = await paymentService.getAllPayments(req.query, req.user.role, req.userId);
  success(res, result.data, 'Đã lấy danh sách thanh toán', 200, result.pagination);
});

exports.getMyPayments = catchAsync(async (req, res) => {
  const result = await paymentService.getMyPaymentHistory(req.userId, req.query);
  success(res, result.data, 'Đã lấy danh sách thanh toán của tôi', 200, result.pagination);
});

exports.markPaymentViewed = catchAsync(async (req, res) => {
  const payment = await paymentService.markPaymentViewed(req.params.id, req.user.role);
  success(res, payment, 'Đánh dấu thanh toán đã xem');
});

exports.countUnviewedPayments = catchAsync(async (req, res) => {
  const count = await paymentService.countUnviewedPayments();
  success(res, { count }, 'Số lượng thanh toán chưa xem');
});

exports.refundPayment = catchAsync(async (req, res) => {
  const { bookingId } = req.body;
  const payment = await paymentService.refundPayment(bookingId);
  success(res, payment, 'Đã hoàn tiền');
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
  success(res, feedbacks, 'Đã lấy danh sách đánh giá');
});

exports.getCustomers = catchAsync(async (req, res) => {
  const customers = await bookingService.getCustomers(req.user, req.query);
  success(res, customers, 'Đã lấy danh sách khách hàng');
});

exports.submitFeedback = catchAsync(async (req, res) => {
  const { rating, feedback } = req.body;
  const booking = await bookingService.submitFeedback(req.params.id, req.userId, { rating, feedback });
  success(res, booking, 'Gửi đánh giá thành công');
});

exports.replyToFeedback = catchAsync(async (req, res) => {
  const booking = await bookingService.replyToFeedback(req.params.id, req.userId, req.body.reply);
  success(res, booking, 'Gửi phản hồi thành công');
});

exports.deleteSingleFeedback = catchAsync(async (req, res) => {
  const result = await bookingService.deleteSingleFeedback(req.params.id);
  sseService.broadcastToAll('feedback_new');
  success(res, result, 'Đã xóa đánh giá thành công');
});

exports.deleteFeedbacksByDateRange = catchAsync(async (req, res) => {
  const { dateFrom, dateTo, all } = req.query;
  const result = await bookingService.deleteFeedbacksByDateRange(dateFrom, dateTo, all === 'true');
  sseService.broadcastToAll('feedback_new');
  success(res, result, `Đã xóa ${result.deletedCount} đánh giá`);
});

exports.rebookBooking = catchAsync(async (req, res) => {
  const { bookingDate, startTime, selectedSubServices, voucherCode } = req.body;
  const booking = await bookingService.rebookBooking(req.params.id, req.userId, req.user.role, { bookingDate, startTime, selectedSubServices, voucherCode });
  success(res, booking, 'Đặt lại lịch thành công', 201);
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
    success(res, payment, 'Xử lý webhook SePay thành công');
  } catch (err) {
    // Trả về 200 để SePay không gửi lại webhook nếu giao dịch đã được xử lý hoặc không hợp lệ
    console.error('SePay Webhook error:', err.message);
    res.json({ success: true, message: err.message });
  }
});

exports.simulatePayment = catchAsync(async (req, res) => {
  const { transactionId, gatewayTransactionId } = req.body;
  const payment = await paymentService.confirmPaymentCallback(transactionId, gatewayTransactionId || 'SIMULATED', true);
  success(res, payment, 'Mô phỏng thanh toán thành công');
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
  const client = req.body.client || 'web';
  const payment = new Payment({
    userId: req.userId,
    amount,
    method: 'vnpay',
    paymentType: paymentType || 'full',
    status: 'pending',
    transactionId,
    client,
  });
  await payment.save();

  const baseReturnUrl = process.env.VNPAY_RETURN_URL;
  const targetReturnUrl = baseReturnUrl || undefined;

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
  
  const result = payment.toObject ? payment.toObject() : { ...payment };
  result.bankInfo = {
    bankName: process.env.SEPAY_BANK_NAME || 'Ngân hàng TMCP Quân đội (MB)',
    bankId: process.env.SEPAY_BANK_ID || 'MB',
    accountNumber: process.env.SEPAY_BANK_ACCOUNT || '',
    accountHolder: process.env.SEPAY_ACCOUNT_NAME || 'CONG TY CO PHAN AUTO WASH PRO',
    transferContent: `${paymentType === 'topup' ? 'NAP VI' : paymentType === 'full' ? 'THANH TOAN' : 'DAT COC'} ${payment.transactionId}`,
  };
  
  success(res, result, 'Tạo thanh toán tạm tính ngân hàng thành công');
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

  // Lưu client type vào payment record
  const Payment = require('../models/payment.schema');
  await Payment.findByIdAndUpdate(payment._id, { client });

  const baseReturnUrl = process.env.VNPAY_RETURN_URL;
  const targetReturnUrl = baseReturnUrl || undefined;

  const vnpayUrl = vnpayService.createPaymentUrl({
    amount: payment.amount,
    ipAddr,
    txnRef: payment.transactionId,
    returnUrl: targetReturnUrl,
  });

  success(res, { paymentUrl: vnpayUrl, transactionId: payment.transactionId, payment }, 'VNPay URL created');
});

const sendMobileRedirect = (res, deepLink) => {
  console.log('VNPay Return → Mobile redirect HTML to:', deepLink);
  return res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Đang chuyển hướng về ứng dụng...</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
        .card { text-align: center; background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 90%; width: 360px; }
        .icon { width: 56px; height: 56px; background: #dcfce7; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto; font-size: 28px; font-weight: bold; }
        .btn { display: inline-block; margin-top: 1.5rem; padding: 0.75rem 1.5rem; background-color: #1E88E5; color: white; text-decoration: none; border-radius: 0.5rem; font-weight: 600; width: 100%; box-sizing: border-box; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">✓</div>
        <h2 style="margin: 0 0 0.5rem 0; font-size: 20px;">Thanh toán hoàn tất</h2>
        <p style="color: #64748b; font-size: 14px; margin: 0;">Đang mở ứng dụng AutoWash Pro...</p>
        <a href="${deepLink}" class="btn">Mở lại ứng dụng</a>
      </div>
      <script>
        window.location.href = "${deepLink}";
        setTimeout(function() {
          window.location.replace("${deepLink}");
        }, 300);
      </script>
    </body>
    </html>
  `);
};

exports.handleVnpayReturn = catchAsync(async (req, res) => {
  console.log('=== VNPay Return Called ===');
  console.log('VNPay Return query:', JSON.stringify(req.query));
  const result = vnpayService.verifyReturnUrl(req.query);

  const feUrl = process.env.FE_URL || 'http://localhost:5173';
  const resultJson = JSON.stringify(result);
  const encoded = encodeURIComponent(resultJson);

  const txnRef = result.data?.txnRef || req.query.vnp_TxnRef;

  // Lookup payment record → determine client type & bookingId
  let isMobile = false;
  let mobileBookingId = '';
  let isTopup = false;
  let isSlotPack = false;

  if (txnRef) {
    try {
      const Payment = require('../models/payment.schema');
      const paymentRecord = await Payment.findOne({ transactionId: txnRef });
      if (paymentRecord) {
        isMobile = paymentRecord.client === 'mobile';
        mobileBookingId = paymentRecord.bookingId ? String(paymentRecord.bookingId) : '';
        isTopup = paymentRecord.paymentType === 'topup';
        isSlotPack = !!paymentRecord.slotPackId;
        console.log('VNPay Return payment lookup:', {
          txnRef,
          client: paymentRecord.client,
          isMobile,
          mobileBookingId,
          isTopup,
          isSlotPack,
          paymentType: paymentRecord.paymentType,
          status: paymentRecord.status,
        });
      } else {
        console.log('VNPay Return: no payment found for txnRef:', txnRef);
      }
    } catch (e) {
      console.error('Error looking up payment:', e.message);
    }
  }

  let mobileDeepLink = `autowashpro://payment/checkout?bookingId=${encodeURIComponent(mobileBookingId)}&vnpay_result=${encoded}`;
  if (isSlotPack) {
    mobileDeepLink = `autowashpro://slot-packs?vnpay_result=${encoded}`;
  } else if (isTopup) {
    mobileDeepLink = `autowashpro://wallet?vnpay_result=${encoded}`;
  }

  if (result.success) {
    try {
      const payment = await paymentService.confirmPaymentCallback(txnRef, result.data.transactionNo || 'VNPAY', true);
      console.log('VNPay Return confirmPaymentCallback result:', { paymentId: payment?._id, status: payment?.status, bookingId: payment?.bookingId });
      if (isMobile) {
        return sendMobileRedirect(res, mobileDeepLink);
      }
      if (isTopup) {
        return res.redirect(302, `${feUrl}/profile?tab=wallet&vnpay_result=${encoded}`);
      }
      // Provisional & slot pack đều redirect về / (App routing handles dispatch)
      if (payment && (!payment.bookingId || payment.slotPackId)) {
        return res.redirect(302, `${feUrl}/?vnpay_result=${encoded}`);
      }
      // Pay remaining cho booking đã tồn tại → redirect về history
      if (payment && payment.bookingId) {
        return res.redirect(302, `${feUrl}/history?vnpay_result=${encoded}`);
      }
    } catch (err) {
      console.error('VNPay Return confirmPayment error:', err.message);
    }
  } else {
    console.log('VNPay Return: signature verification failed:', result.message);
  }

  if (isMobile) {
    return sendMobileRedirect(res, mobileDeepLink);
  }
  if (isTopup) {
    return res.redirect(302, `${feUrl}/profile?tab=wallet&vnpay_result=${encoded}`);
  }
  return res.redirect(302, `${feUrl}/history?vnpay_result=${encoded}`);
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
