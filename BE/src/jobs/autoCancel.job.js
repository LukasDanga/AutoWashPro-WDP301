const cron = require('node-cron');
const bookingService = require('../services/booking.service');

// Thời gian khoan dung (phút) sau giờ hẹn trước khi tự động hủy đơn no-show
const GRACE_MINUTES = 30;

/**
 * Mỗi 5 phút: tự động hủy các đơn 'pending'/'confirmed' mà khách không đến
 * sau GRACE_MINUTES (+ gia hạn thủ công nếu có) kể từ giờ bắt đầu. Giúp giải phóng slot và chống spam.
 * Trước khi hủy, gửi cảnh báo "sắp bị hủy" kèm gợi ý khung giờ trống — xem autoCancelNoShows.
 */
function startAutoCancelJob() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await bookingService.autoCancelNoShows(GRACE_MINUTES);
      if (result.cancelled > 0 || result.warned > 0) {
        console.log(`[AutoCancelJob] Cancelled ${result.cancelled}, warned ${result.warned} no-show booking(s)`);
      }
    } catch (err) {
      console.error('[AutoCancelJob]', err.message);
    }
  });

  console.log(`[AutoCancelJob] Started — auto-cancels no-show bookings ${GRACE_MINUTES} min after start time (every 5 min)`);
}

module.exports = { startAutoCancelJob };
