const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const app = require('../src/app');
const { User, Branch, Package, Vehicle, Booking, SlotPack, WalletTransaction } = require('../src/models');
const jwt = require('jsonwebtoken');
const config = require('../src/config/env');

let replSet;
let adminToken, customerToken;
let customerId, adminId, branchId, packageId, vehicleId;

jest.setTimeout(30000);

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();
  await mongoose.connect(uri);

  // Setup Users
  const admin = await User.create({
    fullName: 'Admin User', email: 'admin@test.com', password: 'Password123!',
    phone: '0901111111', role: 'admin'
  });
  adminId = admin._id;
  adminToken = jwt.sign({ id: adminId }, config.JWT_SECRET, { expiresIn: '1h' });

  const customer = await User.create({
    fullName: 'Test Customer', email: 'customer@test.com', password: 'Password123!',
    phone: '0902222222', role: 'customer', walletBalance: 1000000, tier: 'bronze'
  });
  customerId = customer._id;
  customerToken = jwt.sign({ id: customerId }, config.JWT_SECRET, { expiresIn: '1h' });

  // Setup Branch
  const branch = await Branch.create({
    name: 'Test Branch', address: '123 Test', capacity: 3, status: 'active',
    openingTime: '07:00', closingTime: '22:00'
  });
  branchId = branch._id;

  // Setup Package
  const pkg = await Package.create({
    name: 'Test Package', price: 200000, duration: 60, status: 'active'
  });
  packageId = pkg._id;

  // Setup Vehicle
  const vehicle = await Vehicle.create({
    userId: customerId, licensePlate: '59A-12345', vehicleType: 'sedan',
    brand: 'Toyota', model: 'Vios', color: 'White'
  });
  vehicleId = vehicle._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

afterEach(async () => {
  await Booking.deleteMany({});
  await WalletTransaction.deleteMany({});
  await SlotPack.deleteMany({});
  await User.findByIdAndUpdate(customerId, { walletBalance: 1000000, points: 0 });
});

describe('Regression Tests', () => {

  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  describe('1. Normal Booking', () => {
    it('Should create a normal single booking', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          branchId, packageId, vehicleId,
          bookingDate: getTomorrowStr(),
          startTime: '10:00'
        });
      
      expect(res.statusCode).toBe(201);
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.depositAmount).toBeGreaterThan(0);
    });
  });

  describe('2. Slot Pack', () => {
    it('Should buy and use a slot pack to book', async () => {
      // 1. Buy Slot Pack
      const packRes = await request(app)
        .post('/api/slot-packs')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          packageId, vehicleId, branchId,
          totalSlots: 5
        });
      
      if (packRes.statusCode !== 201) console.log(packRes.body);
      expect(packRes.statusCode).toBe(201);
      const packId = packRes.body.data._id;

      // Make it active for testing (usually admin confirms it)
      await SlotPack.findByIdAndUpdate(packId, { status: 'active' });

      // 2. Book using Slot Pack
      const bookRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          branchId, packageId, vehicleId,
          bookingDate: getTomorrowStr(),
          startTime: '14:00',
          slotPackId: packId
        });
      
      if (bookRes.statusCode !== 201) console.log(bookRes.body);
      expect(bookRes.statusCode).toBe(201);
      expect(bookRes.body.data.depositAmount).toBe(0); // No deposit for slot packs
      
      // 3. Verify Slot Pack decrement
      const updatedPack = await SlotPack.findById(packId);
      expect(updatedPack.remainingSlots).toBe(4);
      expect(updatedPack.usedSlots).toBe(1);
    });
  });

  describe('3. Payment via Wallet', () => {
    it('Should deduct wallet balance correctly', async () => {
      // 1. Create booking
      const bookRes = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          branchId, packageId, vehicleId,
          bookingDate: getTomorrowStr(),
          startTime: '11:00'
        });
      
      const bookingId = bookRes.body.data._id;
      const deposit = bookRes.body.data.depositAmount;

      // 2. Pay deposit with wallet
      const payRes = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          bookingId,
          amount: deposit,
          method: 'wallet',
          paymentType: 'deposit'
        });
      
      if (![200, 201].includes(payRes.statusCode)) console.log(payRes.body);
      expect([200, 201]).toContain(payRes.statusCode);
      
      // 3. Verify wallet balance deducted
      const user = await User.findById(customerId);
      expect(user.walletBalance).toBe(1000000 - deposit);

      // 4. Verify booking status
      const updatedBooking = await Booking.findById(bookingId);
      expect(updatedBooking.depositPaid).toBe(true);
      expect(updatedBooking.paymentStatus).toBe('deposit_paid');
    });
  });

  describe('4. Idempotency Testing', () => {
    it('Should not double-deduct wallet if confirmPaymentCallback is called twice', async () => {
      const paymentService = require('../src/services/payment.service');
      const mongoose = require('mongoose');
      
      // Tạo một slot pack payment
      const payment = new (mongoose.model('Payment'))({
        userId: customerId,
        amount: 100000,
        method: 'wallet',
        paymentType: 'topup',
        status: 'pending',
        transactionId: 'TEST_IDEMP_' + Date.now()
      });
      await payment.save();

      // Kiểm tra balance trước
      const userBefore = await mongoose.model('User').findById(customerId);
      const balanceBefore = userBefore.walletBalance || 0;

      // Gọi lần 1
      await paymentService.confirmPaymentCallback(payment.transactionId, 'TEST_GATEWAY', true);
      
      // Kiểm tra balance sau lần 1
      const userAfter1 = await mongoose.model('User').findById(customerId);
      expect(userAfter1.walletBalance).toBe(balanceBefore + 100000);

      // Gọi lần 2
      await paymentService.confirmPaymentCallback(payment.transactionId, 'TEST_GATEWAY', true);

      // Kiểm tra balance sau lần 2 (không đổi)
      const userAfter2 = await mongoose.model('User').findById(customerId);
      expect(userAfter2.walletBalance).toBe(balanceBefore + 100000);
    });
  });
});
