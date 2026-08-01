const fs = require('fs');

let content = fs.readFileSync('FE/src/components/landing/PackagesSection.jsx', 'utf8');

// Change:
// const depositPercent = configs?.DEPOSIT_RATE ? Math.round(configs.DEPOSIT_RATE * 100) : 30;
// To:
// const depositPercent = configs?.DEPOSIT_RATE ? Math.round(configs.DEPOSIT_RATE * 100) : 0; // Removing fallback

content = content.replace(
  'const depositPercent = configs?.DEPOSIT_RATE ? Math.round(configs.DEPOSIT_RATE * 100) : 30;',
  'const depositPercent = configs?.DEPOSIT_RATE ? Math.round(configs.DEPOSIT_RATE * 100) : 0;'
);

fs.writeFileSync('FE/src/components/landing/PackagesSection.jsx', content, 'utf8');
console.log('PackagesSection.jsx updated successfully!');
