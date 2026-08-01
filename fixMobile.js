const fs = require('fs');

// 1. Fix payment/select.tsx
let selectTsx = fs.readFileSync('Mobile/app/payment/select.tsx', 'utf8');
selectTsx = selectTsx.replace(
  'const depositPercent = configs?.DEPOSIT_RATE ? Math.round(configs.DEPOSIT_RATE * 100) : 30;',
  'const depositPercent = configs?.DEPOSIT_RATE ? Math.round(configs.DEPOSIT_RATE * 100) : 0;'
);
fs.writeFileSync('Mobile/app/payment/select.tsx', selectTsx, 'utf8');

// 2. Fix booking/[id].tsx
let bookingIdTsx = fs.readFileSync('Mobile/app/booking/[id].tsx', 'utf8');
bookingIdTsx = bookingIdTsx.replace(
  'const depositPercent = configs?.DEPOSIT_RATE ? Math.round(configs.DEPOSIT_RATE * 100) : 30;',
  'const depositPercent = configs?.DEPOSIT_RATE ? Math.round(configs.DEPOSIT_RATE * 100) : 0;'
);
fs.writeFileSync('Mobile/app/booking/[id].tsx', bookingIdTsx, 'utf8');

// 3. Fix booking/recurring.tsx
let recurringTsx = fs.readFileSync('Mobile/app/booking/recurring.tsx', 'utf8');
recurringTsx = recurringTsx.replace(
  'const depositPercent = configs?.DEPOSIT_RATE ? Math.round(configs.DEPOSIT_RATE * 100) : 30;',
  'const depositPercent = configs?.DEPOSIT_RATE ? Math.round(configs.DEPOSIT_RATE * 100) : 0;'
);
recurringTsx = recurringTsx.replace(
  /function getPointMultiplier\(tier\?: string\): number \{\n  if \(tier === 'diamond'\) return 2\.0;\n  if \(tier === 'gold'\) return 1\.5;\n  if \(tier === 'silver'\) return 1\.2;\n  return 1;\n\}/g,
  `function getPointMultiplier(tier?: string, tiersConfig?: any): number {
  if (tiersConfig && Array.isArray(tiersConfig)) {
    const t = tiersConfig.find((x: any) => x.id === (tier || 'bronze'));
    if (t && t.multiplier) return t.multiplier;
  }
  return 1;
}`
);
recurringTsx = recurringTsx.replace(
  /Math\.floor\(\n      priceAfterVoucherPerSession \* 0\.05 \* getPointMultiplier\(userTier\),\n    \)/g,
  `Math.floor(
      priceAfterVoucherPerSession * (configs?.LOYALTY_BASE_EARNING_RATE ? (configs.LOYALTY_BASE_EARNING_RATE / 100) : 0) * getPointMultiplier(userTier, configs?.LOYALTY_TIERS),
    )`
);
fs.writeFileSync('Mobile/app/booking/recurring.tsx', recurringTsx, 'utf8');

// 4. Fix booking/index.tsx
let bookingIndexTsx = fs.readFileSync('Mobile/app/booking/index.tsx', 'utf8');
bookingIndexTsx = bookingIndexTsx.replace(
  /  let pointMultiplier = 1;\n  if \(user\?\.tier === 'diamond'\) pointMultiplier = 2\.0;\n  else if \(user\?\.tier === 'gold'\) pointMultiplier = 1\.5;\n  else if \(user\?\.tier === 'silver'\) pointMultiplier = 1\.2;/g,
  `  let pointMultiplier = 1;
  if (configs?.LOYALTY_TIERS && Array.isArray(configs.LOYALTY_TIERS)) {
    const userTier = user?.tier || 'bronze';
    const tierConfig = configs.LOYALTY_TIERS.find((t: any) => t.id === userTier);
    if (tierConfig && tierConfig.multiplier) {
      pointMultiplier = tierConfig.multiplier;
    }
  }`
);
bookingIndexTsx = bookingIndexTsx.replace(
  /const pointsEarned = Math\.floor\(\(isPayingWithPack \? totalBase : finalPrice\) \* 0\.05 \* pointMultiplier\);/g,
  `const pointsEarned = Math.floor((isPayingWithPack ? totalBase : finalPrice) * (configs?.LOYALTY_BASE_EARNING_RATE ? (configs.LOYALTY_BASE_EARNING_RATE / 100) : 0) * pointMultiplier);`
);
fs.writeFileSync('Mobile/app/booking/index.tsx', bookingIndexTsx, 'utf8');

console.log('Mobile app fixed successfully!');
