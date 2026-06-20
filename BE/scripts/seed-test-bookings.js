require('dotenv').config();
const mongoose = require('mongoose');
const User    = require('../src/models/user.schema');
const Branch  = require('../src/models/branch.schema');
const Package = require('../src/models/package.schema');
const Vehicle = require('../src/models/vehicle.schema');
const Booking = require('../src/models/booking.schema');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/washpro';

async function seed() {
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Find test customers (all customers)
  const customers = await User.find({ role: 'customer' });
  console.log(`Found ${customers.length} customers`);

  // Find branches
  const branches = await Branch.find({ status: 'active' });
  console.log(`Found ${branches.length} branches`);

  // Find packages
  const packages = await Package.find({ status: 'active' });
  console.log(`Found ${packages.length} packages`);

  if (!customers.length || !branches.length || !packages.length) {
    console.log('Missing required data — run seed.js and seed-branches.js first');
    await mongoose.disconnect();
    return;
  }

  // For each customer, find their vehicles and create completed bookings
  let created = 0;
  for (const customer of customers) {
    const vehicles = await Vehicle.find({ userId: customer._id });
    if (!vehicles.length) {
      console.log(`  ${customer.name}: no vehicles, skipping`);
      continue;
    }

    const branch = branches[customers.indexOf(customer) % branches.length];
    const pkg = packages[customers.indexOf(customer) % packages.length];
    const vehicle = vehicles[0];
    const endH = parseInt(pkg.duration ? 8 + Math.floor(pkg.duration / 60) : 9);
    const endM = pkg.duration ? pkg.duration % 60 : 0;
    const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    // Create 2 completed bookings per customer: 3 days ago and 7 days ago
    for (const daysAgo of [3, 7]) {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      d.setHours(8, 0, 0, 0);
      const dateStr = d.toISOString().slice(0, 10);

      // Check if there's already a completed booking for this user/date
      const existing = await Booking.findOne({
        userId: customer._id,
        bookingDate: { $gte: new Date(`${dateStr}T00:00:00.000Z`), $lte: new Date(`${dateStr}T23:59:59.999Z`) },
        status: 'completed',
      });
      if (existing) {
        console.log(`  ${customer.name}: booking on ${dateStr} already exists, skipping`);
        continue;
      }

      const booking = new Booking({
        userId: customer._id,
        branchId: branch._id,
        packageId: pkg._id,
        vehicleId: vehicle._id,
        bookingDate: d,
        bookingCode: `SEED-${dateStr.replace(/-/g, '')}-${String(customers.indexOf(customer) + 1)}${daysAgo}`,
        startTime: '08:00',
        endTime: endStr,
        status: 'completed',
        bookingType: 'single',
        priority: 1,
        finalPrice: pkg.price || 100000,
        paymentStatus: 'paid',
        paymentMethod: 'cash',
        checkInTime: new Date(d.getTime() + 7.5 * 3600000),
        checkOutTime: new Date(d.getTime() + (7.5 + (pkg.duration || 30) / 60) * 3600000),
        // NO rating or feedback — user can leave feedback
      });
      await booking.save();
      console.log(`  ${customer.name}: completed booking on ${dateStr} (vehicle: ${vehicle.licensePlate})`);
      created++;
    }
  }

  console.log(`\nCreated ${created} completed bookings without feedback`);
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
