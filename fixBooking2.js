const fs = require('fs');

let content = fs.readFileSync('BE/src/services/booking.service.js', 'utf8');

// 1. Remove constants
content = content.replace('const DEPOSIT_RATE = 0.3;\n\n', '');
content = content.replace('const GRACE_EXTENSION_STEP_MINUTES = 5;\nconst MAX_GRACE_EXTENSION_MINUTES = 15;\n\n', '');

// 2. Fix extendGracePeriod
content = content.replace(
  '  if ((booking.graceExtensionMinutes || 0) >= MAX_GRACE_EXTENSION_MINUTES) {\n    throw Object.assign(new Error(`Đơn này đã được gia hạn tối đa ${MAX_GRACE_EXTENSION_MINUTES} phút`), { statusCode: 400, code: \'GRACE_LIMIT_REACHED\' });\n  }\n\n  const updated = await Booking.findOneAndUpdate(\n    { _id: id, status: { $in: [\'pending\', \'confirmed\'] } },\n    {\n      $inc: { graceExtensionMinutes: GRACE_EXTENSION_STEP_MINUTES },\n      $set: { warningSentAt: null }\n    },\n    { new: true }\n  );',
  `  const [maxGrace, stepGrace] = await Promise.all([
    configService.get('MAX_GRACE_EXTENSION_MINUTES', 15),
    configService.get('GRACE_EXTENSION_STEP_MINUTES', 5)
  ]);

  if ((booking.graceExtensionMinutes || 0) >= maxGrace) {
    throw Object.assign(new Error(\`Đơn này đã được gia hạn tối đa \${maxGrace} phút\`), { statusCode: 400, code: 'GRACE_LIMIT_REACHED' });
  }

  const updated = await Booking.findOneAndUpdate(
    { _id: id, status: { $in: ['pending', 'confirmed'] } },
    {
      $inc: { graceExtensionMinutes: stepGrace },
      $set: { warningSentAt: null }
    },
    { new: true }
  );`
);

content = content.replace(
  '    `Nhân viên đã gia hạn thêm ${GRACE_EXTENSION_STEP_MINUTES} phút cho lịch hẹn lúc ${booking.startTime}. Vui lòng đến check-in sớm nhất có thể.`,\n',
  '    `Nhân viên đã gia hạn thêm ${stepGrace} phút cho lịch hẹn lúc ${booking.startTime}. Vui lòng đến check-in sớm nhất có thể.`,\n'
);

// 3. Fix line 2615 (DEPOSIT_RATE -> await getDepositRate(user))
// This looks like it's in another function. Let's find it.
// Math.round(((computedFinalPrice || 0) * DEPOSIT_RATE) / 1000) * 1000
content = content.replace(
  ': Math.round(((computedFinalPrice || 0) * DEPOSIT_RATE) / 1000) * 1000,',
  ': Math.round(((computedFinalPrice || 0) * (await getDepositRate(null))) / 1000) * 1000,'
);

// Wait, the user object might not be available there. I'll just call getDepositRate() without user if it doesn't need it. 
// Let's rewrite getDepositRate to not strictly require user.
content = content.replace(
  'const getDepositRate = async () => await configService.get(\'DEPOSIT_RATE\', 0.3);',
  'const getDepositRate = async (user) => await configService.get(\'DEPOSIT_RATE\', 0.3);'
);


fs.writeFileSync('BE/src/services/booking.service.js', content, 'utf8');
console.log('booking.service.js fixed grace period!');
