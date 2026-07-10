const mongoose = require('mongoose');
require('dotenv').config();
const { Package } = require('./src/models');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const all = await Package.find({ isDeleted: { $ne: true }, status: 'active' })
      .select('_id name category branchId price duration')
      .lean();
    console.log('Total active packages:', all.length);
    const byCat = {};
    for (const p of all) {
      byCat[p.category] = (byCat[p.category] || 0) + 1;
    }
    console.log('By category:', JSON.stringify(byCat));
    console.log('Sample (first 5):');
    console.log(JSON.stringify(all.slice(0, 5), null, 2));
    console.log('Total with branchId:', all.filter(p => p.branchId).length);
    console.log('Total global (no branchId):', all.filter(p => !p.branchId).length);

    // Simulate the FE request: ?status=active (default limit 9)
    const limited = await Package.find({ isDeleted: { $ne: true }, status: 'active' })
      .sort({ price: 1 })
      .limit(9)
      .lean();
    console.log('First 9 sorted by price:');
    console.log(JSON.stringify(limited.map(p => ({ name: p.name, category: p.category, price: p.price })), null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
  await mongoose.disconnect();
})();
