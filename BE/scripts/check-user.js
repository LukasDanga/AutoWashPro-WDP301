// Check if user exists and test password
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const email = 'huongne@gmail.com'; // most recently registered user
  const user = await mongoose.connection.db.collection('users').findOne({ email });
  console.log('User found:', !!user);
  if (user) {
    console.log('Name:', user.name);
    console.log('Role:', user.role);
    console.log('Status:', user.status);
    console.log('Created:', user.createdAt);
    if (user.password) {
      console.log('Password hash exists: yes');
      console.log('Test "huong":', bcrypt.compareSync('huong', user.password));
      console.log('Test "Huong123":', bcrypt.compareSync('Huong123', user.password));
      console.log('Test "123456":', bcrypt.compareSync('123456', user.password));
      console.log('Test "password":', bcrypt.compareSync('password', user.password));
    } else {
      console.log('Password hash exists: no (likely Google-only account)');
    }
  }
  await mongoose.disconnect();
}
run().catch(e => console.error(e));
