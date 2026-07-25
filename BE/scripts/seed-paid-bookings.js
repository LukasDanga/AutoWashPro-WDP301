/**
 * AutoWashPro — Seed Paid Bookings with Package & Sub-Service Details
 * Run: node scripts/seed-paid-bookings.js
 *
 * Seeds completed/confirmed bookings with:
 *   - Full packageName, packageDuration stored
 *   - selectedSubServices (bundled + optional) with prices/durations
 *   - voucherCode + discountAmount applied
 *   - Payment records (paid)
 *   - Booking codes
 *
 * Uses existing users (custIds[0–4]), branches, packages from seed-full.js.
 * Passwords never touched.
 */

require('dotenv').config();
require('../src/config/dns');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGODB_URI;

const oid  = () => new mongoose.Types.ObjectId();
const hash = pwd => bcrypt.hashSync(pwd, 12);

function daysAgo(n, h = 0) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, 0, 0, 0); return d;
}
function daysFromNow(n, h = 0) {
  const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, 0, 0, 0); return d;
}
function todayAt(h, m = 0) {
  const d = new Date(); d.setHours(h, m, 0, 0); return d;
}
function today() { return daysAgo(0); }

const User         = require('../src/models/user.schema');
const Branch       = require('../src/models/branch.schema');
const Package      = require('../src/models/package.schema');
const Vehicle      = require('../src/models/vehicle.schema');
const Voucher      = require('../src/models/voucher.schema');
const Booking      = require('../src/models/booking.schema');
const Payment      = require('../src/models/payment.schema');

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // ── Resolve existing IDs ──────────────────────────────────────────────────
  const customers = await User.find({ role: 'customer' }).sort({ createdAt: 1 }).limit(5);
  if (customers.length < 5) { console.error('Need at least 5 customers. Run seed-full.js first.'); process.exit(1); }
  const custIds = customers.map(u => u._id);

  const branches = await Branch.find({ status: 'active' }).limit(5);
  if (branches.length < 5) { console.error('Need at least 5 active branches.'); process.exit(1); }
  const branchIds = branches.map(b => b._id);

  const packages = await Package.find({ status: 'active' }).limit(20);
  if (packages.length < 20) { console.error('Need at least 20 packages.'); process.exit(1); }
  const pkgList = packages;

  const vehicles = await Vehicle.find().limit(10);
  if (vehicles.length < 10) { console.error('Need at least 10 vehicles.'); process.exit(1); }
  const vehicleList = vehicles;

  const now = new Date();
  const todayDate = today();

  // ── Helper: pick items from a pool ────────────────────────────────────────
  const pick = (arr, idx) => arr[idx % arr.length];
  const generateCode = () => 'BK-' + Math.random().toString(36).substring(2, 8).toUpperCase();

  // ── 1. CLEAR old paid-booking data ────────────────────────────────────────
  console.log('Clearing old paid-booking seed data...');
  await Booking.deleteMany({ bookingCode: /^BK-/ });
  await Payment.deleteMany({ transactionId: /^PAID-/ });

  // ── 2. BUILD bookings ─────────────────────────────────────────────────────
  console.log('Building bookings...');
  const bookingEntries = [];

  // 10 completed bookings with full package info + sub-services + vouchers
  const bookingSpecs = [
    // (userId, branchId, pkg, vehicle, daysAgo, startTime, endTime, status, subServiceNames, voucherCode, discountAmt, rating, feedback)
    { ci: 0, bi: 0, pi: 0, vi: 0, da: 2, st: '09:00', et: '09:30', subSv: ['Xịt rửa gầm áp lực cao', 'Hút bụi nội thất ô tô'], vc: '', da_: 0, rt: 5, fb: 'Rửa sạch, thêm vệ sinh nội thất rất kỹ!' },
    { ci: 1, bi: 0, pi: 1, vi: 2, da: 3, st: '10:00', et: '10:50', subSv: ['Vệ sinh khoang máy bằng hơi nước', 'Tẩy nhựa đường & vết ố kính'], vc: 'SUMMER50K', da_: 50000, rt: 4, fb: 'Phủ Nano đẹp, thêm vệ sinh máy nữa là tuyệt.' },
    { ci: 2, bi: 1, pi: 5, vi: 5, da: 4, st: '14:00', et: '15:15', subSv: ['Phủ Ceramic sơn xe tạm thời'], vc: 'SILVER15', da_: 48000, rt: 5, fb: 'Ceramic bóng đẹp, giá hợp lý.' },
    { ci: 3, bi: 1, pi: 4, vi: 6, da: 5, st: '08:00', et: '08:30', subSv: [], vc: '', da_: 0, rt: 4, fb: 'Nhanh gọn.' },
    { ci: 4, bi: 2, pi: 8, vi: 8, da: 3, st: '09:00', et: '09:30', subSv: ['Xịt nước hoa cabin'], vc: 'DIAMOND20', da_: 100000, rt: 5, fb: 'Đẳng cấp Diamond!' },
    { ci: 0, bi: 2, pi: 10, vi: 0, da: 7, st: '10:00', et: '11:30', subSv: ['Tẩy ố kính & Phục hồi nhựa nhám', 'Phủ Ceramic sơn xe tạm thời'], vc: '', da_: 0, rt: 5, fb: 'Vệ sinh toàn diện, xe như mới!' },
    { ci: 1, bi: 3, pi: 12, vi: 2, da: 6, st: '14:00', et: '15:00', subSv: ['Hút bụi & bảo dưỡng da nội thất'], vc: 'SUMMER50K', da_: 50000, rt: 4, fb: 'Da nội thất sạch đẹp.' },
    { ci: 2, bi: 3, pi: 14, vi: 4, da: 8, st: '08:00', et: '08:30', subSv: ['Phun bọt tuyết tự động'], vc: '', da_: 0, rt: 3, fb: 'Cơ bản ổn.' },
    { ci: 3, bi: 4, pi: 16, vi: 6, da: 4, st: '15:00', et: '16:30', subSv: ['Phủ gầm cao su chống gỉ', 'Tẩy ố kính & Phục hồi nhựa nhám'], vc: 'DIAMOND20', da_: 100000, rt: 5, fb: 'Phủ gầm chắc chắn, yên tâm đi mưa.' },
    { ci: 4, bi: 4, pi: 18, vi: 9, da: 2, st: '11:00', et: '11:40', subSv: ['Đánh bóng đèn pha ô tô'], vc: '', da_: 0, rt: 4, fb: 'Đèn sáng hơn hẳn.' },
  ];

  for (const spec of bookingSpecs) {
    const pkg = pkgList[spec.pi];
    const allSubServices = pkg.subServices || [];

    // Build selectedSubServices array: include all mandatory + user-selected optional
    const selectedSubServices = [
      ...allSubServices.filter(s => s.isOptional === false).map(s => ({ name: s.name, price: s.price, duration: s.duration })),
      ...allSubServices
        .filter(s => s.isOptional && spec.subSv.includes(s.name))
        .map(s => ({ name: s.name, price: s.price, duration: s.duration })),
    ];

    // Calculate finalPrice: package price + optional sub-service prices - discount
    const optionalPrice = selectedSubServices.filter(s => s.price > 0).reduce((sum, s) => sum + s.price, 0);
    const discount = spec.da_ || 0;
    const finalPrice = Math.max(0, pkg.price + optionalPrice - discount);
    const depositAmount = Math.round(finalPrice * 0.3 / 1000) * 1000;

    const bookingDate = daysAgo(spec.da);
    const startH = parseInt(spec.st.split(':')[0], 10);

    bookingEntries.push({
      userId: custIds[spec.ci],
      branchId: branchIds[spec.bi],
      packageId: pkg._id,
      packageName: pkg.name,
      packageDuration: pkg.duration,
      vehicleId: vehicleList[spec.vi]._id,
      bookingDate,
      startTime: spec.st,
      endTime: spec.et,
      status: 'completed',
      bookingType: 'single',
      bookingCode: generateCode(),
      selectedSubServices,
      voucherCode: spec.vc || undefined,
      discountAmount: discount,
      finalPrice,
      depositAmount,
      depositPaid: true,
      depositPaidAt: daysAgo(spec.da, startH - 1),
      paymentStatus: 'paid',
      paymentMethod: 'bank',
      paidAt: daysAgo(spec.da, startH - 1),
      checkInTime: daysAgo(spec.da, startH),
      checkOutTime: daysAgo(spec.da, startH + 1),
      rating: spec.rt,
      feedback: spec.fb,
      feedbackAt: daysAgo(spec.da, startH + 2),
      priority: (spec.ci % 4) + 1,
    });
  }

  // Add 2 confirmed (not yet completed) bookings with sub-services
  bookingEntries.push(
    {
      userId: custIds[0], branchId: branchIds[0], packageId: pkgList[1]._id,
      packageName: pkgList[1].name, packageDuration: pkgList[1].duration,
      vehicleId: vehicleList[0]._id,
      bookingDate: daysFromNow(1), startTime: '09:00', endTime: '09:50',
      status: 'confirmed', bookingType: 'single', bookingCode: generateCode(),
      selectedSubServices: [
        ...pkgList[1].subServices.filter(s => !s.isOptional).map(s => ({ name: s.name, price: s.price, duration: s.duration })),
        { name: 'Vệ sinh khoang máy bằng hơi nước', price: 100000, duration: 20 },
      ],
      voucherCode: 'SUMMER50K', discountAmount: 50000,
      finalPrice: pkgList[1].price + 100000 - 50000,
      depositAmount: Math.round((pkgList[1].price + 100000 - 50000) * 0.3 / 1000) * 1000,
      depositPaid: true, depositPaidAt: daysAgo(1),
      paymentStatus: 'deposit_paid', paymentMethod: 'bank',
      confirmedAt: daysAgo(1),
      priority: 1,
    },
    {
      userId: custIds[2], branchId: branchIds[1], packageId: pkgList[5]._id,
      packageName: pkgList[5].name, packageDuration: pkgList[5].duration,
      vehicleId: vehicleList[5]._id,
      bookingDate: daysFromNow(3), startTime: '14:00', endTime: '15:15',
      status: 'confirmed', bookingType: 'single', bookingCode: generateCode(),
      selectedSubServices: [
        ...pkgList[5].subServices.filter(s => !s.isOptional).map(s => ({ name: s.name, price: s.price, duration: s.duration })),
        { name: 'Phủ Ceramic sơn xe tạm thời', price: 150000, duration: 20 },
      ],
      voucherCode: '', discountAmount: 0,
      finalPrice: pkgList[5].price + 150000,
      depositAmount: Math.round((pkgList[5].price + 150000) * 0.3 / 1000) * 1000,
      depositPaid: true, depositPaidAt: daysAgo(2),
      paymentStatus: 'deposit_paid', paymentMethod: 'momo',
      confirmedAt: daysAgo(2),
      priority: 3,
    }
  );

  await Booking.insertMany(bookingEntries);
  console.log(`  Inserted ${bookingEntries.length} paid bookings`);

  // ── 3. BUILD payments ─────────────────────────────────────────────────────
  console.log('Building payment records...');
  const newBookings = await Booking.find({ bookingCode: /^BK-/ });
  const paymentEntries = newBookings.map(b => ({
    bookingId: b._id,
    userId: b.userId,
    amount: b.paymentStatus === 'paid' ? b.finalPrice : b.depositAmount,
    method: b.paymentMethod,
    status: 'paid',
    paidAt: b.paidAt || b.depositPaidAt || b.bookingDate,
    transactionId: 'PAID-' + b.bookingCode.replace('BK-', ''),
    createdAt: b.paidAt || b.depositPaidAt || b.bookingDate,
  }));

  await Payment.insertMany(paymentEntries);
  console.log(`  Inserted ${paymentEntries.length} payment records`);

  // ── 4. SUMMARY ────────────────────────────────────────────────────────────
  console.log('\n=== SEED COMPLETE ===');
  console.log(`  Bookings: ${bookingEntries.length}`);
  console.log(`  Payments: ${paymentEntries.length}`);
  console.log('');
  for (const b of bookingEntries) {
    const c = customers.find(u => String(u._id) === String(b.userId));
    const br = branches.find(b2 => String(b2._id) === String(b.branchId));
    const p = pkgList.find(p2 => String(p2._id) === String(b.packageId));
    console.log(`  ${b.bookingCode} | ${c?.name || '?'} | ${br?.name || '?'} | ${p?.name || '?'} | ${b.selectedSubServices.length} sub | ${b.finalPrice.toLocaleString('vi-VN')}đ | ${b.status}`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
