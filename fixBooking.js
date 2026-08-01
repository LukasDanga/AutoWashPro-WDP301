const fs = require('fs');

let content = fs.readFileSync('BE/src/services/booking.service.js', 'utf8');

// 1. Update DEPOSIT_RATE
content = content.replace(
  'const getDepositRate = () => DEPOSIT_RATE;',
  'const getDepositRate = async () => await configService.get(\'DEPOSIT_RATE\', 0.3);'
);

content = content.replace(
  'Math.round((computedFinalPrice * getDepositRate(user)) / 1000) * 1000;',
  'Math.round((computedFinalPrice * (await getDepositRate(user))) / 1000) * 1000;'
);

// Second occurrence of getDepositRate in recurring
content = content.replace(
  'const depositPerSession = Math.round((computedFinalPrice * getDepositRate(user)) / 1000) * 1000;',
  'const depositRate = await getDepositRate(user);\n  const depositPerSession = Math.round((computedFinalPrice * depositRate) / 1000) * 1000;'
);

// 2. Update ADVANCE_BOOKING_DAYS in createBooking
content = content.replace(
  'const ADVANCE_BOOKING_DAYS = { bronze: 14, silver: 14, gold: 30, diamond: 60, VIP: 60 };',
  'const ADVANCE_BOOKING_DAYS = await configService.get(\'ADVANCE_BOOKING_LIMITS\', { bronze: 14, silver: 14, gold: 30, diamond: 60, VIP: 60 });'
);

// 3. Update MIN_ADVANCE_BOOKING_MINUTES in createBooking
content = content.replace(
  'if (startMinutes !== null && startMinutes <= currentMinutes + 30) {\n        throw Object.assign(new Error(\'Đặt lịch phải trước ít nhất 30 phút\'), { statusCode: 400, code: \'INVALID_TIME\' });',
  `const minAdvanceBookingMinutes = await configService.get('MIN_ADVANCE_BOOKING_MINUTES', 30);\n      if (startMinutes !== null && startMinutes <= currentMinutes + minAdvanceBookingMinutes) {\n        throw Object.assign(new Error(\`Đặt lịch phải trước ít nhất \${minAdvanceBookingMinutes} phút\`), { statusCode: 400, code: 'INVALID_TIME' });`
);

// 4. Update MIN_ADVANCE_BOOKING_MINUTES in createRecurringBooking
content = content.replace(
  'if (startMinutes !== null && startMinutes <= currentMinutes + 30) {\n          throw new Error(\'Thời gian đặt lịch phải cách hiện tại ít nhất 30 phút\');',
  `const minAdvanceBookingMinutes = await configService.get('MIN_ADVANCE_BOOKING_MINUTES', 30);\n        if (startMinutes !== null && startMinutes <= currentMinutes + minAdvanceBookingMinutes) {\n          throw new Error(\`Thời gian đặt lịch phải cách hiện tại ít nhất \${minAdvanceBookingMinutes} phút\`);`
);

// 5. Update GRACE_EXTENSION in extendGracePeriod
content = content.replace(
  'if (booking.graceExtensionMinutes >= MAX_GRACE_EXTENSION_MINUTES) {\n      throw Object.assign(new Error(`Đã đạt giới hạn gia hạn tối đa (${MAX_GRACE_EXTENSION_MINUTES} phút)`), { statusCode: 400 });\n    }\n\n    booking.graceExtensionMinutes += GRACE_EXTENSION_STEP_MINUTES;',
  `const maxGraceExtensionMinutes = await configService.get('MAX_GRACE_EXTENSION_MINUTES', 15);\n    const graceExtensionStepMinutes = await configService.get('GRACE_EXTENSION_STEP_MINUTES', 5);\n\n    if (booking.graceExtensionMinutes >= maxGraceExtensionMinutes) {\n      throw Object.assign(new Error(\`Đã đạt giới hạn gia hạn tối đa (\${maxGraceExtensionMinutes} phút)\`), { statusCode: 400 });\n    }\n\n    booking.graceExtensionMinutes += graceExtensionStepMinutes;`
);

// 6. Update SYSTEM_CANCEL_BONUS_POINTS in cancelBooking
content = content.replace(
  '// Tặng 500 điểm\n        const User = mongoose.model(\'User\');\n        const PointHistory = mongoose.model(\'PointHistory\');\n        await User.findByIdAndUpdate(booking.userId, { $inc: { loyaltyPoints: 500, lifetimePoints: 500 } }, { session }).catch(() => {});\n        await PointHistory.create([{\n          userId: booking.userId,\n          points: 500,\n          type: \'earned\',\n          description: \'Hệ thống hủy lịch hẹn - Tặng điểm đền bù\',\n          bookingId: booking._id\n        }], { session }).catch(() => {});\n        \n        // Gửi thông báo\n        notificationService.send(\n          booking.userId,\n          \'Hệ thống hủy lịch hẹn\',\n          \'Lịch hẹn bằng gói lượt của bạn đã bị cửa hàng hủy. Bạn được hoàn lại 1 lượt vào gói và nhận 500 điểm đền bù.\',',
  `// Tặng điểm đền bù\n        const User = mongoose.model('User');\n        const PointHistory = mongoose.model('PointHistory');\n        const systemCancelBonusPoints = await configService.get('SYSTEM_CANCEL_BONUS_POINTS', 500);\n        await User.findByIdAndUpdate(booking.userId, { $inc: { loyaltyPoints: systemCancelBonusPoints, lifetimePoints: systemCancelBonusPoints } }, { session }).catch(() => {});\n        await PointHistory.create([{\n          userId: booking.userId,\n          points: systemCancelBonusPoints,\n          type: 'earned',\n          description: 'Hệ thống hủy lịch hẹn - Tặng điểm đền bù',\n          bookingId: booking._id\n        }], { session }).catch(() => {});\n        \n        // Gửi thông báo\n        notificationService.send(\n          booking.userId,\n          'Hệ thống hủy lịch hẹn',\n          \`Lịch hẹn bằng gói lượt của bạn đã bị cửa hàng hủy. Bạn được hoàn lại 1 lượt vào gói và nhận \${systemCancelBonusPoints} điểm đền bù.\`,`
);

// 7. Update LATE_CANCEL_THRESHOLD_MINUTES in cancelBooking
content = content.replace(
  'const isLateCancel = minutesBefore <= 60;',
  'const lateCancelThresholdMinutes = await configService.get(\'LATE_CANCEL_THRESHOLD_MINUTES\', 60);\n    const isLateCancel = minutesBefore <= lateCancelThresholdMinutes;'
);

fs.writeFileSync('BE/src/services/booking.service.js', content, 'utf8');
console.log('booking.service.js updated successfully!');
