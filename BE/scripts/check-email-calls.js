const fs = require('fs');
const path = require('path');

function scan(dir) {
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scan(fullPath);
    } else if (fullPath.endsWith('.js')) {
      const text = fs.readFileSync(fullPath, 'utf8');
      const lines = text.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('emailService') || line.includes('sendBookingConfirmationEmail') || line.includes('sendPasswordResetEmail') || line.includes('sendCancellationOtpEmail') || line.includes('sendSlotPackConfirmationEmail') || line.includes('sendCancellationSuccessEmail')) {
          console.log(`${fullPath}:${index + 1} -> ${line.trim()}`);
        }
      });
    }
  }
}

scan(path.join(__dirname, '../src'));
