const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/autowashpro';

// HCMC province SVG path starts at m 245.76,700.6
// All 5 branches are in HCMC districts, spread around the province area
const BRANCH_COORDS = {
  'AutoWash Pro Quận 1':     { cx: 247, cy: 708 },
  'AutoWash Pro Thủ Đức':     { cx: 253, cy: 703 },
  'AutoWash Pro Bình Thạnh':  { cx: 250, cy: 706 },
  'AutoWash Pro Gò Vấp':      { cx: 244, cy: 702 },
  'AutoWash Pro Tân Phú':     { cx: 241, cy: 707 },
};

async function update() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected');

  const db = mongoose.connection.db;
  const branches = await db.collection('branches').find({}).toArray();

  for (const b of branches) {
    const coords = BRANCH_COORDS[b.name];
    if (!coords) {
      console.log(`Skipping ${b.name}: no mapping`);
      continue;
    }

    await db.collection('branches').updateOne(
      { _id: b._id },
      { $set: { city: 'Hồ Chí Minh', mapCoordinates: { svgCx: coords.cx, svgCy: coords.cy } } }
    );
    console.log(`Updated ${b.name}: cx=${coords.cx}, cy=${coords.cy}`);
  }

  await mongoose.disconnect();
  console.log('Done');
}

update().catch(err => { console.error(err); process.exit(1); });
