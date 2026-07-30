const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const { User, PointHistory } = require('../src/models');
const loyaltyService = require('../src/services/loyalty.service');

let mongoServer;
let adminToken;
let customerToken;
let adminUser;
let customerUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  loyaltyService.clearCache();

  // Create admin user
  const adminRes = await request(app).post('/api/auth/register').send({
    name: 'Admin Test',
    email: 'admin@test.com',
    password: 'Password123!',
    phone: '0900000001',
  });
  adminToken = adminRes.body.data.accessToken;
  adminUser = await User.findById(adminRes.body.data.user._id);
  adminUser.role = 'admin';
  await adminUser.save();

  // Create customer user
  const customerRes = await request(app).post('/api/auth/register').send({
    name: 'Customer Test',
    email: 'customer@test.com',
    password: 'Password123!',
    phone: '0900000002',
  });
  customerToken = customerRes.body.data.accessToken;
  customerUser = await User.findById(customerRes.body.data.user._id);
});

describe('Dynamic Loyalty & Tier Config API & Service', () => {
  it('GET /api/loyalty/config - should return default loyalty config', async () => {
    const res = await request(app).get('/api/loyalty/config');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('baseEarningRate', 5);
    expect(res.body.data.tiers.length).toBeGreaterThanOrEqual(4);
  });

  it('PUT /api/loyalty/config - non-admin should get 403', async () => {
    const res = await request(app)
      .put('/api/loyalty/config')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ baseEarningRate: 10 });
    expect(res.statusCode).toBe(403);
  });

  it('PUT /api/loyalty/config - admin should update loyalty config', async () => {
    const updatePayload = {
      baseEarningRate: 10,
      pointExpirationMonths: 12,
      tiers: [
        { id: 'bronze', name: 'Đồng Mới', minPoints: 0, multiplier: 1.0, benefits: ['Ưu đãi 1'] },
        { id: 'silver', name: 'Bạc Mới', minPoints: 50000, multiplier: 1.5, benefits: ['Ưu đãi 2'] },
        { id: 'gold', name: 'Vàng Mới', minPoints: 200000, multiplier: 2.0, benefits: ['Ưu đãi 3'] },
        { id: 'diamond', name: 'Kim Cương Mới', minPoints: 500000, multiplier: 3.0, benefits: ['Ưu đãi VIP'] },
      ],
    };

    const res = await request(app)
      .put('/api/loyalty/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatePayload);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.baseEarningRate).toBe(10);
    expect(res.body.data.tiers[0].name).toBe('Đồng Mới');
    expect(res.body.data.tiers[1].minPoints).toBe(50000);

    const points = loyaltyService.calculatePoints(100000, 'silver', res.body.data);
    expect(points).toBe(15000);

    const tier = loyaltyService.determineTier(60000, res.body.data);
    expect(tier).toBe('silver');
  });

  it('addPointsFromPayment should save snapshot and update user points', async () => {
    await request(app)
      .put('/api/loyalty/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        baseEarningRate: 8,
        tiers: [
          { id: 'bronze', name: 'Đồng', minPoints: 0, multiplier: 1.0 },
          { id: 'silver', name: 'Bạc', minPoints: 10000, multiplier: 2.0 },
        ],
      });

    const result = await loyaltyService.addPointsFromPayment(customerUser._id, 100000, new mongoose.Types.ObjectId());
    expect(result.pointsEarned).toBe(8000);

    const updatedCustomer = await User.findById(customerUser._id);
    expect(updatedCustomer.loyaltyPoints).toBe(8000);

    const history = await PointHistory.findOne({ userId: customerUser._id });
    expect(history).toBeTruthy();
    expect(history.snapshot).toHaveProperty('baseRate', 8);
    expect(history.snapshot).toHaveProperty('orderAmount', 100000);
  });

  it('GET /api/loyalty/admin/history - should return point history for admin with filter & validation', async () => {
    await loyaltyService.addPointsFromPayment(customerUser._id, 200000, new mongoose.Types.ObjectId());

    // Test successful fetch
    const res = await request(app)
      .get('/api/loyalty/admin/history')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].userId.name).toBe('Customer Test');

    // Test search filter
    const searchRes = await request(app)
      .get('/api/loyalty/admin/history?search=Customer')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(searchRes.body.data.length).toBe(1);

    // Test invalid date range (startDate > endDate) -> 400 Bad Request
    const invalidDateRes = await request(app)
      .get('/api/loyalty/admin/history?startDate=2026-12-31&endDate=2026-01-01')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(invalidDateRes.statusCode).toBe(400);
    expect(invalidDateRes.body.success).toBe(false);
    expect(invalidDateRes.body.message).toContain('Ngày bắt đầu không được lớn hơn ngày kết thúc');
  });
});
