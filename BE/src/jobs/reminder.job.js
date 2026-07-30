const cron = require('node-cron');
const { Booking } = require('../models');
const notificationService = require('../services/notification.service');

/**
 * Every 5 minutes: find bookings starting in the next 60-65 min and send reminder.
 * We use a 5-min window on each run to avoid double-sending.
 */
function startReminderJob() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const soon = new Date(now.getTime() + 60 * 60 * 1000);   // +60 min
      const soonEnd = new Date(now.getTime() + 65 * 60 * 1000); // +65 min

      // Lấy ngày hiện tại theo giờ Việt Nam
      const vnTime = new Date(now.getTime() + 7 * 3600 * 1000);
      const todayStr = vnTime.toISOString().split('T')[0];
      
      const gte = new Date(`${todayStr}T00:00:00.000+07:00`);
      const lte = new Date(`${todayStr}T23:59:59.999+07:00`);

      const bookings = await Booking.find({
        status: { $in: ['pending', 'checked_in'] },
        bookingDate: { $gte: gte, $lte: lte },
      }).populate('branchId', 'name').populate('vehicleId', 'licensePlate');

      for (const b of bookings) {
        // Parse startTime HH:mm and combine with booking date
        const [hh, mm] = (b.startTime || '').split(':').map(Number);
        if (isNaN(hh) || isNaN(mm)) continue;

        // Do bookingDate có thể lưu dưới dạng UTC hoặc VN time, ta lấy phần ngày VN:
        const bTimeVN = new Date(b.bookingDate.getTime() + 7 * 3600 * 1000);
        const bDateStr = bTimeVN.toISOString().split('T')[0];
        
        const bookingStart = new Date(`${bDateStr}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00+07:00`);

        if (bookingStart >= soon && bookingStart < soonEnd) {
          const plate = b.vehicleId?.licensePlate || '';
          const branch = b.branchId?.name || 'chi nhánh';
          await notificationService.send(
            b.userId,
            'Nhắc lịch rửa xe',
            `Lịch rửa xe ${plate} tại ${branch} sẽ bắt đầu lúc ${b.startTime} hôm nay. Vui lòng có mặt đúng giờ!`,
            'booking_reminder',
            { bookingId: b._id }
          );
        }
      }
    } catch (err) {
      console.error('[ReminderJob]', err.message);
    }
  });

  console.log('[ReminderJob] Started — checks every 5 minutes for upcoming bookings');
}

module.exports = { startReminderJob };
