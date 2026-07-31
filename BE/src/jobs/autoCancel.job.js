const cron = require('node-cron');
const bookingService = require('../services/booking.service');
const configService = require('../services/config.service');

/**
 * Mỗi 1 phút: tự động hủy các đơn 'pending'/'confirmed' mà khách không đến
 * sau GRACE_MINUTES (+ gia hạn thủ công nếu có) kể từ giờ bắt đầu.
 */
function startAutoCancelJob() {
  cron.schedule('*/1 * * * *', async () => {
    try {
      const graceMinutes = await configService.get('AUTO_CANCEL_GRACE_MINUTES', {}, 15);
      const result = await bookingService.autoCancelNoShows(graceMinutes);
      if (result.cancelled > 0 || result.warned > 0) {
        console.log(`[AutoCancelJob] Cancelled ${result.cancelled}, warned ${result.warned} no-show booking(s)`);
      }
    } catch (err) {
      console.error('[AutoCancelJob]', err.message);
    }
  });

  console.log(`[AutoCancelJob] Started — auto-cancels no-show bookings (every 1 min)`);
}

module.exports = { startAutoCancelJob };
