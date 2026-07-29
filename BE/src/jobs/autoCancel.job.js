const cron = require('node-cron');
const bookingService = require('../services/booking.service');

// Thời gian khoan dung (phút) sau giờ hẹn trước khi tự động hủy đơn no-show.
//
// CHANGE: tăng từ 5 → 15 phút. Lý do:
//  - 5 phút quá ngắn, khách đến trễ vì kẹt xe / tìm đường / đỗ xe sẽ bị hủy oan.
//  - Cron chạy mỗi 1 phút → độ trễ thực tế 1-6 phút sau deadline, đã trừ 2 phút
//    warning (LATE_WARNING_OFFSET_MINUTES), đơn thực tế chỉ có 2 phút trước khi bị hủy.
//
// CRON DELAY SAFETY: cron chạy mỗi 1 phút nên tolerance thực tế = graceMinutes + 1 phút.
// 15 phút grace + 2 phút warning offset → khách có ~12 phút warning + ~3 phút buffer.
//
// Environment override: AUTO_CANCEL_GRACE_MINUTES cho phép điều chỉnh không cần sửa code.
const GRACE_MINUTES = parseInt(process.env.AUTO_CANCEL_GRACE_MINUTES, 10) || 15;

/**
 * Mỗi 1 phút: tự động hủy các đơn 'pending'/'confirmed' mà khách không đến
 * sau GRACE_MINUTES (+ gia hạn thủ công nếu có) kể từ giờ bắt đầu.
 */
function startAutoCancelJob() {
  cron.schedule('*/1 * * * *', async () => {
    try {
      const result = await bookingService.autoCancelNoShows(GRACE_MINUTES);
      if (result.cancelled > 0 || result.warned > 0) {
        console.log(`[AutoCancelJob] Cancelled ${result.cancelled}, warned ${result.warned} no-show booking(s)`);
      }
    } catch (err) {
      console.error('[AutoCancelJob]', err.message);
    }
  });

  console.log(`[AutoCancelJob] Started — auto-cancels no-show bookings ${GRACE_MINUTES} min after start time (every 1 min)`);
}

module.exports = { startAutoCancelJob };
