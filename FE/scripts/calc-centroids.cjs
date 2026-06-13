const fs = require('fs');
const svg = fs.readFileSync('public/assets/vietnam.svg', 'utf-8');

const pathRegex = /id="([^"]+)"[^>]*?d="([^"]+)"/g;
const paths = [];
let match;
while ((match = pathRegex.exec(svg)) !== null) {
  paths.push({ id: match[1], d: match[2] });
}

const targets = ['ha-noi', 'ho-chi-minh', 'da-nang', 'can-tho', 'hai-phong', 'thua-thien-hue', 'binh-duong', 'dong-nai', 'long-an', 'tien-giang', 'vinh-long', 'ben-tre'];

targets.forEach(t => {
  const p = paths.find(x => x.id === t);
  if (!p) { console.log(t + ': NOT FOUND'); return; }

  const tokens = p.d.match(/[a-zA-Z][^a-zA-Z]*/g);
  if (!tokens) return;
  
  let cx = 0, cy = 0, first = true;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  tokens.forEach(seg => {
    const cmd = seg[0];
    const coords = seg.slice(1).trim().split(/[\s,]+/).filter(s => s !== '').map(Number);
    const isRelative = cmd === cmd.toLowerCase();

    for (let i = 0; i < coords.length - 1; i += 2) {
      const x = coords[i], y = coords[i+1];
      let ax, ay;

      if (first) {
        ax = x; ay = y;
        cx = ax; cy = ay;
        first = false;
      } else if (isRelative) {
        cx += x; cy += y;
        ax = cx; ay = cy;
      } else {
        cx = x; cy = y;
        ax = cx; ay = cy;
      }

      if (!isNaN(ax) && !isNaN(ay)) {
        minX = Math.min(minX, ax); maxX = Math.max(maxX, ax);
        minY = Math.min(minY, ay); maxY = Math.max(maxY, ay);
      }
    }
  });

  const centerX = Math.round((minX + maxX) / 2);
  const centerY = Math.round((minY + maxY) / 2);
  console.log(t + ': cx=' + centerX + ' cy=' + centerY + ' [' + Math.round(minX) + '-' + Math.round(maxX) + ', ' + Math.round(minY) + '-' + Math.round(maxY) + ']');
});
