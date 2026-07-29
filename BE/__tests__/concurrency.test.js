const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const app = require('../src/app');
const { User, Branch, Package, Vehicle, Booking, WalletTransaction } = require('../src/models');
const jwt = require('jsonwebtoken');
const config = require('../src/config/env');

let replSet;
let user1Token, user1Id;
let branchId, packageId, vehicleId;

// Increase timeout for concurrency tests
jest.setTimeout(30000);

beforeAll(async () => {
  // Use Replica Set for Transaction Support
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  await mongoose.connect(uri);

  // Seed Basic Data
  const user1 = await User.create({
    fullName: 'Concurrent User',
    email: 'concurrent@example.com',
    password: 'Password123!',
    phone: '0909999999',
    walletBalance: 500000,
    tier: 'bronze'
  });
  user1Id = user1._id;
  user1Token = jwt.sign({ id: user1Id }, config.JWT_SECRET, { expiresIn: '1h' });

  const branch = await Branch.create({
    name: 'Test Branch',
    address: '123 Test',
    capacity: 2, // Only 2 slots!
    status: 'active',
    openingTime: '07:00',
    closingTime: '22:00'
  });
  branchId = branch._id;

  const pkg = await Package.create({
    name: 'Test Package',
    price: 100000,
    duration: 60, // 1 hour
    status: 'active'
  });
  packageId = pkg._id;

  const vehicle = await Vehicle.create({
    userId: user1Id,
    licensePlate: '59A-12345',
    vehicleType: 'sedan',
    brand: 'Toyota',
    model: 'Vios',
    color: 'White'
  });
  vehicleId = vehicle._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  // Clear bookings and wallet transactions after each test
  await Booking.deleteMany({});
  await WalletTransaction.deleteMany({});
  // Reset user wallet
  await User.findByIdAndUpdate(user1Id, { walletBalance: 500000 });
});

describe('Concurrency & Stress Tests', () => {

  it('1. Wallet Race Condition: 10 concurrent payments of 100k, only 5 should succeed (500k total balance)', async () => {
    const paymentService = require('../src/services/payment.service');
    
    // We mock a booking first
    const booking = await Booking.create({
      userId: user1Id, branchId, packageId, vehicleId,
      bookingDate: new Date(), startTime: '10:00', endTime: '11:00',
      status: 'pending', bookingType: 'single', finalPrice: 100000
    });

    const concurrentRequests = 10;
    const promises = [];

    for (let i = 0; i < concurrentRequests; i++) {
      // Mock payment object
      const paymentData = {
        bookingId: booking._id,
        userId: user1Id,
        amount: 100000,
        paymentType: 'full',
        method: 'wallet', // Trigger wallet deduction
        status: 'pending'
      };
      
      const p = request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          bookingId: booking._id,
          amount: 100000,
          method: 'wallet',
          paymentType: 'full' // or 'deposit'
        })
        .then(res => {
          if (res.statusCode === 200 || res.statusCode === 201) return { success: true };
          return { success: false, error: res.body.message || res.statusCode };
        })
        .catch(err => ({ success: false, error: err.message }));
      
      promises.push(p);
    }

    const results = await Promise.all(promises);
    require('fs').writeFileSync('wallet-test-results.json', JSON.stringify(results, null, 2));

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // We expect exactly 5 successes because balance is 500k and each is 100k.
    expect(successCount).toBe(5);
    expect(failCount).toBe(5);

    // Verify DB Consistency
    const finalUser = await User.findById(user1Id);
    expect(finalUser.walletBalance).toBe(0); // Exactly 0

    // Verify exactly 5 wallet transactions were created
    const wtCount = await WalletTransaction.countDocuments({ userId: user1Id, amount: 100000, type: 'debit' });
    expect(wtCount).toBe(5);
  });

  it('2. Overbooking Race Condition: 20 concurrent bookings for 2 slots, exactly 2 should succeed', async () => {
    // Generate 20 concurrent booking requests to API
    const concurrentRequests = 20;
    const promises = [];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const bookingDateStr = tomorrow.toISOString().split('T')[0];

    for (let i = 0; i < concurrentRequests; i++) {
      const payload = {
        branchId,
        packageId,
        vehicleId,
        bookingDate: bookingDateStr,
        startTime: '14:00'
      };

      const p = request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${user1Token}`)
        .send(payload)
        .then(res => ({
          statusCode: res.statusCode,
          body: res.body
        }));
      promises.push(p);
    }

    const results = await Promise.all(promises);

    const successCount = results.filter(r => r.statusCode === 201).length;
    const conflictCount = results.filter(r => r.statusCode === 409).length;
    const otherErrors = results.filter(r => r.statusCode !== 201 && r.statusCode !== 409);

    // If there is any transient error that leaked (500), it's a bug.
    expect(otherErrors.length).toBe(0);

    // Exactly 2 should succeed because branch capacity is 2
    expect(successCount).toBe(2);
    expect(conflictCount).toBe(18);

    // Verify DB consistency
    const getDayBounds = (dateStr) => ({
      gte: new Date(`${dateStr}T00:00:00.000+07:00`),
      lte: new Date(`${dateStr}T23:59:59.999+07:00`)
    });
    const { gte, lte } = getDayBounds(bookingDateStr);

    const actualBookings = await Booking.countDocuments({
      branchId,
      status: { $in: ['pending', 'confirmed'] },
      bookingDate: { $gte: gte, $lte: lte },
      startTime: '14:00'
    });
    
    expect(actualBookings).toBe(2);
  });
});
