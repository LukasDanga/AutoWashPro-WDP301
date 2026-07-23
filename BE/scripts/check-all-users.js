require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  const commonPasswords = ['123456', 'password', 'admin123', 'huong', 'Huong123', 'Anh123', '12345678'];
  
  for (const u of users) {
    if (u.password) {
      for (const p of commonPasswords) {
        if (bcrypt.compareSync(p, u.password)) {
          console.log(`${u.email} (${u.name}) - password: "${p}"`);
        }
      }
    } else {
      console.log(`${u.email} (${u.name}) - NO PASSWORD (Google only)`);
    }
  }
  await mongoose.disconnect();
}
run().catch(e => console.error(e));
