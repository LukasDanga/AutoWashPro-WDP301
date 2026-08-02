const mongoose = require('mongoose');
require('./../src/models/user.schema');
const User = mongoose.model('User');
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/washpro';

const NAMES = [
  'Lê Văn Cường', 'Phạm Thị Dung', 'Nguyễn Văn An', 'Trần Minh Tuấn',
  'Hoàng Thị Mai', 'Đặng Văn Hải', 'Bùi Quốc Bảo', 'Đỗ Thị Hồng',
  'Ngô Văn Phúc',
];

async function fix() {
  await mongoose.connect(uri);
  const users = await User.find({ role: 'customer' }).sort({ createdAt: 1 }).lean();
  console.log('Found ' + users.length + ' customers');
  for (let i = 0; i < Math.min(users.length, NAMES.length); i++) {
    await User.findByIdAndUpdate(users[i]._id, { name: NAMES[i] });
    console.log('  ' + (i+1) + '. ' + users[i].name + ' -> ' + NAMES[i]);
  }
  await mongoose.disconnect();
  console.log('Done');
}
fix().catch(err => { console.error(err); process.exit(1); });
