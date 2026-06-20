const mongoose = require('mongoose');
const path = require('path');

require(path.join(__dirname, '..', 'src', 'models', 'user.schema'));

const User = mongoose.model('User');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/washpro';

const users = [
  { name: 'Nguyen Van An',   email: 'an.nguyen@washpro.vn',   phone: '0901111111', password: '123456', role: 'customer', status: 'active',   tier: 'silver',  loyaltyPoints: 1200, lifetimePoints: 3500 },
  { name: 'Tran Thi Bich',   email: 'bich.tran@washpro.vn',   phone: '0902222222', password: '123456', role: 'customer', status: 'active',   tier: 'gold',    loyaltyPoints: 5800, lifetimePoints: 12000 },
  { name: 'Le Minh Chau',    email: 'chau.le@washpro.vn',     phone: '0903333333', password: '123456', role: 'customer', status: 'inactive', tier: 'bronze',  loyaltyPoints: 0,    lifetimePoints: 200 },
  { name: 'Pham Hoang Duc',  email: 'duc.pham@washpro.vn',    phone: '0904444444', password: '123456', role: 'customer', status: 'active',   tier: 'diamond', loyaltyPoints: 15000, lifetimePoints: 32000 },
  { name: 'Vo Thi Em',       email: 'em.vo@washpro.vn',       phone: '0905555555', password: '123456', role: 'customer', status: 'active',   tier: 'bronze',  loyaltyPoints: 300,  lifetimePoints: 800 },
  { name: 'Nguyen Hoang Giap', email: 'giap.nh@washpro.vn',  phone: '0906666666', password: '123456', role: 'customer', status: 'suspended', tier: 'bronze',  loyaltyPoints: 0,    lifetimePoints: 0 },
  { name: 'Truong Ngoc Han', email: 'han.truong@washpro.vn',  phone: '0907777777', password: '123456', role: 'manager',  status: 'active',   tier: 'bronze',  loyaltyPoints: 0,    lifetimePoints: 0 },
  { name: 'Bui Thanh Khoa',  email: 'khoa.bt@washpro.vn',     phone: '0908888888', password: '123456', role: 'manager',  status: 'active',   tier: 'silver',  loyaltyPoints: 900,  lifetimePoints: 2100 },
  { name: 'Dang Ngoc Lan',   email: 'lan.dn@washpro.vn',      phone: '0909999999', password: '123456', role: 'customer', status: 'active',   tier: 'gold',    loyaltyPoints: 4200, lifetimePoints: 9500 },
  { name: 'Hoang Viet Nam',  email: 'nam.hv@washpro.vn',      phone: '0910000000', password: '123456', role: 'customer', status: 'active',   tier: 'bronze',  loyaltyPoints: 150,  lifetimePoints: 600 },
];

async function seed() {
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  if (process.env.FORCE) {
    await User.deleteMany({});
    console.log('Cleared existing users');
  }

  let created = 0;
  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) {
      await User.create(u);
      created++;
      console.log(`Created: ${u.name} (${u.email})`);
    } else {
      console.log(`Skipped: ${u.email} (already exists)`);
    }
  }

  console.log(`\nDone. Created ${created} new users.`);
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
