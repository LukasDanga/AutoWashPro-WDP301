const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect('mongodb+srv://khanglab27:Lukan%402004@wdp301-autowashpro.gf3ndbj.mongodb.net/washpro?appName=WDP301-AutoWashPro').then(async () => {
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false, collection: 'bookings' }));
  const b = await Booking.find({ 
    bookingDate: { 
      $gte: new Date('2026-07-30T00:00:00Z'), 
      $lte: new Date('2026-08-05T23:59:59Z') 
    } 
  });
  console.log("Bookings: ", b.map(x => ({ startTime: x.startTime, endTime: x.endTime, status: x.status, branchId: x.branchId, bookingType: x.bookingType, date: x.bookingDate })));
  const Branch = mongoose.model('Branch', new mongoose.Schema({}, { strict: false, collection: 'branches' }));
  const br = await Branch.find();
  console.log("Branches: ", br.map(x => ({ id: x._id, capacity: x.capacity })));
  process.exit(0);
});
