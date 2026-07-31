const fs = require('fs');

let indexTsx = fs.readFileSync('Mobile/app/booking/index.tsx', 'utf8');

indexTsx = indexTsx.replace(
  /let pointMultiplier = 1;\n\s+if \(user\?\.tier === 'diamond'\) pointMultiplier = 2\.0;\n\s+else if \(user\?\.tier === 'gold'\) pointMultiplier = 1\.5;\n\s+else if \(user\?\.tier === 'silver'\) pointMultiplier = 1\.2;/,
  `let pointMultiplier = 1;
  if (configs?.LOYALTY_TIERS && Array.isArray(configs.LOYALTY_TIERS)) {
    const userTier = user?.tier || 'bronze';
    const tierConfig = configs.LOYALTY_TIERS.find((t: any) => t.id === userTier);
    if (tierConfig && tierConfig.multiplier) {
      pointMultiplier = tierConfig.multiplier;
    }
  }`
);

fs.writeFileSync('Mobile/app/booking/index.tsx', indexTsx, 'utf8');

let recurringTsx = fs.readFileSync('Mobile/app/booking/recurring.tsx', 'utf8');
recurringTsx = recurringTsx.replace(
  /function getPointMultiplier\(tier\?: string\): number \{[\s\S]*?return 1;\n\}/,
  `function getPointMultiplier(tier?: string, tiersConfig?: any): number {
  if (tiersConfig && Array.isArray(tiersConfig)) {
    const t = tiersConfig.find((x: any) => x.id === (tier || 'bronze'));
    if (t && t.multiplier) return t.multiplier;
  }
  return 1;
}`
);

fs.writeFileSync('Mobile/app/booking/recurring.tsx', recurringTsx, 'utf8');
console.log('Mobile app fixed again!');
