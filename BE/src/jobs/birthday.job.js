const cron = require('node-cron');
const { User, Voucher } = require('../models');
const notificationService = require('../services/notification.service');

/**
 * Run every day at 08:00 AM.
 * Find users whose birthday is today and who don't already have a birthday voucher this year.
 * Create a personal voucher valid for 7 days.
 */
function startBirthdayJob() {
  cron.schedule('0 8 * * *', async () => {
    try {
      const now = new Date();
      const month = now.getMonth() + 1; // 1-12
      const day = now.getDate();

      // Find all customers with dateOfBirth matching today's month+day
      const users = await User.find({
        role: 'customer',
        status: 'active',
        $expr: {
          $and: [
            { $eq: [{ $month: '$dateOfBirth' }, month] },
            { $eq: [{ $dayOfMonth: '$dateOfBirth' }, day] },
          ],
        },
      });

      for (const user of users) {
        const thisYear = now.getFullYear();
        const existingCode = `BD${thisYear}${String(user._id).slice(-6).toUpperCase()}`;

        // Skip if already created this year
        const exists = await Voucher.findOne({ code: existingCode });
        if (exists) continue;

        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 7);

        await Voucher.create({
          code: existingCode,
          name: `Voucher sinh nhật ${user.name}`,
          description: `Quà sinh nhật dành riêng cho ${user.name} — giảm 20% tối đa 100.000đ.`,
          type: 'percentage',
          value: 20,
          maxDiscount: 100000,
          minOrder: 0,
          quantity: 1,
          remaining: 1,
          startDate: now,
          endDate,
          applicableToAllPackages: true,
          applicableToAllBranches: true,
          status: 'active',
          maxUsagePerUser: 1,
          isBirthdayVoucher: true,
          assignedTo: user._id,
        });

        await notificationService.send(
          user._id,
          'Chúc mừng sinh nhật! 🎂',
          `AutoWash Pro gửi tặng bạn voucher giảm 20% nhân dịp sinh nhật. Mã: ${existingCode} (hiệu lực 7 ngày).`,
          'voucher',
          { code: existingCode }
        );
      }
    } catch (err) {
      console.error('[BirthdayJob]', err.message);
    }
  });

  console.log('[BirthdayJob] Started — runs daily at 08:00');
}

module.exports = { startBirthdayJob };
