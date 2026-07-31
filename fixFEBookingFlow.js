const fs = require('fs');

let content = fs.readFileSync('FE/src/components/BookingFlow.jsx', 'utf8');

// Add useSystemConfig import if not exists
if (!content.includes('useSystemConfig')) {
  content = content.replace(
    'import useSSE from \'../hooks/useSSE.js\';',
    'import useSSE from \'../hooks/useSSE.js\';\nimport { useSystemConfig } from \'../hooks/useSystemConfig.jsx\';'
  );
}

// Add hook usage inside BookingFlow
content = content.replace(
  '  const bookingDates = useMemo(() => buildBookingDates(), []);',
  '  const configs = useSystemConfig();\n  const bookingDates = useMemo(() => buildBookingDates(), []);'
);

// Replace the hardcoded pointMultiplier logic
content = content.replace(
  /  let pointMultiplier = 1;\n  if \(currentUser\?\.tier === 'diamond'\) pointMultiplier = 2\.0;\n  else if \(currentUser\?\.tier === 'gold'\) pointMultiplier = 1\.5;\n  else if \(currentUser\?\.tier === 'silver'\) pointMultiplier = 1\.2;/g,
  `  let pointMultiplier = 1;
  if (configs?.LOYALTY_TIERS && Array.isArray(configs.LOYALTY_TIERS)) {
    const userTier = currentUser?.tier || 'bronze';
    const tierConfig = configs.LOYALTY_TIERS.find(t => t.id === userTier);
    if (tierConfig && tierConfig.multiplier) {
      pointMultiplier = tierConfig.multiplier;
    }
  }`
);

// Replace the hardcoded 0.05
content = content.replace(
  /const points = Math\.floor\(\(isPayingWithPack \? totalBase : total\) \* 0\.05 \* pointMultiplier\);/g,
  `const baseRate = configs?.LOYALTY_BASE_EARNING_RATE ? (configs.LOYALTY_BASE_EARNING_RATE / 100) : 0;
  const points = Math.floor((isPayingWithPack ? totalBase : total) * baseRate * pointMultiplier);`
);

fs.writeFileSync('FE/src/components/BookingFlow.jsx', content, 'utf8');
console.log('BookingFlow.jsx updated successfully!');
