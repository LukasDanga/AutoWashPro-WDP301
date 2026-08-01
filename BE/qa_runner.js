const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const path = require('path');
require('dotenv').config({ path: './.env' });

const { User, Branch, Package, Vehicle, SystemConfig, Booking, SlotPack } = require('./src/models');
const { getDepositRate } = require('./src/services/config.service'); // if needed, but we hit API

const API_URL = 'http://localhost:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'washpro_super_secret_jwt_key_change_in_production_2026';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const errors = [];
const originalConfigs = {};

function logPass(msg) { console.log(`${colors.green}[PASS]${colors.reset} ${msg}`); }
function logFail(step, input, expected, actual, file, severity) {
  const msg = `${colors.red}[FAIL]${colors.reset} ${step}`;
  console.error(msg);
  errors.push({ step, input, expected, actual, file, severity });
}

async function runQA() {
  console.log(`${colors.cyan}=== STARTING FINAL QA E2E TEST ===${colors.reset}`);
  
  // 1. Setup DB Connection
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000, maxPoolSize: 10 });
  console.log('Connected to DB');

  try {
    // 2. Setup Test Data
    const adminUser = await User.create({
      name: 'QA Admin', email: `qa_admin_${Date.now()}@test.com`, password: 'password123',
      role: 'admin', phone: `090${Math.floor(1000000 + Math.random() * 9000000)}`,
      isEmailVerified: true
    });
    
    const customerUser = await User.create({
      name: 'QA Customer', email: `qa_customer_${Date.now()}@test.com`, password: 'password123',
      role: 'customer', phone: `091${Math.floor(1000000 + Math.random() * 9000000)}`, tier: 'bronze', loyaltyPoints: 1000,
      isEmailVerified: true
    });

    const branch = await Branch.create({
      name: 'QA Branch', code: `QAB${Date.now()}`,
      address: '1 QA St',
      status: 'active', capacity: 2, operatingHours: { open: '00:00', close: '23:59' }
    });

    const pkg = await Package.create({
      name: 'QA Wash', type: 'main', duration: 30, isActive: true, code: `QAS${Date.now()}`,
      price: 100000,
      subServices: []
    });

    const vehicle = await Vehicle.create({
      userId: customerUser._id, licensePlate: '59A-12345', vehicleType: 'sedan', brand: 'Toyota', model: 'Vios', color: 'White', isDefault: true
    });

    // Generate Tokens
    const adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    const customerToken = jwt.sign({ id: customerUser._id, role: 'customer' }, JWT_SECRET, { expiresIn: '1h' });

    // Helpers for fetch
    const fetchAdmin = async (path, options = {}) => {
      const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
          ...options.headers
        }
      });
      const data = await res.json().catch(() => null);
      return { status: res.status, data };
    };

    const fetchCustomer = async (path, options = {}) => {
      const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${customerToken}`,
          ...options.headers
        }
      });
      const data = await res.json().catch(() => null);
      return { status: res.status, data };
    };

    // ---------------------------------------------------------
    // TEST 1: SystemConfig Sync
    // ---------------------------------------------------------
    console.log(`\n${colors.yellow}--- Test 1: SystemConfig Sync ---${colors.reset}`);
    
    // Save original for rollback
    const existingConfig = await SystemConfig.findOne({ key: 'DEPOSIT_RATE' });
    if (existingConfig) originalConfigs['DEPOSIT_RATE'] = existingConfig.value;

    const newDepositRate = 0.5; // 50%
    try {
      // Update config via Admin API
      const resUpdate = await fetchAdmin('/configs/update', {
        method: 'POST',
        body: JSON.stringify({
          key: 'DEPOSIT_RATE',
          value: newDepositRate,
          type: 'number',
          isPublic: true,
          scope: 'global'
        })
      });
      if (resUpdate.status !== 200 && resUpdate.status !== 201) throw new Error('API return bad status');
      
      // Fetch via Public API (simulating FE/Mobile load)
      const resPublicReq = await fetch(`${API_URL}/configs/public`);
      const resPublicData = await resPublicReq.json();
      const publicConfigs = resPublicData.data;
      
      if (publicConfigs['DEPOSIT_RATE'] === newDepositRate) {
        logPass('SystemConfig DEPOSIT_RATE propagated successfully to public endpoint.');
      } else {
        logFail('Verify SystemConfig propagation', 'Set DEPOSIT_RATE = 0.5', 0.5, publicConfigs['DEPOSIT_RATE'], 'BE/src/services/config.service.js', 'High');
      }
    } catch (e) {
      logFail('Update Config API', 'POST /configs', '200 OK', e.message, 'BE/src/controllers/config.controller.js', 'High');
    }

    // ---------------------------------------------------------
    // TEST 2: Regular Booking
    // ---------------------------------------------------------
    console.log(`\n${colors.yellow}--- Test 2: Regular Booking Calculation ---${colors.reset}`);
    
    let regularBookingId = null;
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

    try {
      const resBooking = await fetchCustomer('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          branchId: branch._id,
          vehicleId: vehicle._id,
          packageId: pkg._id,
          bookingDate: dateStr,
          startTime: '10:00'
        })
      });

      if (resBooking.status !== 201) {
        throw new Error((resBooking.data?.message || 'API returned bad status') + ' ' + JSON.stringify(resBooking.data?.errors || {}));
      }
      const booking = resBooking.data.data;
      regularBookingId = booking._id;

      // Price is 100000 for car_4_seat. Deposit rate is now 0.5. Deposit should be 50000.
      const expectedDeposit = 50000;
      if (booking.depositAmount === expectedDeposit) {
        logPass(`Regular booking math is correct: Deposit is ${expectedDeposit}`);
      } else {
        logFail('Verify Regular Booking Deposit', 'Price = 100k, Rate = 0.5', expectedDeposit, booking.depositAmount, 'BE/src/services/booking.service.js', 'High');
      }
    } catch (e) {
      let errMsg = e.response?.data?.message || e.message;
      if (e.response?.data?.errors) {
        errMsg += ' ' + JSON.stringify(e.response.data.errors);
      }
      logFail('Create Regular Booking', 'POST /bookings', '201 Created', errMsg, 'BE/src/services/booking.service.js', 'High');
    }
    } catch (e) {
      logFail('Create Regular Booking', 'POST /bookings', '201 Created', e.response?.data?.message || e.message, 'BE/src/services/booking.service.js', 'High');
    }

    // ---------------------------------------------------------
    // TEST 3: Recurring Booking (Blocking Limit)
    // ---------------------------------------------------------
    console.log(`\n${colors.yellow}--- Test 3: Recurring Booking Limits ---${colors.reset}`);
    try {
      // Bronze tier limit is 14 days by default. We will set it to 3 days to test blocking.
      await fetchAdmin('/configs/update', {
        method: 'POST',
        body: JSON.stringify({
          key: 'ADVANCE_BOOKING_LIMITS',
          value: { bronze: 3, silver: 14, gold: 30, diamond: 60, Ruby: 60 },
          type: 'json',
          isPublic: true
        })
      });

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const dateStr = nextWeek.toISOString().split('T')[0];

      // Customer is bronze. Limit is 3. Booking for 7 days ahead should FAIL.
      let failedAsExpected = false;
      const { data: branchRes } = await fetchCustomer('/branches');
      const branchId = branchRes.data[0]._id;
      const resFailed = await fetchCustomer('/bookings/recurring', {
        method: 'POST',
        body: JSON.stringify({
          branchId: branch._id,
          vehicleId: vehicle._id,
          packageId: pkg._id,
          weekdays: [1, 2, 3, 4, 5],
          weeks: 2,
          startTime: '12:00'
        })
      });
      if (resFailed.status >= 400 || (resFailed.data && resFailed.data.message && resFailed.data.message.includes('vượt quá thời gian'))) {
        failedAsExpected = true;
      }

      if (failedAsExpected) {
        logPass('Recurring booking respects ADVANCE_BOOKING_LIMITS and blocks far bookings.');
      } else {
        logFail('Verify ADVANCE_BOOKING_LIMITS', 'Bronze limit 3, book 7 days out', 'Block/Error 400', 'Success 201', 'BE/src/services/booking.service.js', 'High');
      }
    } catch (e) {
      logFail('Test Recurring Booking Config', 'Update limit and book', 'Handled Rejection', e.message, 'BE/src/services/booking.service.js', 'High');
    }

    // ---------------------------------------------------------
    // TEST 4: Slot Package Purchase
    try {
      // Buy it via API
      const resBuy = await fetchCustomer('/slot-packs', {
        method: 'POST',
        body: JSON.stringify({
          branchId: branch._id,
          packageId: pkg._id,
          vehicleId: vehicle._id,
          totalSlots: 10
        })
      });
      const purchase = resBuy.data.data;
      
      if (purchase && purchase.paymentStatus === 'unpaid' && purchase.finalPrice === 900000) {
        logPass('Slot Package created awaiting payment with correct price.');
      } else {
        logFail('Verify Slot Package Final Price', '10 slots * 100k - 10%', 900000, purchase ? purchase.finalPrice : resBuy.data?.message, 'BE/src/services/slotPackage.service.js', 'Medium');
      }

      // Complete payment internally for DB check
      await SlotPack.findByIdAndUpdate(purchase._id, { status: 'active', paymentStatus: 'paid' });
    } catch (e) {
      logFail('Purchase Slot Package', 'POST /slot-packages/purchase', 'Success', e.response?.data?.message || e.message, 'BE/src/services/slotPackage.service.js', 'Medium');
    }

    // ---------------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------------
    console.log(`\n${colors.cyan}=== CLEANUP ===${colors.reset}`);
    await User.findByIdAndDelete(adminUser._id);
    await User.findByIdAndDelete(customerUser._id);
    await Branch.findByIdAndDelete(branch._id);
    await Package.findByIdAndDelete(pkg._id);
    await Vehicle.findByIdAndDelete(vehicle._id);
    
    // Rollback configs
    if (originalConfigs['DEPOSIT_RATE'] !== undefined) {
      await SystemConfig.findOneAndUpdate({ key: 'DEPOSIT_RATE' }, { value: originalConfigs['DEPOSIT_RATE'] });
    } else {
      await SystemConfig.findOneAndDelete({ key: 'DEPOSIT_RATE' });
    }
    await SystemConfig.findOneAndDelete({ key: 'ADVANCE_BOOKING_LIMITS' });
    const { clearCache } = require('e:/WDP/AutoWashPro-WDP301/BE/src/services/config.service');
    clearCache();

    console.log('Test data cleaned up successfully.');

  } catch (err) {
    console.error("Fatal error during QA setup:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }

  // Generate Report
  console.log(`\n${colors.cyan}=== QA RESULTS ===${colors.reset}`);
  if (errors.length === 0) {
    console.log(`${colors.green}ALL TESTS PASSED! No regressions found.${colors.reset}`);
  } else {
    console.log(`${colors.red}${errors.length} ERROR(S) FOUND:${colors.reset}`);
    errors.forEach((e, i) => {
      console.log(`\n${i+1}. Step: ${e.step}`);
      console.log(`   File: ${e.file}`);
      console.log(`   Expected: ${e.expected} | Actual: ${e.actual}`);
      console.log(`   Severity: ${e.severity}`);
    });
  }

  require('fs').writeFileSync('e:/WDP/AutoWashPro-WDP301/qa_results.json', JSON.stringify(errors, null, 2));
}

runQA();
