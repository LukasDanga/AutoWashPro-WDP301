const cron = require('node-cron');
const bookingService = require('../services/booking.service');

// Thời gian khoan dung (phút) sau giờ hẹn trước khi tự động hủy đơn no-show.
// Chỉ hạ xuống mức chặt (5p) vì đã có lớp đệm: cảnh báo trước + gợi ý đổi giờ +
// quản lý gia hạn thủ công + strike thay vì chặn thẳng — xem docs/booking-autocancel-improvements.md.
const GRACE_MINUTES = 5;

/**
 * Mỗi 1 phút: tự động hủy các đơn 'pending'/'confirmed' mà khách không đến
 * sau GRACE_MINUTES (+ gia hạn thủ công nếu có) kể từ giờ bắt đầu. Giúp giải phóng slot và chống spam.
 * Trước khi hủy, gửi cảnh báo "sắp bị hủy" kèm gợi ý khung giờ trống — xem autoCancelNoShows.
 * Chạy mỗi 1 phút (thay vì 5) vì grace period chỉ còn 5 phút — nếu quét mỗi 5 phút thì độ trễ thực tế
 * có thể lên tới 5-10 phút tùy thời điểm, mất hết ý nghĩa của ngưỡng 5 phút.
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
