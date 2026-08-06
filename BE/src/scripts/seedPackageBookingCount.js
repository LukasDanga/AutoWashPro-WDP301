const mongoose = require('mongoose');
const { Package } = require('../models');
require('dotenv').config({ path: __dirname + '/../../.env' });

async function seedPackageBookingCount() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const packages = await Package.find({ isDeleted: { $ne: true } });
    console.log(`Found ${packages.length} packages to update bookingCount.`);

    for (const pkg of packages) {
      // Random booking count between 8 and 98
      const randomCount = Math.floor(Math.random() * 91) + 8;
      pkg.bookingCount = randomCount;
      await pkg.save();
      console.log(`Updated "${pkg.name}" (${pkg._id}): bookingCount = ${randomCount}`);
    }

    console.log('Successfully updated bookingCount for all packages!');
  } catch (err) {
    console.error('Error updating bookingCount:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

seedPackageBookingCount();
