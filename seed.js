const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const { User } = require('./src/models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/washpro';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected');

    await User.deleteMany({});
    const admin = await User.create({
      name: 'Admin WashPro',
      email: process.env.ADMIN_EMAIL || 'admin@washpro.vn',
      password: process.env.ADMIN_PASSWORD || 'Admin123!',
      phone: '0901234567',
      role: 'admin',
      status: 'active',
    });
    console.log('Admin created:', admin.email, '/ Admin123!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
