require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const map = [
  { match: 'Quận 1', img: '/branches/autowash_quan_1.jpg' },
  { match: 'Thủ Đức', img: '/branches/autowash_thu_duc.jpg' },
  { match: 'Bình Thạnh', img: '/branches/autowash_binh_thanh.jpg' },
  { match: 'Gò Vấp', img: '/branches/autowash_go_vap.jpg' },
  { match: 'Tân Phú', img: '/branches/autowash_tan_phu.jpg' },
  { match: 'Cầu Giấy', img: '/branches/autowash_cau_giay.jpg' },
  { match: 'Thanh Xuân', img: '/branches/autowash_tan_binh.jpg' },
  { match: 'Tân Bình', img: '/branches/autowash_tan_binh.jpg' },
  { match: 'Hải Châu', img: '/branches/autowash_hai_chau.jpg' }
];

async function updateNative() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI in env');
    return;
  }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  for (const item of map) {
    const res = await db.collection('branches').updateMany(
      { name: new RegExp(item.match, 'i') },
      { $set: { image: item.img } }
    );
    console.log(`Updated ${res.modifiedCount} branch(es) for '${item.match}' -> ${item.img}`);
  }

  const docs = await db.collection('branches').find({}).toArray();
  console.log('\n--- VERIFYING NATIVE BRANCH DOCUMENTS ---');
  docs.forEach(d => {
    console.log(`• ID: ${d._id} | Name: ${d.name.padEnd(25)} | Image: ${d.image}`);
  });

  await mongoose.disconnect();
}

updateNative().catch(console.error);
