require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const imageMap = [
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

async function fix() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found in env');
    return;
  }
  await mongoose.connect(uri);
  const Branch = mongoose.model('Branch', new mongoose.Schema({}, { strict: false }));

  for (const item of imageMap) {
    const res = await Branch.updateMany(
      { name: { $regex: item.match, $options: 'i' } },
      { $set: { image: item.img } }
    );
    console.log(`Updated ${res.modifiedCount} branch(es) matching '${item.match}' -> ${item.img}`);
  }

  const all = await Branch.find({});
  console.log('\n--- ALL 8 BRANCHES IN MONGODB ---');
  all.forEach(b => console.log(`• ${b.name.padEnd(30)} -> ${b.image}`));
  await mongoose.disconnect();
}

fix().catch(console.error);
