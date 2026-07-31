const fs = require('fs');

// Fix checkout.tsx
let checkoutTsx = fs.readFileSync('Mobile/app/payment/checkout.tsx', 'utf8');
checkoutTsx = checkoutTsx.replace(
  /return recurringDraft\.depositAmount \?\? Math\.round\(\(totalAmount \* 0\.3\) \/ 1000\) \* 1000;/g,
  'return recurringDraft.depositAmount ?? Math.round((totalAmount * (configs?.DEPOSIT_RATE ?? 0)) / 1000) * 1000;'
);
checkoutTsx = checkoutTsx.replace(
  /return Math\.round\(\(totalAmount \* 0\.3\) \/ 1000\) \* 1000;/g,
  'return Math.round((totalAmount * (configs?.DEPOSIT_RATE ?? 0)) / 1000) * 1000;'
);
checkoutTsx = checkoutTsx.replace(
  /return booking\.depositAmount \?\? Math\.round\(\(totalAmount \* 0\.3\) \/ 1000\) \* 1000;/g,
  'return booking.depositAmount ?? Math.round((totalAmount * (configs?.DEPOSIT_RATE ?? 0)) / 1000) * 1000;'
);

// We need to make sure configs is available in checkout.tsx or use a fallback like 0 if not
// Let's add useSystemConfig to checkout.tsx if it's not there.
if (!checkoutTsx.includes('useSystemConfig')) {
  checkoutTsx = checkoutTsx.replace(
    'import { router, useLocalSearchParams } from \'expo-router\';',
    'import { router, useLocalSearchParams } from \'expo-router\';\nimport { useSystemConfig } from \'../../src/hooks/useSystemConfig\';'
  );
  // find the first hook usage and insert configs
  checkoutTsx = checkoutTsx.replace(
    'export default function PaymentCheckoutScreen() {\n  const',
    'export default function PaymentCheckoutScreen() {\n  const configs = useSystemConfig();\n  const'
  );
}

fs.writeFileSync('Mobile/app/payment/checkout.tsx', checkoutTsx, 'utf8');

// Fix recurring.tsx line 594
let recurringTsx = fs.readFileSync('Mobile/app/booking/recurring.tsx', 'utf8');
recurringTsx = recurringTsx.replace(
  /: Math\.round\(\(computedTotal \* 0\.3\) \/ 1000\) \* 1000;/g,
  ': Math.round((computedTotal * (configs?.DEPOSIT_RATE ?? 0)) / 1000) * 1000;'
);
fs.writeFileSync('Mobile/app/booking/recurring.tsx', recurringTsx, 'utf8');

console.log('Final mobile fix complete!');
