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

      // Get today date string for matching bookingDate
      const todayStr = now.toISOString().split('T')[0];

      const bookings = await Booking.find({
        status: { $in: ['pending', 'checked_in'] },
        bookingDate: {
          $gte: new Date(todayStr),
          $lt: new Date(todayStr + 'T23:59:59Z'),
        },
      }).populate('branchId', 'name').populate('vehicleId', 'licensePlate');

      for (const b of bookings) {
        // Parse startTime HH:mm and combine with booking date
        const [hh, mm] = (b.startTime || '').split(':').map(Number);
        if (isNaN(hh) || isNaN(mm)) continue;

        const bookingStart = new Date(b.bookingDate);
        bookingStart.setHours(hh, mm, 0, 0);

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
