const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(uri);
  const p = await mongoose.connection.db.collection('payments').findOne({ status: 'paid' });
  if (!p) {
    console.log('No paid payment found');
    process.exit(0);
  }
  console.log('Payment:', p);
  
  const agg = await mongoose.connection.db.collection('payments').aggregate([
    { $match: { userId: p.userId, status: 'paid' } }
  ]).toArray();
  
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0,0,0,0);

  const monthsAgg = await mongoose.connection.db.collection('payments').aggregate([
    { $match: { userId: p.userId, status: 'paid', createdAt: { $gte: sixMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        totalAmount: { $sum: "$amount" }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]).toArray();

  console.log('Months Agg:', JSON.stringify(monthsAgg, null, 2));

  const fullAgg = await mongoose.connection.db.collection('payments').aggregate([
      { $match: { userId: p.userId, status: 'paid' } },
      {
        $lookup: {
          from: 'bookings',
          localField: 'bookingId',
          foreignField: '_id',
          as: 'booking',
        },
      },
      { $unwind: { path: '$booking', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'vehicles',
          localField: 'booking.vehicleId',
          foreignField: '_id',
          as: 'vehicle',
        },
      },
      { $unwind: { path: '$vehicle', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            vehicleId: '$vehicle._id',
            licensePlate: '$vehicle.licensePlate',
            vehicleType: '$vehicle.vehicleType',
            brand: '$vehicle.brand'
          },
          totalAmount: { $sum: "$amount" }
        }
      }
  ]).toArray();
  console.log('Full Agg:', JSON.stringify(fullAgg, null, 2));

  process.exit(0);
}

run().catch(console.error);
