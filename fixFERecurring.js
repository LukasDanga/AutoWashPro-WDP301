const fs = require('fs');

let content = fs.readFileSync('FE/src/components/customer/RecurringBookingFlow.jsx', 'utf8');

// Add useSystemConfig import if not exists
if (!content.includes('useSystemConfig')) {
  content = content.replace(
    'import VoucherPicker from \'../VoucherPicker.jsx\';',
    'import VoucherPicker from \'../VoucherPicker.jsx\';\nimport { useSystemConfig } from \'../../hooks/useSystemConfig.jsx\';'
  );
}

// Add hook usage inside RecurringBookingFlow
content = content.replace(
  '  const [packages, setPackages] = useState([]);',
  '  const [packages, setPackages] = useState([]);\n  const configs = useSystemConfig();'
);

// Replace the hardcoded pointMultiplier logic
content = content.replace(
  /  let pointMultiplier = 1;\n  if \(user\?\.tier === 'diamond'\) pointMultiplier = 2\.0;\n  else if \(user\?\.tier === 'gold'\) pointMultiplier = 1\.5;\n  else if \(user\?\.tier === 'silver'\) pointMultiplier = 1\.2;/g,
  `  let pointMultiplier = 1;
  if (configs?.LOYALTY_TIERS && Array.isArray(configs.LOYALTY_TIERS)) {
    const userTier = user?.tier || 'bronze';
    const tierConfig = configs.LOYALTY_TIERS.find(t => t.id === userTier);
    if (tierConfig && tierConfig.multiplier) {
      pointMultiplier = tierConfig.multiplier;
    }
  }`
);

// Replace the hardcoded 0.05
content = content.replace(
  /const pointsPerSession = Math\.floor\(pricePerSession \* 0\.05 \* pointMultiplier\);/g,
  `const baseRate = configs?.LOYALTY_BASE_EARNING_RATE ? (configs.LOYALTY_BASE_EARNING_RATE / 100) : 0;
  const pointsPerSession = Math.floor(pricePerSession * baseRate * pointMultiplier);`
);

fs.writeFileSync('FE/src/components/customer/RecurringBookingFlow.jsx', content, 'utf8');
console.log('RecurringBookingFlow.jsx updated successfully!');
