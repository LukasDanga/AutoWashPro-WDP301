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
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        const matches = line.match(/(throw\s+new\s+Error|createError|reject)\s*\(\s*['"`]([A-Za-z0-9\s.,!?:;'-]{4,})['"`]/g);
        if (matches) {
          matches.forEach(m => {
            if (/^[A-Za-z0-9\s.,!?:;'()-]+$/.test(m) && !m.includes('http') && !m.includes('Bearer')) {
              console.log(`${fullPath}:${index + 1} -> ${trimmed}`);
            }
          });
        }
      });
    }
  }
}

scan(path.join(__dirname, '../src'));
