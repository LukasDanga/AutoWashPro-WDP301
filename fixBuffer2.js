const fs = require('fs');
const path = require('path');

const targetBooking = path.join(__dirname, 'BE/src/services/booking.service.js');
let bookingContent = fs.readFileSync(targetBooking, 'utf8');

// Undo the inline capacity inside the map if it exists
bookingContent = bookingContent.replace(
  /return slots\.map\(\(s\) => \{\n    const capacity = branch\.capacity \|\| \(await configService\.get\('DEFAULT_BRANCH_CAPACITY', \{ branchId: branch\._id \|\| branchId \}, 2\)\);/g,
  `const capacity = branch.capacity || (await configService.get('DEFAULT_BRANCH_CAPACITY', { branchId: branch._id || branchId }, 2));\n  return slots.map((s) => {`
);

// If it hasn't been migrated yet (e.g. fresh git checkout), migrate it correctly:
bookingContent = bookingContent.replace(
  /return slots\.map\(\(s\) => \{\n    const capacity = branch\.capacity \|\| 2;/g,
  `const capacity = branch.capacity || (await configService.get('DEFAULT_BRANCH_CAPACITY', { branchId: branch._id || branchId }, 2));\n  return slots.map((s) => {`
);

fs.writeFileSync(targetBooking, bookingContent, 'utf8');
console.log('booking.service.js buffer fixed again.');
