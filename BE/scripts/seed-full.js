/**
 * AutoWashPro — Full Database Seed Script
 * Run: node scripts/seed-full.js
 *
 * Seeds: admin, 5 managers, 5 customers (bronze→diamond),
 *        5 branches, 23 packages, vehicles, vouchers,
 *        slot packs, bookings, payments, points, notifications.
 *
 * All passwords: 123456
 */

require('dotenv').config();
require('../src/config/dns');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGODB_URI;

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Models ───────────────────────────────────────────────────────────────────
const User         = require('../src/models/user.schema');
const Branch       = require('../src/models/branch.schema');
const Package      = require('../src/models/package.schema');
const Vehicle      = require('../src/models/vehicle.schema');
const Voucher      = require('../src/models/voucher.schema');
const Booking      = require('../src/models/booking.schema');
const SlotPack     = require('../src/models/slotPack.schema');
const Payment      = require('../src/models/payment.schema');
const PointHistory = require('../src/models/pointHistory.schema');
const Notification = require('../src/models/notification.schema');

// ─── Pre-assign IDs ───────────────────────────────────────────────────────────
const adminId = oid();
const mgrIds  = [oid(), oid(), oid(), oid(), oid()]; // 5 managers
const custIds = [oid(), oid(), oid(), oid(), oid()]; // 5 customers

const branchIds = [oid(), oid(), oid(), oid(), oid()];

// 4 packages per branch = 20 packages
const pkgIds = Array.from({ length: 20 }, () => oid());

// Vehicles: 2 per customer = 10
const vehicleIds = Array.from({ length: 10 }, () => oid());

// Slot packs
const spIds = [oid(), oid(), oid(), oid()];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('Connected\n');

  console.log('Clearing collections…');
  await Promise.all([
    User.deleteMany({}),
    Branch.deleteMany({}),
    Package.deleteMany({}),
    Vehicle.deleteMany({}),
    Voucher.deleteMany({}),
    Booking.deleteMany({}),
    SlotPack.deleteMany({}),
    Payment.deleteMany({}),
    PointHistory.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  // ── 1. USERS ──────────────────────────────────────────────────────────────
  console.log('Seeding users…');
  await User.insertMany([
    // Admin
    {
      _id: adminId, name: 'Admin AutoWash', email: 'admin@washpro.vn',
      password: hash('123456'), phone: '0901000001', role: 'admin',
      status: 'active', tier: 'diamond', loyaltyPoints: 0, lifetimePoints: 0,
    },
    // 5 Managers
    ...mgrIds.map((id, i) => ({
      _id: id,
      name: ['Nguyễn Quản Lý 1', 'Trần Quản Lý 2', 'Lê Quản Lý 3', 'Phạm Quản Lý 4', 'Hoàng Quản Lý 5'][i],
      email: `manager${i + 1}@washpro.vn`,
      password: hash('123456'),
      phone: `090100000${i + 2}`,
      role: 'manager',
      status: 'active',
      branchId: branchIds[i],
      tier: 'bronze',
      loyaltyPoints: 0,
      lifetimePoints: 0,
    })),
    // 5 Customers
    {
      _id: custIds[0], name: 'Nguyễn Văn An', email: 'an.nguyen@gmail.com',
      password: hash('123456'), phone: '0912111001', role: 'customer',
      status: 'active', tier: 'bronze', loyaltyPoints: 150, lifetimePoints: 150,
      dateOfBirth: new Date('1995-03-15'),
    },
    {
      _id: custIds[1], name: 'Trần Thị Bích', email: 'bich.tran@gmail.com',
      password: hash('123456'), phone: '0912111002', role: 'customer',
      status: 'active', tier: 'silver', loyaltyPoints: 350, lifetimePoints: 550,
      dateOfBirth: new Date('1992-07-22'),
    },
    {
      _id: custIds[2], name: 'Lê Văn Cường', email: 'cuong.le@gmail.com',
      password: hash('123456'), phone: '0912111003', role: 'customer',
      status: 'active', tier: 'gold', loyaltyPoints: 1500, lifetimePoints: 3200,
      dateOfBirth: new Date('1988-11-08'),
    },
    {
      _id: custIds[3], name: 'Phạm Thị Dung', email: 'binhtntse182370@fpt.edu.vn',
      password: hash('123456'), phone: '0912111004', role: 'customer',
      status: 'active', tier: 'diamond', loyaltyPoints: 5000, lifetimePoints: 12000,
      dateOfBirth: new Date('1998-01-15'),
    },
    {
      _id: custIds[4], name: 'Hoàng Văn Em', email: 'em.hoang@gmail.com',
      password: hash('123456'), phone: '0912111005', role: 'customer',
      status: 'active', tier: 'bronze', loyaltyPoints: 80, lifetimePoints: 80,
      dateOfBirth: new Date('2000-09-05'),
    },
  ]);

  // ── 2. BRANCHES ───────────────────────────────────────────────────────────
  console.log('Seeding branches…');

  // HCMC province SVG path starts at m 245.76,700.6
  const SVG_CX = [247, 253, 250, 244, 241];
  const SVG_CY = [708, 703, 706, 702, 707];

  const branchData = [
    { name: 'AutoWash Pro Quận 1',      addr: '123 Nguyễn Thị Minh Khai, Phường 2, Quận 1, TP.HCM',          phone: '028 3822 1111', email: 'q1@autowashpro.vn',       coords: [106.6920, 10.7769], close: '19:00', img: '/branches/autowash_quan_1.jpg' },
    { name: 'AutoWash Pro Thủ Đức',     addr: '456 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP.HCM',     phone: '028 3720 2222', email: 'thuduc@autowashpro.vn',    coords: [106.7690, 10.8504], close: '20:00', img: '/branches/autowash_thu_duc.jpg' },
    { name: 'AutoWash Pro Bình Thạnh',  addr: '789 Điện Biên Phủ, Phường 11, Bình Thạnh, TP.HCM',            phone: '028 3510 3333', email: 'binhthanh@autowashpro.vn', coords: [106.7130, 10.8010], close: '20:00', img: '/branches/autowash_binh_thanh.jpg' },
    { name: 'AutoWash Pro Gò Vấp',      addr: '321 Phan Văn Trị, Phường 11, Gò Vấp, TP.HCM',                phone: '028 3890 4444', email: 'govap@autowashpro.vn',     coords: [106.6690, 10.8380], close: '19:30', img: '/branches/autowash_go_vap.jpg' },
    { name: 'AutoWash Pro Tân Phú',     addr: '55 Trường Chinh, Phường Tân Thới Nhất, Tân Phú, TP.HCM',     phone: '028 3710 5555', email: 'tanphu@autowashpro.vn',    coords: [106.6260, 10.7900], close: '20:00', img: '/branches/autowash_tan_phu.jpg' },
  ];

  await Branch.insertMany(branchData.map((b, i) => ({
    _id: branchIds[i], name: b.name, address: b.addr, phone: b.phone,
    email: b.email, openingTime: '07:00', closingTime: b.close,
    status: 'active', managerId: mgrIds[i], image: b.img,
    city: 'Hồ Chí Minh',
    location: { type: 'Point', coordinates: b.coords },
    mapCoordinates: { svgCx: SVG_CX[i], svgCy: SVG_CY[i] },
  })));

  // ── 3. PACKAGES (4 per branch) ───────────────────────────────────────────
  console.log('Seeding packages…');
  const pkgTemplates = [
    {
      name: 'Rửa ô tô cơ bản',
      desc: 'Rửa vỏ ô tô tự động bằng hệ thống chổi xoay & phun bọt tuyết, lau khô ngoại thất và dưỡng bóng lốp xe.',
      price: 100000, dur: 30, cat: 'external', vehicles: ['sedan','suv','van','pickup'],
      subServices: [
        { name: 'Phun bọt tuyết tự động', price: 0, duration: 5, isOptional: false },
        { name: 'Rửa vỏ xe bằng chổi xoay tự động', price: 0, duration: 15, isOptional: false },
        { name: 'Xịt sấy khô tự động', price: 0, duration: 5, isOptional: false },
        { name: 'Dưỡng bóng lốp xe', price: 0, duration: 5, isOptional: false },
        { name: 'Xịt rửa gầm áp lực cao', price: 30000, duration: 10, isOptional: true },
        { name: 'Hút bụi nội thất ô tô', price: 50000, duration: 15, isOptional: true },
        { name: 'Xịt nước hoa cabin', price: 20000, duration: 5, isOptional: true },
      ]
    },
    {
      name: 'Rửa ô tô + Phủ Nano',
      desc: 'Rửa vỏ ô tô tự động chuyên sâu, xịt gầm áp lực cao và phủ sáp Nano bảo vệ sơn xe bóng đẹp tới 3 tháng.',
      price: 250000, dur: 50, cat: 'external', vehicles: ['sedan','suv','pickup'],
      subServices: [
        { name: 'Phun bọt tuyết & rửa tự động chuyên sâu', price: 0, duration: 15, isOptional: false },
        { name: 'Xịt rửa gầm áp lực cao', price: 0, duration: 10, isOptional: false },
        { name: 'Phủ sáp bóng Nano bảo vệ sơn xe', price: 0, duration: 15, isOptional: false },
        { name: 'Sấy khô & lau kính sạch bóng', price: 0, duration: 10, isOptional: false },
        { name: 'Vệ sinh khoang máy bằng hơi nước', price: 100000, duration: 20, isOptional: true },
        { name: 'Tẩy nhựa đường & vết ố kính', price: 80000, duration: 15, isOptional: true },
        { name: 'Hút bụi & bảo dưỡng da nội thất', price: 120000, duration: 20, isOptional: true },
      ]
    },
    {
      name: 'Vệ sinh toàn diện ô tô',
      desc: 'Dịch vụ chăm sóc ô tô toàn bộ: Rửa xe tự động, xịt gầm, hút bụi vệ sinh nội thất chi tiết và khử mùi cabin.',
      price: 380000, dur: 90, cat: 'full', vehicles: ['sedan','suv','pickup','van'],
      subServices: [
        { name: 'Rửa xe tự động & xịt gầm cao cấp', price: 0, duration: 20, isOptional: false },
        { name: 'Hút bụi & Vệ sinh nội thất chi tiết', price: 0, duration: 30, isOptional: false },
        { name: 'Khử mùi sinh học / Khử trùng Ozone', price: 0, duration: 25, isOptional: false },
        { name: 'Phủ bóng sáp sơn xe & dưỡng lốp', price: 0, duration: 15, isOptional: false },
        { name: 'Phủ Ceramic sơn xe tạm thời', price: 150000, duration: 20, isOptional: true },
        { name: 'Tẩy ố kính & Phục hồi nhựa nhám', price: 100000, duration: 20, isOptional: true },
        { name: 'Phủ gầm cao su chống gỉ', price: 300000, duration: 45, isOptional: true },
      ]
    },
    {
      name: 'Đánh bóng sơn ô tô nhanh',
      desc: 'Rửa xe tự động, đánh bóng nhanh xóa xước dăm và phục hồi độ bóng bẩy cho sơn ô tô.',
      price: 180000, dur: 40, cat: 'external', vehicles: ['sedan','suv','pickup','van'],
      subServices: [
        { name: 'Rửa xe tự động bọt tuyết', price: 0, duration: 15, isOptional: false },
        { name: 'Đánh bóng bề mặt sơn ô tô', price: 0, duration: 20, isOptional: false },
        { name: 'Dưỡng bóng lốp & nhựa ngoại thất', price: 0, duration: 5, isOptional: false },
        { name: 'Phủ wax bảo vệ sơn', price: 80000, duration: 15, isOptional: true },
        { name: 'Đánh bóng đèn pha ô tô', price: 60000, duration: 10, isOptional: true },
      ]
    },
  ];

  const packages = [];
  branchIds.forEach((brId, bi) => {
    pkgTemplates.forEach((t, pi) => {
      packages.push({
        _id: pkgIds[bi * 4 + pi], name: t.name, description: t.desc,
        price: t.price, duration: t.dur, branchId: brId, status: 'active',
        category: t.cat, vehicleTypes: t.vehicles, subServices: t.subServices,
      });
    });
  });
  await Package.insertMany(packages);

  // ── 4. VEHICLES (2 per customer) ─────────────────────────────────────────
  console.log('Seeding vehicles…');
  const vehicleData = [
    { userId: custIds[0], plate: '51A-12345', type: 'sedan',      brand: 'Toyota',   model: 'Camry 2.0',   color: 'Trắng',      year: 2021, isDefault: true  },
    { userId: custIds[0], plate: '51A-99999', type: 'suv',        brand: 'Toyota',   model: 'Fortuner',    color: 'Bạc',        year: 2023, isDefault: false },
    { userId: custIds[1], plate: '59B-67890', type: 'suv',        brand: 'Honda',    model: 'CR-V 1.5T',   color: 'Đen',        year: 2022, isDefault: true  },
    { userId: custIds[1], plate: '59B-11199', type: 'sedan',      brand: 'Toyota',   model: 'Vios 1.5G',   color: 'Bạc',        year: 2021, isDefault: false },
    { userId: custIds[2], plate: '51C-11111', type: 'pickup',     brand: 'Ford',     model: 'Ranger XLS',  color: 'Bạc',        year: 2023, isDefault: true  },
    { userId: custIds[2], plate: '51C-22222', type: 'suv',        brand: 'Mazda',    model: 'CX-5 2.0',    color: 'Đỏ',         year: 2022, isDefault: false },
    { userId: custIds[3], plate: '51D-22222', type: 'sedan',      brand: 'Mercedes', model: 'C200 AMG',    color: 'Trắng ngọc', year: 2024, isDefault: true  },
    { userId: custIds[3], plate: '51D-33333', type: 'suv',        brand: 'BMW',      model: 'X3 20d',      color: 'Xanh rêu',   year: 2024, isDefault: false },
    { userId: custIds[4], plate: '79E-33333', type: 'sedan',      brand: 'Hyundai',  model: 'Grand i10',   color: 'Xanh dương', year: 2023, isDefault: true  },
    { userId: custIds[4], plate: '79E-44444', type: 'sedan',      brand: 'Kia',      model: 'Morning',     color: 'Đỏ',         year: 2025, isDefault: false },
  ];

  await Vehicle.insertMany(vehicleData.map((v, i) => ({
    _id: vehicleIds[i], userId: v.userId, licensePlate: v.plate,
    vehicleType: v.type, brand: v.brand, model: v.model,
    color: v.color, year: v.year, isDefault: v.isDefault,
  })));

  // ── 5. VOUCHERS ──────────────────────────────────────────────────────────
  console.log('Seeding vouchers…');
  const now = new Date();
  await Voucher.insertMany([
    {
      code: 'WELCOME10', name: 'Chào mừng khách mới — Giảm 10%',
      description: 'Ưu đãi 10% cho lần đặt lịch đầu tiên.',
      type: 'percentage', value: 10, maxDiscount: 50000, minOrder: 0,
      quantity: 200, remaining: 187,
      startDate: new Date('2025-01-01'), endDate: new Date('2027-12-31'),
      applicableToAllPackages: true, applicableToAllBranches: true,
      status: 'active', createdBy: adminId, maxUsagePerUser: 1,
    },
    {
      code: 'SUMMER50K', name: 'Hè Rực Rỡ — Giảm 50.000đ',
      description: 'Giảm 50.000đ cho đơn từ 150.000đ.',
      type: 'fixed', value: 50000, minOrder: 150000,
      quantity: 100, remaining: 72,
      startDate: new Date('2025-05-01'), endDate: new Date('2026-12-31'),
      applicableToAllPackages: true, applicableToAllBranches: true,
      status: 'active', createdBy: adminId, maxUsagePerUser: 2,
    },
    {
      code: 'SILVER15', name: 'Đặc quyền Bạc — Giảm 15%',
      description: 'Dành cho thành viên hạng Bạc trở lên.',
      type: 'percentage', value: 15, maxDiscount: 80000, minOrder: 100000,
      quantity: 50, remaining: 41,
      startDate: new Date('2025-01-01'), endDate: new Date('2027-12-31'),
      applicableToAllPackages: true, applicableToAllBranches: true,
      status: 'active', createdBy: adminId, maxUsagePerUser: 5,
      applicableTiers: ['silver', 'gold', 'diamond'],
    },
    {
      code: 'DIAMOND20', name: 'VIP Diamond — Giảm 20%',
      description: 'Ưu đãi độc quyền 20% cho thành viên Kim Cương.',
      type: 'percentage', value: 20, maxDiscount: 100000, minOrder: 200000,
      quantity: 20, remaining: 15,
      startDate: new Date('2025-01-01'), endDate: new Date('2027-12-31'),
      applicableToAllPackages: true, applicableToAllBranches: true,
      status: 'active', createdBy: adminId, maxUsagePerUser: 10,
      applicableTiers: ['gold', 'diamond'],
    },
  ]);

  // ── 6. SLOT PACKS ────────────────────────────────────────────────────────
  console.log('Seeding slot packs…');
  await SlotPack.insertMany([
    {
      _id: spIds[0], userId: custIds[1], branchId: branchIds[1],
      packageId: pkgIds[4], vehicleId: vehicleIds[2],
      totalSlots: 10, remainingSlots: 7, usedSlots: 3,
      unitPrice: 100000, discountPercent: 10, discountAmount: 100000,
      finalPrice: 900000, finalPriceAfterVoucher: 900000,
      packCode: 'SP-BICHA1', priority: 2,
      status: 'active', paymentStatus: 'paid', paidAt: daysAgo(20),
      expiresAt: daysFromNow(180),
    },
    {
      _id: spIds[1], userId: custIds[2], branchId: branchIds[0],
      packageId: pkgIds[1], vehicleId: vehicleIds[4],
      totalSlots: 5, remainingSlots: 3, usedSlots: 2,
      unitPrice: 250000, discountPercent: 5, discountAmount: 62500,
      finalPrice: 1187500, finalPriceAfterVoucher: 1137500,
      voucherCode: 'SUMMER50K', voucherDiscount: 50000,
      packCode: 'SP-CUONG2', priority: 3,
      status: 'active', paymentStatus: 'paid', paidAt: daysAgo(15),
      expiresAt: daysFromNow(90),
    },
    {
      _id: spIds[2], userId: custIds[3], branchId: branchIds[1],
      packageId: pkgIds[5], vehicleId: vehicleIds[6],
      totalSlots: 20, remainingSlots: 0, usedSlots: 20,
      unitPrice: 250000, discountPercent: 15, discountAmount: 750000,
      finalPrice: 4250000, finalPriceAfterVoucher: 4250000,
      packCode: 'SP-DUNGG3', priority: 4,
      status: 'exhausted', paymentStatus: 'paid', paidAt: daysAgo(60),
    },
    {
      _id: spIds[3], userId: custIds[3], branchId: branchIds[0],
      packageId: pkgIds[1], vehicleId: vehicleIds[6],
      totalSlots: 10, remainingSlots: 8, usedSlots: 2,
      unitPrice: 250000, discountPercent: 10, discountAmount: 250000,
      finalPrice: 2250000, finalPriceAfterVoucher: 2150000,
      voucherCode: 'DIAMOND20', voucherDiscount: 100000,
      packCode: 'SP-DUNGG4', priority: 4,
      status: 'active', paymentStatus: 'paid', paidAt: daysAgo(10),
      expiresAt: daysFromNow(120),
    },
  ]);

  // ── 7. BOOKINGS ──────────────────────────────────────────────────────────
  console.log('Seeding bookings…');
  const todayDate = today();

  await Booking.insertMany([
    // ── TODAY — Branch 1 ──
    { userId: custIds[3], branchId: branchIds[0], packageId: pkgIds[0], vehicleId: vehicleIds[6], bookingDate: todayDate, startTime: '08:00', endTime: '08:30', status: 'completed', bookingType: 'single', priority: 4, finalPrice: 100000, paymentStatus: 'paid', paymentMethod: 'cash', checkInTime: todayAt(8), checkOutTime: todayAt(8, 30), rating: 5, feedback: 'Rửa rất sạch, nhân viên nhiệt tình!', feedbackAt: todayAt(9) },
    { userId: custIds[2], branchId: branchIds[0], packageId: pkgIds[1], vehicleId: vehicleIds[4], bookingDate: todayDate, startTime: '09:00', endTime: '09:50', status: 'in_progress', bookingType: 'single', priority: 3, finalPrice: 250000, paymentStatus: 'unpaid', checkInTime: todayAt(9) },
    { userId: custIds[1], branchId: branchIds[0], packageId: pkgIds[2], vehicleId: vehicleIds[2], bookingDate: todayDate, startTime: '10:00', endTime: '11:30', status: 'checked_in', bookingType: 'single', priority: 2, finalPrice: 330000, paymentStatus: 'unpaid', discountAmount: 50000, voucherCode: 'SUMMER50K', checkInTime: todayAt(10) },
    { userId: custIds[0], branchId: branchIds[0], packageId: pkgIds[0], vehicleId: vehicleIds[0], bookingDate: todayDate, startTime: '11:00', endTime: '11:30', status: 'pending', bookingType: 'single', priority: 1, finalPrice: 100000, paymentStatus: 'unpaid' },
    { userId: custIds[4], branchId: branchIds[0], packageId: pkgIds[3], vehicleId: vehicleIds[8], bookingDate: todayDate, startTime: '13:00', endTime: '13:40', status: 'pending', bookingType: 'single', priority: 1, finalPrice: 180000, paymentStatus: 'unpaid' },
    { userId: custIds[3], branchId: branchIds[0], packageId: pkgIds[1], vehicleId: vehicleIds[6], bookingDate: todayDate, startTime: '14:00', endTime: '14:50', status: 'pending', bookingType: 'slot_pack_usage', slotPackId: spIds[3], priority: 4, finalPrice: 0, paymentStatus: 'paid' },

    // ── TODAY — Branch 2 ──
    { userId: custIds[2], branchId: branchIds[1], packageId: pkgIds[5], vehicleId: vehicleIds[5], bookingDate: todayDate, startTime: '08:30', endTime: '09:45', status: 'completed', bookingType: 'single', priority: 3, finalPrice: 272000, paymentStatus: 'paid', paymentMethod: 'momo', discountAmount: 48000, voucherCode: 'SILVER15', checkInTime: todayAt(8, 30), checkOutTime: todayAt(9, 45), rating: 4, feedback: 'Dịch vụ tốt, chờ hơi lâu.', feedbackAt: todayAt(10) },
    { userId: custIds[1], branchId: branchIds[1], packageId: pkgIds[4], vehicleId: vehicleIds[2], bookingDate: todayDate, startTime: '10:30', endTime: '11:00', status: 'in_progress', bookingType: 'slot_pack_usage', slotPackId: spIds[0], priority: 2, finalPrice: 0, paymentStatus: 'paid', checkInTime: todayAt(10, 30) },
    { userId: custIds[0], branchId: branchIds[1], packageId: pkgIds[4], vehicleId: vehicleIds[0], bookingDate: todayDate, startTime: '13:00', endTime: '13:30', status: 'pending', bookingType: 'single', priority: 1, finalPrice: 100000, paymentStatus: 'unpaid' },

    // ── TODAY — Branch 3, 4, 5 ──
    { userId: custIds[0], branchId: branchIds[2], packageId: pkgIds[8], vehicleId: vehicleIds[0], bookingDate: todayDate, startTime: '09:00', endTime: '09:30', status: 'completed', bookingType: 'single', priority: 1, finalPrice: 100000, paymentStatus: 'paid', paymentMethod: 'cash', checkInTime: todayAt(9), checkOutTime: todayAt(9, 30) },
    { userId: custIds[2], branchId: branchIds[3], packageId: pkgIds[12], vehicleId: vehicleIds[4], bookingDate: todayDate, startTime: '10:00', endTime: '10:50', status: 'in_progress', bookingType: 'single', priority: 3, finalPrice: 250000, paymentStatus: 'unpaid', checkInTime: todayAt(10) },
    { userId: custIds[3], branchId: branchIds[4], packageId: pkgIds[16], vehicleId: vehicleIds[6], bookingDate: todayDate, startTime: '11:00', endTime: '12:30', status: 'pending', bookingType: 'single', priority: 4, finalPrice: 380000, paymentStatus: 'unpaid' },

    // ── YESTERDAY ──
    { userId: custIds[0], branchId: branchIds[0], packageId: pkgIds[0], vehicleId: vehicleIds[0], bookingDate: daysAgo(1), startTime: '09:00', endTime: '09:30', status: 'completed', bookingType: 'single', priority: 1, finalPrice: 100000, paymentStatus: 'paid', paymentMethod: 'cash', rating: 5, feedback: 'Nhanh gọn, sạch sẽ!', feedbackAt: daysAgo(1, 10) },
    { userId: custIds[1], branchId: branchIds[0], packageId: pkgIds[1], vehicleId: vehicleIds[2], bookingDate: daysAgo(1), startTime: '10:00', endTime: '10:50', status: 'completed', bookingType: 'single', priority: 2, finalPrice: 250000, paymentStatus: 'paid', paymentMethod: 'momo', rating: 4, feedback: 'Rửa sạch, nhân viên thân thiện.', feedbackAt: daysAgo(1, 11) },
    { userId: custIds[2], branchId: branchIds[1], packageId: pkgIds[5], vehicleId: vehicleIds[5], bookingDate: daysAgo(1), startTime: '14:00', endTime: '15:00', status: 'completed', bookingType: 'single', priority: 3, finalPrice: 200000, paymentStatus: 'paid', paymentMethod: 'cash', rating: 5, feedback: 'Nội thất sạch hơn tôi nghĩ!', feedbackAt: daysAgo(1, 15) },
    { userId: custIds[3], branchId: branchIds[1], packageId: pkgIds[4], vehicleId: vehicleIds[6], bookingDate: daysAgo(1), startTime: '16:00', endTime: '17:15', status: 'cancelled', bookingType: 'single', priority: 4, finalPrice: 320000, paymentStatus: 'unpaid', cancelledAt: daysAgo(1, 15), cancelledBy: 'customer', cancellationReason: 'Bận đột xuất' },
    { userId: custIds[0], branchId: branchIds[2], packageId: pkgIds[8], vehicleId: vehicleIds[0], bookingDate: daysAgo(1), startTime: '09:00', endTime: '09:30', status: 'completed', bookingType: 'single', priority: 1, finalPrice: 100000, paymentStatus: 'paid', paymentMethod: 'cash', rating: 4 },
    { userId: custIds[1], branchId: branchIds[3], packageId: pkgIds[12], vehicleId: vehicleIds[2], bookingDate: daysAgo(1), startTime: '10:00', endTime: '10:50', status: 'completed', bookingType: 'single', priority: 2, finalPrice: 250000, paymentStatus: 'paid', paymentMethod: 'momo', rating: 5 },

    // ── RECURRING (c2, T2+T4 hàng tuần) ──
    ...[14, 12, 7, 5].map(d => ({
      userId: custIds[1], branchId: branchIds[0], packageId: pkgIds[0], vehicleId: vehicleIds[2],
      bookingDate: daysAgo(d), startTime: '08:00', endTime: '08:30',
      status: 'completed', bookingType: 'recurring', priority: 2,
      finalPrice: 100000, paymentStatus: 'paid', paymentMethod: 'cash',
      rating: [4, 5, 4, 5][Math.floor(d / 4) % 4],
      feedbackAt: daysAgo(d, 9),
    })),
    ...[1, 3].map(d => ({
      userId: custIds[1], branchId: branchIds[0], packageId: pkgIds[0], vehicleId: vehicleIds[2],
      bookingDate: daysFromNow(d), startTime: '08:00', endTime: '08:30',
      status: 'pending', bookingType: 'recurring', priority: 2,
      finalPrice: 100000, paymentStatus: 'unpaid',
    })),

    // ── PAST 2 WEEKS (doanh thu) ──
    ...[3, 4, 5, 6, 8, 9, 10, 11].map((d, i) => ({
      userId: custIds[i % 5], branchId: branchIds[i % 5],
      packageId: pkgIds[(i % 4) * 1 + (i < 4 ? 0 : 4)],
      vehicleId: vehicleIds[i % 10],
      bookingDate: daysAgo(d),
      startTime: ['09:00', '10:00', '11:00', '14:00'][i % 4],
      endTime:   ['09:30', '10:50', '11:30', '15:15'][i % 4],
      status: 'completed', bookingType: 'single',
      priority: [1, 2, 3, 4][i % 4],
      finalPrice: [100000, 250000, 120000, 272000][i % 4],
      paymentStatus: 'paid', paymentMethod: i % 2 === 0 ? 'cash' : 'momo',
      rating: [4, 5, 4, 5][i % 4],
      feedbackAt: daysAgo(d, 11),
    })),

    // ── FUTURE ──
    { userId: custIds[0], branchId: branchIds[0], packageId: pkgIds[0], vehicleId: vehicleIds[0], bookingDate: daysFromNow(2), startTime: '09:00', endTime: '09:30', status: 'pending', bookingType: 'single', priority: 1, finalPrice: 100000, paymentStatus: 'unpaid' },
    { userId: custIds[3], branchId: branchIds[1], packageId: pkgIds[5], vehicleId: vehicleIds[6], bookingDate: daysFromNow(3), startTime: '14:00', endTime: '15:15', status: 'pending', bookingType: 'single', priority: 4, finalPrice: 220000, paymentStatus: 'unpaid', discountAmount: 100000, voucherCode: 'DIAMOND20' },
    { userId: custIds[2], branchId: branchIds[2], packageId: pkgIds[10], vehicleId: vehicleIds[4], bookingDate: daysFromNow(5), startTime: '10:00', endTime: '11:30', status: 'pending', bookingType: 'single', priority: 3, finalPrice: 380000, paymentStatus: 'unpaid' },
    { userId: custIds[1], branchId: branchIds[3], packageId: pkgIds[14], vehicleId: vehicleIds[2], bookingDate: daysFromNow(4), startTime: '09:00', endTime: '10:00', status: 'pending', bookingType: 'single', priority: 2, finalPrice: 200000, paymentStatus: 'unpaid' },
    { userId: custIds[4], branchId: branchIds[4], packageId: pkgIds[18], vehicleId: vehicleIds[8], bookingDate: daysFromNow(2), startTime: '08:00', endTime: '08:30', status: 'pending', bookingType: 'single', priority: 1, finalPrice: 100000, paymentStatus: 'unpaid' },
  ]);

  // ── 8. PAYMENTS ──────────────────────────────────────────────────────────
  console.log('Seeding payments…');
  const paidBookings = await Booking.find({ paymentStatus: 'paid', paymentMethod: { $exists: true, $ne: null }, finalPrice: { $gt: 0 } });
  if (paidBookings.length) {
    await Payment.insertMany(paidBookings.map(b => ({
      bookingId: b._id, userId: b.userId, amount: b.finalPrice,
      method: b.paymentMethod, status: 'paid',
      paidAt: b.checkOutTime || b.bookingDate,
      transactionId: `TXN-${b._id.toString().slice(-8).toUpperCase()}`,
    })));
  }

  // ── 9. POINT HISTORY ─────────────────────────────────────────────────────
  console.log('Seeding point history…');
  await PointHistory.insertMany([
    { userId: custIds[0], points: 50,   type: 'earned',   description: 'Tích điểm từ đặt lịch rửa xe',  createdAt: daysAgo(30) },
    { userId: custIds[0], points: 100,  type: 'earned',   description: 'Tích điểm từ đặt lịch rửa xe',  createdAt: daysAgo(15) },
    { userId: custIds[1], points: 200,  type: 'earned',   description: 'Tích điểm từ đặt lịch rửa xe',  createdAt: daysAgo(25) },
    { userId: custIds[1], points: 150,  type: 'earned',   description: 'Tích điểm từ gói lượt',          createdAt: daysAgo(20) },
    { userId: custIds[1], points: -50,  type: 'redeemed', description: 'Đổi voucher giảm giá',           createdAt: daysAgo(10) },
    { userId: custIds[2], points: 500,  type: 'earned',   description: 'Tích điểm Gold x1.5',           createdAt: daysAgo(40) },
    { userId: custIds[2], points: 1000, type: 'earned',   description: 'Tích điểm Gold x1.5',           createdAt: daysAgo(20) },
    { userId: custIds[3], points: 2000, type: 'earned',   description: 'Tích điểm Diamond x2.0',        createdAt: daysAgo(50) },
    { userId: custIds[3], points: 3000, type: 'earned',   description: 'Tích điểm Diamond x2.0',        createdAt: daysAgo(30) },
    { userId: custIds[3], points: -500, type: 'redeemed', description: 'Đổi voucher VIP Diamond',       createdAt: daysAgo(15) },
    { userId: custIds[4], points: 30,   type: 'earned',   description: 'Tích điểm từ đặt lịch rửa xe',       createdAt: daysAgo(5) },
    { userId: custIds[4], points: 50,   type: 'earned',   description: 'Tích điểm từ đặt lịch rửa xe',       createdAt: daysAgo(2) },
  ]);

  // ── 10. NOTIFICATIONS ────────────────────────────────────────────────────
  console.log('Seeding notifications…');
  await Notification.insertMany([
    { userId: custIds[0], title: 'Đặt lịch thành công', message: 'Lịch rửa xe của bạn đã xác nhận lúc 11:00 tại Q1.', type: 'booking_confirmed', isRead: false, createdAt: new Date() },
    { userId: custIds[0], title: 'Nhắc lịch sắp đến', message: 'Lịch rửa xe 15:30 hôm nay sắp bắt đầu!', type: 'booking_reminder', isRead: false, createdAt: new Date() },
    { userId: custIds[1], title: 'Gói lượt còn 7 lần', message: 'Gói SP-BICHA1 còn 7 lần sử dụng.', type: 'system', isRead: false, createdAt: new Date() },
    { userId: custIds[1], title: 'Thanh toán MoMo', message: 'Đã nhận 250.000đ qua MoMo.', type: 'payment_confirmed', isRead: false, createdAt: daysAgo(1) },
    { userId: custIds[2], title: 'Phản hồi từ chi nhánh', message: 'AutoWash Thủ Đức vừa trả lời đánh giá của bạn.', type: 'system', isRead: false, createdAt: new Date() },
    { userId: custIds[3], title: 'Voucher mới cho bạn', message: 'Bạn có voucher DIAMOND20 giảm 20%!', type: 'voucher', isRead: true, createdAt: daysAgo(2) },
    { userId: custIds[4], title: 'Đặt lịch thành công', message: 'Lịch đánh bóng xe lúc 13:00 đã xác nhận.', type: 'booking_confirmed', isRead: false, createdAt: new Date() },
    { userId: mgrIds[0], title: 'Có lịch hôm nay', message: 'Nhiều lịch đặt đang chờ xử lý tại Q1.', type: 'booking_created', isRead: false, createdAt: new Date() },
    { userId: mgrIds[1], title: 'Đánh giá mới', message: 'Lê Văn Cường vừa đánh giá 4⭐.', type: 'system', isRead: false, createdAt: new Date() },
  ]);

  // ── SUMMARY ──────────────────────────────────────────────────────────────
  const counts = {
    users:      await User.countDocuments(),
    branches:   await Branch.countDocuments(),
    packages:   await Package.countDocuments(),
    vehicles:   await Vehicle.countDocuments(),
    vouchers:   await Voucher.countDocuments(),
    bookings:   await Booking.countDocuments(),
    slotPacks:  await SlotPack.countDocuments(),
    payments:   await Payment.countDocuments(),
    points:     await PointHistory.countDocuments(),
    notifs:     await Notification.countDocuments(),
  };

  console.log('\n✅ SEED HOÀN TẤT!\n');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  TÀI KHOẢN TEST (password: 123456)');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  [ADMIN]    admin@washpro.vn');
  console.log('  [MANAGER]  manager1@washpro.vn  → Quận 1');
  console.log('  [MANAGER]  manager2@washpro.vn  → Thủ Đức');
  console.log('  [MANAGER]  manager3@washpro.vn  → Bình Thạnh');
  console.log('  [MANAGER]  manager4@washpro.vn  → Gò Vấp');
  console.log('  [MANAGER]  manager5@washpro.vn  → Tân Phú');
  console.log('  [CUSTOMER] an.nguyen@gmail.com');
  console.log('  [CUSTOMER] bich.tran@gmail.com');
  console.log('  [CUSTOMER] cuong.le@gmail.com');
  console.log('  [CUSTOMER] binhtntse182370@fpt.edu.vn');
  console.log('  [CUSTOMER] em.hoang@gmail.com');
  console.log('');
  console.log('  VOUCHERS: WELCOME10 | SUMMER50K | SILVER15 | DIAMOND20');
  console.log('  SLOT PACK: SP-BICHA1 | SP-CUONG2 | SP-DUNGG3 | SP-DUNGG4');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  Đã tạo:');
  Object.entries(counts).forEach(([k, v]) => console.log(`    ${k.padEnd(12)}: ${v}`));
  console.log('');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('\n❌ Seed thất bại:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
