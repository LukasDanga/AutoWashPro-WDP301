const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const { User, Branch, Package, Vehicle } = require('../src/models');

let mongoServer;

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
});

describe('AutoWashPro Backend API Test Suite', () => {

  describe('1. Health Check Endpoint', () => {
    it('GET /health - should return status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'ok');
    });
  });

  describe('2. Authentication & User API', () => {
    const testUser = {
      fullName: 'Nguyen Van Test',
      email: 'testcustomer@example.com',
      password: 'Password123!',
      phone: '0901234567'
    };

    it('POST /api/auth/register - should create a new customer account', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toHaveProperty('email', testUser.email);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('POST /api/auth/register - should return 409 when email already exists', async () => {
      await request(app).post('/api/auth/register').send(testUser);
      
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.statusCode).toEqual(409);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/login - should authenticate valid user with identifier', async () => {
      await request(app).post('/api/auth/register').send(testUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: testUser.email,
          password: testUser.password
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('GET /api/auth/profile - should return profile for authenticated user', async () => {
      const regRes = await request(app).post('/api/auth/register').send(testUser);
      const token = regRes.body.data.accessToken;

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('email', testUser.email);
    });
  });

  describe('3. Branch & Package Public API', () => {
    it('GET /api/branches/public - should return list of public branches', async () => {
      await Branch.create({
        name: 'Chi nhánh Quận 9',
        address: '123 D1 High Tech Park, Q9',
        phone: '0281234567',
        location: { type: 'Point', coordinates: [106.809, 10.841] },
        status: 'active'
      });

      const res = await request(app).get('/api/branches/public');
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('GET /api/packages - should return service packages', async () => {
      await Package.create({
        name: 'Rửa xe Tiêu chuẩn',
        description: 'Dịch vụ rửa xe và hút bụi nội thất',
        price: 100000,
        duration: 30,
        estimatedMinutes: 30,
        applicableVehicleTypes: ['Sedan', 'SUV'],
        isActive: true
      });

      const res = await request(app).get('/api/packages');
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('4. Vehicle Management API', () => {
    it('POST & GET /api/vehicles - customer can add and list vehicles', async () => {
      const regRes = await request(app).post('/api/auth/register').send({
        fullName: 'Car Owner',
        email: 'carowner@example.com',
        password: 'Password123!',
        phone: '0988776655'
      });
      const token = regRes.body.data.accessToken;

      const createRes = await request(app)
        .post('/api/vehicles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          licensePlate: '59A-999.99',
          vehicleType: 'suv',
          brand: 'Toyota',
          model: 'Fortuner',
          color: 'Trắng'
        });

      expect(createRes.statusCode).toEqual(201);
      expect(createRes.body.success).toBe(true);

      const listRes = await request(app)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${token}`);

      expect(listRes.statusCode).toEqual(200);
      expect(listRes.body.data.length).toBe(1);
      expect(listRes.body.data[0].licensePlate).toBe('59A-999.99');
    });
  });

});
