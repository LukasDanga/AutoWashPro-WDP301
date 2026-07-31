const fs = require('fs');

let content = fs.readFileSync('BE/src/services/booking.service.js', 'utf8');

// 1. Remove constants with robust regex
content = content.replace(/const DEPOSIT_RATE = 0\.3;\s*/, '');
content = content.replace(/const GRACE_EXTENSION_STEP_MINUTES = 5;\s*/, '');
content = content.replace(/const MAX_GRACE_EXTENSION_MINUTES = 15;\s*/, '');

// 2. Fix extendGracePeriod
content = content.replace(
  /if \(\(booking\.graceExtensionMinutes \|\| 0\) >= MAX_GRACE_EXTENSION_MINUTES\) {([\s\S]*?)\$inc: { graceExtensionMinutes: GRACE_EXTENSION_STEP_MINUTES },/,
  `const [maxGrace, stepGrace] = await Promise.all([
    configService.get('MAX_GRACE_EXTENSION_MINUTES', 15),
    configService.get('GRACE_EXTENSION_STEP_MINUTES', 5)
  ]);

  if ((booking.graceExtensionMinutes || 0) >= maxGrace) {$1$inc: { graceExtensionMinutes: stepGrace },`
);

content = content.replace(
  /throw Object\.assign\(new Error\(\`Đơn này đã được gia hạn tối đa \${MAX_GRACE_EXTENSION_MINUTES} phút\`\)/g,
  'throw Object.assign(new Error(`Đơn này đã được gia hạn tối đa ${maxGrace} phút`)'
);

content = content.replace(
  /\`Nhân viên đã gia hạn thêm \${GRACE_EXTENSION_STEP_MINUTES} phút/g,
  '`Nhân viên đã gia hạn thêm ${stepGrace} phút'
);

// 3. Fix DEPOSIT_RATE in line 2615
content = content.replace(
  /: Math\.round\(\(\(computedFinalPrice \|\| 0\) \* DEPOSIT_RATE\) \/ 1000\) \* 1000,/g,
  ': Math.round(((computedFinalPrice || 0) * (await getDepositRate(null))) / 1000) * 1000,'
);

fs.writeFileSync('BE/src/services/booking.service.js', content, 'utf8');
console.log('booking.service.js fixed grace period with regex!');
