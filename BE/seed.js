/**
 * AutoWashPro — Database Seed Script
 * Run: node seed.js
 *
 * Seeds: admin, managers, customers (bronze/silver/gold/diamond),
 *        branches, packages (with sub-services), vehicles, vouchers,
 *        slot packs, bookings (all statuses + feedback + managerReply + rebook),
 *        payments, point history, notifications, birthday voucher.
 */

require('dotenv').config();
require('./src/config/dns'); // Override DNS for MongoDB Atlas SRV resolution
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/washpro';

// ─── Models ───────────────────────────────────────────────────────────────────
const User         = require('./src/models/user.schema');
const Branch       = require('./src/models/branch.schema');
const Package      = require('./src/models/package.schema');
const Vehicle      = require('./src/models/vehicle.schema');
const Voucher      = require('./src/models/voucher.schema');
const Booking      = require('./src/models/booking.schema');
const SlotPack     = require('./src/models/slotPack.schema');
const Payment      = require('./src/models/payment.schema');
const PointHistory = require('./src/models/pointHistory.schema');
const Notification = require('./src/models/notification.schema');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const oid  = () => new mongoose.Types.ObjectId();
const hash = pwd => bcrypt.hashSync(pwd, 12);

function daysAgo(n, h = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, 0, 0, 0);
  return d;
}
function daysFromNow(n, h = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(h, 0, 0, 0);
  return d;
}
function todayAt(h, m = 0) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}
function today() { return daysAgo(0); }
function addHours(date, h) { return new Date(date.getTime() + h * 3600000); }

// ─── Pre-assign IDs ───────────────────────────────────────────────────────────
// Users
const adminId = oid();
const mgr1Id  = oid();
const mgr2Id  = oid();
const c1Id    = oid(); // bronze  — Nguyễn Văn An
const c2Id    = oid(); // silver  — Trần Thị Bích
const c3Id    = oid(); // gold    — Lê Văn Cường
const c4Id    = oid(); // diamond — Phạm Thị Dung (born today for birthday test)
const c5Id    = oid(); // bronze  — Hoàng Văn Em

// Branches
const br1Id = oid(); // Quận 1
const br2Id = oid(); // Thủ Đức

// Packages — branch 1
const p1_1 = oid(); // Rửa cơ bản       100k  30m
const p1_2 = oid(); // Rửa + Nano        250k  50m
const p1_3 = oid(); // Vệ sinh toàn diện 380k  90m
const p1_4 = oid(); // Rửa xe máy         50k  20m

// Packages — branch 2
const p2_1 = oid(); // Rửa tiêu chuẩn   120k  30m
const p2_2 = oid(); // VIP Cao Cấp       320k  75m
const p2_3 = oid(); // Vệ sinh nội thất  200k  60m
const p2_4 = oid(); // Đánh bóng         550k 150m

// Vehicles
const v1a = oid(); // c1 — Camry
const v2a = oid(); // c2 — CR-V
const v2b = oid(); // c2 — Wave
const v3a = oid(); // c3 — Ranger
const v3b = oid(); // c3 — CX-5
const v4a = oid(); // c4 — Mercedes
const v5a = oid(); // c5 — Exciter

// SlotPacks
const sp1 = oid(); // c2 br2 active
const sp2 = oid(); // c3 br1 active
const sp3 = oid(); // c4 br2 exhausted
const sp4 = oid(); // c4 br1 active

// Booking IDs we need to reference (for rebook + payment)
const bk_today_completed_br1 = oid(); // c4 br1 completed today
const bk_rebooked             = oid(); // rebook of above
const bk_today_inprogress     = oid(); // c3 br1 in_progress today
const bk_today_checkedin      = oid(); // c2 br1 checked_in today
const bk_today_pending_c1     = oid(); // c1 br1 pending today 11:00
const bk_today_pending_c5     = oid(); // c5 br1 pending today 13:00
const bk_today_slot_c4_br1    = oid(); // c4 br1 slot_pack pending today 14:00
const bk_today_comp_br2       = oid(); // c3 br2 completed today
const bk_today_inprog_br2     = oid(); // c2 br2 in_progress today
const bk_today_pending_br2    = oid(); // c4 br2 pending today 15:00
const bk_today_pending_br2b   = oid(); // c1 br2 pending today 16:00
const bk_yest_c1              = oid(); // c1 br1 completed yesterday
const bk_yest_c2              = oid(); // c2 br1 completed yesterday
const bk_yest_c3              = oid(); // c3 br2 completed yesterday
const bk_yest_c4_cancelled    = oid(); // c4 br2 cancelled yesterday

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('Connected:', MONGO_URI, '\n');

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

  // ── 1. USERS ───────────────────────────────────────────────────────────────
  console.log('Seeding users…');
  const now = new Date();
  // Birthday voucher code for c4 (born today)
  const birthdayVoucherCode = `BD${now.getFullYear()}${String(c4Id).slice(-6).toUpperCase()}`;

  await User.insertMany([
    {
      _id: adminId,
      name: 'Admin AutoWash',
      email: 'admin@washpro.vn',
      password: hash('Admin123!'),
      phone: '0901000001',
      role: 'admin',
      status: 'active',
      tier: 'diamond',
      loyaltyPoints: 0,
      lifetimePoints: 0,
    },
    {
      _id: mgr1Id,
      name: 'Nguyễn Quản Lý 1',
      email: 'manager1@washpro.vn',
      password: hash('Manager@123'),
      phone: '0901000002',
      role: 'manager',
      status: 'active',
      branchId: br1Id,
      tier: 'bronze',
      loyaltyPoints: 0,
      lifetimePoints: 0,
    },
    {
      _id: mgr2Id,
      name: 'Trần Quản Lý 2',
      email: 'manager2@washpro.vn',
      password: hash('Manager@123'),
      phone: '0901000003',
      role: 'manager',
      status: 'active',
      branchId: br2Id,
      tier: 'bronze',
      loyaltyPoints: 0,
      lifetimePoints: 0,
    },
    {
      _id: c1Id,
      name: 'Nguyễn Văn An',
      email: 'an.nguyen@gmail.com',
      password: hash('Customer@123'),
      phone: '0912111001',
      role: 'customer',
      status: 'active',
      tier: 'bronze',
      loyaltyPoints: 150,
      lifetimePoints: 150,
      dateOfBirth: new Date('1995-03-15'),
    },
    {
      _id: c2Id,
      name: 'Trần Thị Bích',
      email: 'bich.tran@gmail.com',
      password: hash('Customer@123'),
      phone: '0912111002',
      role: 'customer',
      status: 'active',
      tier: 'silver',
      loyaltyPoints: 350,
      lifetimePoints: 550,
      dateOfBirth: new Date('1992-07-22'),
    },
    {
      _id: c3Id,
      name: 'Lê Văn Cường',
      email: 'cuong.le@gmail.com',
      password: hash('Customer@123'),
      phone: '0912111003',
      role: 'customer',
      status: 'active',
      tier: 'gold',
      loyaltyPoints: 1500,
      lifetimePoints: 3200,
      dateOfBirth: new Date('1988-11-08'),
    },
    {
      // Born today → birthday voucher will be seeded
      _id: c4Id,
      name: 'Phạm Thị Dung',
      email: 'dung.pham@gmail.com',
      password: hash('Customer@123'),
      phone: '0912111004',
      role: 'customer',
      status: 'active',
      tier: 'diamond',
      loyaltyPoints: 5000,
      lifetimePoints: 12000,
      dateOfBirth: new Date(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`),
    },
    {
      _id: c5Id,
      name: 'Hoàng Văn Em',
      email: 'em.hoang@gmail.com',
      password: hash('Customer@123'),
      phone: '0912111005',
      role: 'customer',
      status: 'active',
      tier: 'bronze',
      loyaltyPoints: 80,
      lifetimePoints: 80,
      dateOfBirth: new Date('2000-09-05'),
    },
  ]);

  // ── 2. BRANCHES ────────────────────────────────────────────────────────────
  console.log('Seeding branches…');
  await Branch.insertMany([
    {
      _id: br1Id,
      name: 'AutoWash Pro Quận 1',
      address: '123 Nguyễn Thị Minh Khai, Phường 2, Quận 1, TP.HCM',
      phone: '028 3822 1111',
      email: 'q1@autowashpro.vn',
      openingTime: '07:00',
      closingTime: '19:00',
      status: 'active',
      managerId: mgr1Id,
      location: { type: 'Point', coordinates: [106.6920, 10.7769] },
    },
    {
      _id: br2Id,
      name: 'AutoWash Pro Thủ Đức',
      address: '456 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP.HCM',
      phone: '028 3720 2222',
      email: 'thuduc@autowashpro.vn',
      openingTime: '07:00',
      closingTime: '20:00',
      status: 'active',
      managerId: mgr2Id,
      location: { type: 'Point', coordinates: [106.7690, 10.8504] },
    },
  ]);

  // ── 3. PACKAGES ────────────────────────────────────────────────────────────
  console.log('Seeding packages…');
  await Package.insertMany([
    {
      _id: p1_1, name: 'Rửa xe cơ bản',
      description: 'Rửa ngoại thất toàn bộ, lau khô và vệ sinh bánh xe.',
      price: 100000, duration: 30, branchId: br1Id, status: 'active',
      category: 'external', vehicleTypes: ['sedan','suv','van'],
      subServices: [
        { name: 'Hút bụi nội thất', price: 50000, duration: 15, isOptional: true },
        { name: 'Xịt nước hoa',     price: 20000, duration: 5,  isOptional: true },
      ],
    },
    {
      _id: p1_2, name: 'Rửa xe + Phủ Nano',
      description: 'Rửa ngoại thất chuyên sâu và phủ bảo vệ nano, bảo vệ sơn xe tới 3 tháng.',
      price: 250000, duration: 50, branchId: br1Id, status: 'active',
      category: 'external', vehicleTypes: ['sedan','suv','pickup'],
      subServices: [
        { name: 'Đánh bóng vành xe',  price: 80000,  duration: 15, isOptional: true },
        { name: 'Vệ sinh khoang máy', price: 100000, duration: 20, isOptional: true },
        { name: 'Hút bụi nội thất',   price: 50000,  duration: 15, isOptional: true },
      ],
    },
    {
      _id: p1_3, name: 'Vệ sinh toàn diện',
      description: 'Dịch vụ chăm sóc xe toàn bộ: ngoại thất, nội thất và khoang máy.',
      price: 380000, duration: 90, branchId: br1Id, status: 'active',
      category: 'full', vehicleTypes: ['sedan','suv','pickup','van'],
      subServices: [
        { name: 'Khử mùi Ozone',          price: 120000, duration: 30, isOptional: true },
        { name: 'Đánh bóng toàn xe',       price: 200000, duration: 40, isOptional: true },
        { name: 'Phủ ceramic tạm thời',    price: 150000, duration: 20, isOptional: true },
      ],
    },
    {
      _id: p1_4, name: 'Rửa xe máy',
      description: 'Rửa xe máy sạch bóng, lau khô và kiểm tra sên xe.',
      price: 50000, duration: 20, branchId: br1Id, status: 'active',
      category: 'external', vehicleTypes: ['motorcycle'],
      subServices: [
        { name: 'Tra dầu nhớt sên', price: 30000, duration: 5, isOptional: true },
      ],
    },
    {
      _id: p2_1, name: 'Rửa xe tiêu chuẩn',
      description: 'Rửa ngoại thất nhanh chóng, phù hợp sử dụng hàng ngày.',
      price: 120000, duration: 30, branchId: br2Id, status: 'active',
      category: 'external', vehicleTypes: ['sedan','suv','pickup','van'],
      subServices: [
        { name: 'Hút bụi ghế ngồi',    price: 40000, duration: 10, isOptional: true },
        { name: 'Xịt thơm nội thất',   price: 25000, duration: 5,  isOptional: true },
      ],
    },
    {
      _id: p2_2, name: 'Gói VIP Cao Cấp',
      description: 'Trải nghiệm cao cấp: rửa sạch, đánh bóng, phủ wax và vệ sinh nội thất chuyên sâu.',
      price: 320000, duration: 75, branchId: br2Id, status: 'active',
      category: 'full', vehicleTypes: ['sedan','suv'],
      subServices: [
        { name: 'Phủ wax Carnauba',   price: 150000, duration: 30, isOptional: true },
        { name: 'Dưỡng da ghế da',    price: 100000, duration: 20, isOptional: true },
        { name: 'Đánh bóng đèn pha',  price: 80000,  duration: 15, isOptional: true },
      ],
    },
    {
      _id: p2_3, name: 'Vệ sinh nội thất',
      description: 'Làm sạch sâu nội thất: hút bụi, lau táp-lô, vệ sinh ghế và thảm sàn.',
      price: 200000, duration: 60, branchId: br2Id, status: 'active',
      category: 'internal', vehicleTypes: ['sedan','suv','van'],
      subServices: [
        { name: 'Giặt thảm sàn',      price: 80000,  duration: 20, isOptional: true },
        { name: 'Khử mùi sinh học',   price: 100000, duration: 30, isOptional: true },
      ],
    },
    {
      _id: p2_4, name: 'Đánh bóng chuyên sâu',
      description: 'Phục hồi và bảo vệ sơn xe bằng công nghệ polish 2 bước, loại bỏ trầy xước nhẹ.',
      price: 550000, duration: 150, branchId: br2Id, status: 'active',
      category: 'full', vehicleTypes: ['sedan','suv'],
      subServices: [
        { name: 'Phủ ceramic lớp 1',      price: 500000, duration: 60, isOptional: true },
        { name: 'Xử lý vết nhựa đường',   price: 120000, duration: 20, isOptional: true },
      ],
    },
  ]);

  // ── 4. VEHICLES ────────────────────────────────────────────────────────────
  console.log('Seeding vehicles…');
  await Vehicle.insertMany([
    { _id: v1a, userId: c1Id, licensePlate: '51A-12345', vehicleType: 'sedan',      brand: 'Toyota',   model: 'Camry 2.0',   color: 'Trắng',      year: 2021, isDefault: true },
    { _id: v2a, userId: c2Id, licensePlate: '59B-67890', vehicleType: 'suv',        brand: 'Honda',    model: 'CR-V 1.5T',   color: 'Đen',        year: 2022, isDefault: true },
    { _id: v2b, userId: c2Id, licensePlate: '59B-11199', vehicleType: 'motorcycle', brand: 'Honda',    model: 'Wave Alpha',  color: 'Xanh',       year: 2020, isDefault: false },
    { _id: v3a, userId: c3Id, licensePlate: '51C-11111', vehicleType: 'pickup',     brand: 'Ford',     model: 'Ranger XLS',  color: 'Bạc',        year: 2023, isDefault: true },
    { _id: v3b, userId: c3Id, licensePlate: '51C-22222', vehicleType: 'suv',        brand: 'Mazda',    model: 'CX-5 2.0',    color: 'Đỏ',         year: 2022, isDefault: false },
    { _id: v4a, userId: c4Id, licensePlate: '51D-22222', vehicleType: 'sedan',      brand: 'Mercedes', model: 'C200 AMG',    color: 'Trắng ngọc', year: 2024, isDefault: true },
    { _id: v5a, userId: c5Id, licensePlate: '79E-33333', vehicleType: 'motorcycle', brand: 'Yamaha',   model: 'Exciter 155', color: 'Vàng đen',   year: 2023, isDefault: true },
  ]);

  // ── 5. VOUCHERS ────────────────────────────────────────────────────────────
  console.log('Seeding vouchers…');
  const bdEnd = new Date(); bdEnd.setDate(bdEnd.getDate() + 7);
  await Voucher.insertMany([
    {
      code: 'WELCOME10', name: 'Chào mừng khách mới — Giảm 10%',
      description: 'Ưu đãi 10% cho lần đặt lịch đầu tiên. Áp dụng tất cả dịch vụ.',
      type: 'percentage', value: 10, maxDiscount: 50000, minOrder: 0,
      quantity: 200, remaining: 187,
      startDate: new Date('2025-01-01'), endDate: new Date('2027-12-31'),
      applicableToAllPackages: true, applicableToAllBranches: true,
      status: 'active', createdBy: adminId, maxUsagePerUser: 1,
    },
    {
      code: 'SUMMER50K', name: 'Hè Rực Rỡ — Giảm 50.000đ',
      description: 'Giảm ngay 50.000đ cho đơn hàng từ 150.000đ.',
      type: 'fixed', value: 50000, minOrder: 150000,
      quantity: 100, remaining: 72,
      startDate: new Date('2025-05-01'), endDate: new Date('2026-12-31'),
      applicableToAllPackages: true, applicableToAllBranches: true,
      status: 'active', createdBy: adminId, maxUsagePerUser: 2,
    },
    {
      code: 'SILVER15', name: 'Đặc quyền Thành viên Bạc — Giảm 15%',
      description: 'Dành riêng cho thành viên hạng Bạc trở lên.',
      type: 'percentage', value: 15, maxDiscount: 80000, minOrder: 100000,
      quantity: 50, remaining: 41,
      startDate: new Date('2025-01-01'), endDate: new Date('2027-12-31'),
      applicableToAllPackages: true, applicableToAllBranches: true,
      status: 'active', createdBy: adminId, maxUsagePerUser: 5,
      applicableTiers: ['silver','gold','diamond'],
    },
    {
      code: 'DIAMOND20', name: 'VIP Diamond — Giảm 20%',
      description: 'Ưu đãi độc quyền 20% cho thành viên Kim Cương. Tối đa 100.000đ.',
      type: 'percentage', value: 20, maxDiscount: 100000, minOrder: 200000,
      quantity: 20, remaining: 15,
      startDate: new Date('2025-01-01'), endDate: new Date('2027-12-31'),
      applicableToAllPackages: true, applicableToAllBranches: true,
      status: 'active', createdBy: adminId, maxUsagePerUser: 10,
      applicableTiers: ['gold','diamond'],
    },
    // Birthday voucher cho Phạm Thị Dung (sinh nhật hôm nay)
    {
      code: birthdayVoucherCode,
      name: 'Voucher sinh nhật Phạm Thị Dung',
      description: `Quà sinh nhật dành riêng cho Phạm Thị Dung — giảm 20% tối đa 100.000đ.`,
      type: 'percentage', value: 20, maxDiscount: 100000, minOrder: 0,
      quantity: 1, remaining: 1,
      startDate: new Date(), endDate: bdEnd,
      applicableToAllPackages: true, applicableToAllBranches: true,
      status: 'active', maxUsagePerUser: 1,
      isBirthdayVoucher: true, assignedTo: c4Id,
    },
  ]);

  // ── 6. SLOT PACKS ──────────────────────────────────────────────────────────
  console.log('Seeding slot packs…');
  await SlotPack.insertMany([
    {
      _id: sp1,
      userId: c2Id, branchId: br2Id, packageId: p2_1, vehicleId: v2a,
      totalSlots: 10, remainingSlots: 7, usedSlots: 3,
      unitPrice: 120000, discountPercent: 10, discountAmount: 120000,
      finalPrice: 1080000, finalPriceAfterVoucher: 1080000,
      packCode: 'SP-BICHA1', priority: 2,
      status: 'active', paymentStatus: 'paid', paidAt: daysAgo(20),
      expiresAt: daysFromNow(180),
    },
    {
      _id: sp2,
      userId: c3Id, branchId: br1Id, packageId: p1_2, vehicleId: v3a,
      totalSlots: 5, remainingSlots: 3, usedSlots: 2,
      unitPrice: 250000, discountPercent: 5, discountAmount: 62500,
      finalPrice: 1187500, finalPriceAfterVoucher: 1137500,
      voucherCode: 'SUMMER50K', voucherDiscount: 50000,
      packCode: 'SP-CUONG2', priority: 3,
      status: 'active', paymentStatus: 'paid', paidAt: daysAgo(15),
      expiresAt: daysFromNow(90),
    },
    {
      _id: sp3,
      userId: c4Id, branchId: br2Id, packageId: p2_2, vehicleId: v4a,
      totalSlots: 20, remainingSlots: 0, usedSlots: 20,
      unitPrice: 320000, discountPercent: 15, discountAmount: 960000,
      finalPrice: 5440000, finalPriceAfterVoucher: 5440000,
      packCode: 'SP-DUNGG3', priority: 4,
      status: 'exhausted', paymentStatus: 'paid', paidAt: daysAgo(60),
    },
    {
      _id: sp4,
      userId: c4Id, branchId: br1Id, packageId: p1_2, vehicleId: v4a,
      totalSlots: 10, remainingSlots: 8, usedSlots: 2,
      unitPrice: 250000, discountPercent: 10, discountAmount: 250000,
      finalPrice: 2250000, finalPriceAfterVoucher: 2150000,
      voucherCode: 'DIAMOND20', voucherDiscount: 100000,
      packCode: 'SP-DUNGG4', priority: 4,
      status: 'active', paymentStatus: 'paid', paidAt: daysAgo(10),
      expiresAt: daysFromNow(120),
    },
  ]);

  // ── 7. BOOKINGS ────────────────────────────────────────────────────────────
  console.log('Seeding bookings…');
  const recurringGroup = new mongoose.Types.ObjectId().toString();
  const todayDate = today();

  const replyDate = daysAgo(0, 10); // manager replied this morning

  const bookings = [

    // ══════════════════════════════════════════════════════════════════════════
    // TODAY — Branch 1 (manager1) — nhiều slot để Schedule Board đẹp
    // ══════════════════════════════════════════════════════════════════════════

    // 08:00–08:30 completed + feedback + managerReply
    {
      _id: bk_today_completed_br1,
      userId: c4Id, branchId: br1Id, packageId: p1_1, vehicleId: v4a,
      bookingDate: todayDate, startTime: '08:00', endTime: '08:30',
      status: 'completed', bookingType: 'single', priority: 4,
      finalPrice: 100000, paymentStatus: 'paid', paymentMethod: 'cash',
      checkInTime: todayAt(8), checkOutTime: todayAt(8, 30),
      rating: 5, feedback: 'Rửa rất sạch, nhân viên nhiệt tình. Sẽ quay lại!',
      feedbackAt: todayAt(9),
      managerReply: 'Cảm ơn chị Dung đã tin tưởng dịch vụ! Chúc chị sinh nhật vui vẻ 🎂',
      managerReplyAt: replyDate,
    },
    // 08:30–09:20 rebooked FROM bk_today_completed_br1 — confirmed booking
    {
      _id: bk_rebooked,
      userId: c4Id, branchId: br1Id, packageId: p1_1, vehicleId: v4a,
      bookingDate: daysFromNow(1), startTime: '08:00', endTime: '08:30',
      status: 'pending', bookingType: 'single', priority: 4,
      finalPrice: 100000, paymentStatus: 'unpaid',
      rebookedFromId: bk_today_completed_br1,
    },
    // 09:00–09:50 in_progress
    {
      _id: bk_today_inprogress,
      userId: c3Id, branchId: br1Id, packageId: p1_2, vehicleId: v3a,
      bookingDate: todayDate, startTime: '09:00', endTime: '09:50',
      status: 'in_progress', bookingType: 'single', priority: 3,
      finalPrice: 250000, paymentStatus: 'unpaid',
      checkInTime: todayAt(9),
    },
    // 10:00–11:30 checked_in
    {
      _id: bk_today_checkedin,
      userId: c2Id, branchId: br1Id, packageId: p1_3, vehicleId: v2a,
      bookingDate: todayDate, startTime: '10:00', endTime: '11:30',
      status: 'checked_in', bookingType: 'single', priority: 2,
      finalPrice: 330000, paymentStatus: 'unpaid',
      discountAmount: 50000, voucherCode: 'SUMMER50K',
      checkInTime: todayAt(10),
    },
    // 11:00–11:30 pending
    {
      _id: bk_today_pending_c1,
      userId: c1Id, branchId: br1Id, packageId: p1_1, vehicleId: v1a,
      bookingDate: todayDate, startTime: '11:00', endTime: '11:30',
      status: 'pending', bookingType: 'single', priority: 1,
      finalPrice: 100000, paymentStatus: 'unpaid',
    },
    // 13:00–13:20 motorcycle pending
    {
      _id: bk_today_pending_c5,
      userId: c5Id, branchId: br1Id, packageId: p1_4, vehicleId: v5a,
      bookingDate: todayDate, startTime: '13:00', endTime: '13:20',
      status: 'pending', bookingType: 'single', priority: 1,
      finalPrice: 50000, paymentStatus: 'unpaid',
    },
    // 14:00–14:50 slot_pack_usage pending
    {
      _id: bk_today_slot_c4_br1,
      userId: c4Id, branchId: br1Id, packageId: p1_2, vehicleId: v4a,
      bookingDate: todayDate, startTime: '14:00', endTime: '14:50',
      status: 'pending', bookingType: 'slot_pack_usage', slotPackId: sp4, priority: 4,
      finalPrice: 0, paymentStatus: 'paid',
    },
    // 15:30–16:00 pending (upcoming — nhắc lịch cron test)
    {
      userId: c1Id, branchId: br1Id, packageId: p1_1, vehicleId: v1a,
      bookingDate: todayDate, startTime: '15:30', endTime: '16:00',
      status: 'pending', bookingType: 'single', priority: 1,
      finalPrice: 100000, paymentStatus: 'unpaid',
    },
    // 16:00–17:30 vệ sinh toàn diện pending
    {
      userId: c3Id, branchId: br1Id, packageId: p1_3, vehicleId: v3b,
      bookingDate: todayDate, startTime: '16:00', endTime: '17:30',
      status: 'pending', bookingType: 'single', priority: 3,
      finalPrice: 380000, paymentStatus: 'unpaid',
    },

    // ══════════════════════════════════════════════════════════════════════════
    // TODAY — Branch 2 (manager2)
    // ══════════════════════════════════════════════════════════════════════════

    // 08:30–09:45 completed + feedback + managerReply
    {
      _id: bk_today_comp_br2,
      userId: c3Id, branchId: br2Id, packageId: p2_2, vehicleId: v3b,
      bookingDate: todayDate, startTime: '08:30', endTime: '09:45',
      status: 'completed', bookingType: 'single', priority: 3,
      finalPrice: 272000, paymentStatus: 'paid', paymentMethod: 'momo',
      discountAmount: 48000, voucherCode: 'SILVER15',
      checkInTime: todayAt(8, 30), checkOutTime: todayAt(9, 45),
      rating: 4, feedback: 'Dịch vụ tốt, nhưng chờ hơi lâu một chút.',
      feedbackAt: todayAt(10),
      managerReply: 'Cảm ơn anh Cường đã phản hồi! Chúng tôi sẽ cải thiện thời gian chờ.',
      managerReplyAt: replyDate,
    },
    // 10:30–11:00 in_progress slot_pack
    {
      _id: bk_today_inprog_br2,
      userId: c2Id, branchId: br2Id, packageId: p2_1, vehicleId: v2a,
      bookingDate: todayDate, startTime: '10:30', endTime: '11:00',
      status: 'in_progress', bookingType: 'slot_pack_usage', slotPackId: sp1, priority: 2,
      finalPrice: 0, paymentStatus: 'paid',
      checkInTime: todayAt(10, 30),
    },
    // 13:00–13:30 pending
    {
      userId: c1Id, branchId: br2Id, packageId: p2_1, vehicleId: v1a,
      bookingDate: todayDate, startTime: '13:00', endTime: '13:30',
      status: 'pending', bookingType: 'single', priority: 1,
      finalPrice: 120000, paymentStatus: 'unpaid',
    },
    // 14:00–15:00 vệ sinh nội thất pending
    {
      userId: c5Id, branchId: br2Id, packageId: p2_3, vehicleId: v5a,
      bookingDate: todayDate, startTime: '14:00', endTime: '15:00',
      status: 'pending', bookingType: 'single', priority: 1,
      finalPrice: 200000, paymentStatus: 'unpaid',
    },
    // 15:00–17:30 đánh bóng chuyên sâu pending
    {
      _id: bk_today_pending_br2,
      userId: c4Id, branchId: br2Id, packageId: p2_4, vehicleId: v4a,
      bookingDate: todayDate, startTime: '15:00', endTime: '17:30',
      status: 'pending', bookingType: 'single', priority: 4,
      finalPrice: 450000, paymentStatus: 'unpaid',
      discountAmount: 100000, voucherCode: 'DIAMOND20',
    },
    // 16:30–17:45 VIP Cao Cấp pending
    {
      _id: bk_today_pending_br2b,
      userId: c3Id, branchId: br2Id, packageId: p2_2, vehicleId: v3a,
      bookingDate: todayDate, startTime: '16:30', endTime: '17:45',
      status: 'pending', bookingType: 'single', priority: 3,
      finalPrice: 272000, paymentStatus: 'unpaid',
      discountAmount: 48000, voucherCode: 'SILVER15',
    },

    // ══════════════════════════════════════════════════════════════════════════
    // YESTERDAY
    // ══════════════════════════════════════════════════════════════════════════
    {
      _id: bk_yest_c1,
      userId: c1Id, branchId: br1Id, packageId: p1_1, vehicleId: v1a,
      bookingDate: daysAgo(1), startTime: '09:00', endTime: '09:30',
      status: 'completed', bookingType: 'single', priority: 1,
      finalPrice: 100000, paymentStatus: 'paid', paymentMethod: 'cash',
      rating: 5, feedback: 'Nhanh gọn, sạch sẽ!',
      feedbackAt: daysAgo(1, 10),
      // no managerReply yet → test "Phản hồi khách hàng" button
    },
    {
      _id: bk_yest_c2,
      userId: c2Id, branchId: br1Id, packageId: p1_2, vehicleId: v2a,
      bookingDate: daysAgo(1), startTime: '10:00', endTime: '10:50',
      status: 'completed', bookingType: 'single', priority: 2,
      finalPrice: 250000, paymentStatus: 'paid', paymentMethod: 'momo',
      rating: 4, feedback: 'Rửa sạch, nhân viên thân thiện.',
      feedbackAt: daysAgo(1, 11),
      managerReply: 'Cảm ơn chị Bích đã ghé AutoWash! Hẹn gặp lại.',
      managerReplyAt: daysAgo(1, 14),
    },
    {
      _id: bk_yest_c3,
      userId: c3Id, branchId: br2Id, packageId: p2_3, vehicleId: v3b,
      bookingDate: daysAgo(1), startTime: '14:00', endTime: '15:00',
      status: 'completed', bookingType: 'single', priority: 3,
      finalPrice: 200000, paymentStatus: 'paid', paymentMethod: 'cash',
      rating: 5, feedback: 'Nội thất sạch hơn tôi nghĩ. Tuyệt vời!',
      feedbackAt: daysAgo(1, 15),
      managerReply: 'Rất vui khi anh hài lòng! AutoWash Thủ Đức luôn chào đón anh.',
      managerReplyAt: daysAgo(1, 16),
    },
    {
      _id: bk_yest_c4_cancelled,
      userId: c4Id, branchId: br2Id, packageId: p2_2, vehicleId: v4a,
      bookingDate: daysAgo(1), startTime: '16:00', endTime: '17:15',
      status: 'cancelled', bookingType: 'single', priority: 4,
      finalPrice: 320000, paymentStatus: 'unpaid',
      cancelledAt: daysAgo(1, 15), cancelledBy: 'customer',
      cancellationReason: 'Bận đột xuất, không đến được',
    },

    // ══════════════════════════════════════════════════════════════════════════
    // RECURRING — c2, br1, T2+T4 hàng tuần
    // ══════════════════════════════════════════════════════════════════════════
    ...[14, 12, 7, 5].map(d => ({
      userId: c2Id, branchId: br1Id, packageId: p1_1, vehicleId: v2a,
      bookingDate: daysAgo(d), startTime: '08:00', endTime: '08:30',
      status: 'completed', bookingType: 'recurring',
      recurringGroupId: recurringGroup, priority: 2,
      finalPrice: 100000, paymentStatus: 'paid', paymentMethod: 'cash',
      rating: [4,5,4,5][Math.floor(d/4) % 4],
      feedbackAt: daysAgo(d, 9),
    })),
    ...[1, 3].map(d => ({
      userId: c2Id, branchId: br1Id, packageId: p1_1, vehicleId: v2a,
      bookingDate: daysFromNow(d), startTime: '08:00', endTime: '08:30',
      status: 'pending', bookingType: 'recurring',
      recurringGroupId: recurringGroup, priority: 2,
      finalPrice: 100000, paymentStatus: 'unpaid',
    })),

    // ══════════════════════════════════════════════════════════════════════════
    // PAST 2 WEEKS (dữ liệu doanh thu)
    // ══════════════════════════════════════════════════════════════════════════
    ...[3, 4, 5, 6, 8, 9, 10, 11].map((d, i) => ({
      userId:    [c1Id, c2Id, c3Id, c4Id][i % 4],
      branchId:  i % 2 === 0 ? br1Id : br2Id,
      packageId: [p1_1, p1_2, p2_1, p2_2][i % 4],
      vehicleId: [v1a, v2a, v3a, v4a][i % 4],
      bookingDate: daysAgo(d),
      startTime: ['09:00','10:00','11:00','14:00'][i % 4],
      endTime:   ['09:30','10:50','11:30','15:15'][i % 4],
      status: 'completed', bookingType: 'single',
      priority: [1, 2, 3, 4][i % 4],
      finalPrice: [100000, 250000, 120000, 272000][i % 4],
      paymentStatus: 'paid',
      paymentMethod: i % 2 === 0 ? 'cash' : 'momo',
      rating: [4, 5, 4, 5][i % 4],
      feedback: [
        'Dịch vụ tốt, xe sạch bóng!',
        'Nhân viên nhiệt tình, giá hợp lý.',
        'Xe sạch từ trong ra ngoài. Hài lòng!',
        'Dịch vụ đúng tiêu chuẩn premium. Rất tốt!',
      ][i % 4],
      feedbackAt: daysAgo(d, 11),
      managerReply: i % 2 === 0 ? [
        'Cảm ơn bạn đã sử dụng dịch vụ!',
        'Rất vui khi bạn hài lòng! Hẹn gặp lại.',
        'Cảm ơn phản hồi tích cực!',
        'Chúng tôi luôn cố gắng phục vụ tốt nhất!',
      ][i % 4] : undefined,
      managerReplyAt: i % 2 === 0 ? daysAgo(d-1, 9) : undefined,
    })),

    // ══════════════════════════════════════════════════════════════════════════
    // FUTURE BOOKINGS
    // ══════════════════════════════════════════════════════════════════════════
    {
      userId: c1Id, branchId: br1Id, packageId: p1_1, vehicleId: v1a,
      bookingDate: daysFromNow(2), startTime: '09:00', endTime: '09:30',
      status: 'pending', bookingType: 'single', priority: 1,
      finalPrice: 100000, paymentStatus: 'unpaid',
    },
    {
      userId: c4Id, branchId: br2Id, packageId: p2_2, vehicleId: v4a,
      bookingDate: daysFromNow(3), startTime: '14:00', endTime: '15:15',
      status: 'pending', bookingType: 'single', priority: 4,
      finalPrice: 220000, paymentStatus: 'unpaid',
      discountAmount: 100000, voucherCode: 'DIAMOND20',
    },
    {
      userId: c3Id, branchId: br1Id, packageId: p1_3, vehicleId: v3a,
      bookingDate: daysFromNow(5), startTime: '10:00', endTime: '11:30',
      status: 'pending', bookingType: 'single', priority: 3,
      finalPrice: 380000, paymentStatus: 'unpaid',
    },
    {
      userId: c2Id, branchId: br2Id, packageId: p2_3, vehicleId: v2a,
      bookingDate: daysFromNow(4), startTime: '09:00', endTime: '10:00',
      status: 'pending', bookingType: 'single', priority: 2,
      finalPrice: 200000, paymentStatus: 'unpaid',
    },
  ];

  await Booking.insertMany(bookings);

  // ── 8. PAYMENTS ────────────────────────────────────────────────────────────
  console.log('Seeding payments…');
  const paidBookings = await Booking.find({
    paymentStatus: 'paid',
    paymentMethod: { $exists: true, $ne: null },
    finalPrice: { $gt: 0 },
  });
  if (paidBookings.length) {
    await Payment.insertMany(
      paidBookings.map(b => ({
        bookingId: b._id,
        userId: b.userId,
        amount: b.finalPrice,
        method: b.paymentMethod,
        status: 'paid',
        paidAt: b.checkOutTime || b.bookingDate,
        transactionId: `TXN-${b._id.toString().slice(-8).toUpperCase()}`,
      }))
    );
  }

  // ── 9. POINT HISTORY ───────────────────────────────────────────────────────
  console.log('Seeding point history…');
  await PointHistory.insertMany([
    { userId: c1Id, points: 50,    type: 'earned',   description: 'Tích điểm từ đặt lịch rửa xe',          createdAt: daysAgo(30) },
    { userId: c1Id, points: 100,   type: 'earned',   description: 'Tích điểm từ đặt lịch rửa xe',          createdAt: daysAgo(15) },
    { userId: c2Id, points: 200,   type: 'earned',   description: 'Tích điểm từ đặt lịch rửa xe',          createdAt: daysAgo(25) },
    { userId: c2Id, points: 150,   type: 'earned',   description: 'Tích điểm từ gói lượt',                  createdAt: daysAgo(20) },
    { userId: c2Id, points: -50,   type: 'redeemed', description: 'Đổi voucher giảm giá',                   createdAt: daysAgo(10) },
    { userId: c3Id, points: 500,   type: 'earned',   description: 'Tích điểm Gold x1.5',                   createdAt: daysAgo(40) },
    { userId: c3Id, points: 1000,  type: 'earned',   description: 'Tích điểm Gold x1.5',                   createdAt: daysAgo(20) },
    { userId: c4Id, points: 2000,  type: 'earned',   description: 'Tích điểm Diamond x2.0',                createdAt: daysAgo(50) },
    { userId: c4Id, points: 3000,  type: 'earned',   description: 'Tích điểm Diamond x2.0',                createdAt: daysAgo(30) },
    { userId: c4Id, points: -500,  type: 'redeemed', description: 'Đổi voucher VIP Diamond',               createdAt: daysAgo(15) },
    { userId: c5Id, points: 30,    type: 'earned',   description: 'Tích điểm từ đặt lịch rửa xe máy',     createdAt: daysAgo(5) },
    { userId: c5Id, points: 50,    type: 'earned',   description: 'Tích điểm từ đặt lịch rửa xe máy',     createdAt: daysAgo(2) },
  ]);

  // ── 10. NOTIFICATIONS ──────────────────────────────────────────────────────
  console.log('Seeding notifications…');
  await Notification.insertMany([
    // Customers
    { userId: c1Id, title: 'Đặt lịch thành công',    message: 'Lịch rửa xe của bạn đã xác nhận hôm nay lúc 11:00 tại AutoWash Pro Quận 1.', type: 'booking_confirmed', isRead: false, createdAt: new Date() },
    { userId: c1Id, title: 'Nhắc lịch sắp đến',      message: 'Lịch rửa xe của bạn hôm nay lúc 15:30 tại AutoWash Pro Quận 1 sắp bắt đầu!', type: 'booking_reminder', isRead: false, createdAt: new Date() },
    { userId: c1Id, title: 'Dịch vụ hoàn thành',     message: 'Xe 51A-12345 đã rửa xong tại AutoWash Pro Quận 1. Hãy để lại đánh giá nhé!', type: 'booking_completed', isRead: true, createdAt: daysAgo(1) },

    { userId: c2Id, title: 'Gói lượt còn 7 lần',     message: 'Gói SP-BICHA1 còn 7 lần sử dụng. Hãy dùng trước 180 ngày!', type: 'system', isRead: false, createdAt: new Date() },
    { userId: c2Id, title: 'Lịch định kỳ ngày mai',  message: 'Lịch rửa xe định kỳ ngày mai 08:00 tại AutoWash Pro Quận 1.', type: 'booking_reminder', isRead: true, createdAt: daysAgo(1) },
    { userId: c2Id, title: 'Thanh toán MoMo thành công', message: 'Đã nhận 250.000đ qua MoMo cho đơn rửa xe + Nano.', type: 'payment_confirmed', isRead: false, createdAt: daysAgo(1) },

    { userId: c3Id, title: 'Phản hồi từ chi nhánh',  message: 'AutoWash Thủ Đức vừa trả lời đánh giá của bạn. Xem ngay!', type: 'system', isRead: false, createdAt: new Date() },
    { userId: c3Id, title: 'Thanh toán thành công',  message: 'Đã nhận 272.000đ qua MoMo cho lịch rửa xe hôm nay.', type: 'payment_confirmed', isRead: false, createdAt: new Date() },

    // c4 - birthday notifications!
    { userId: c4Id, title: 'Chúc mừng sinh nhật! 🎂', message: `AutoWash Pro gửi tặng bạn voucher giảm 20% nhân dịp sinh nhật. Mã: ${birthdayVoucherCode} (hiệu lực 7 ngày).`, type: 'voucher', isRead: false, createdAt: new Date() },
    { userId: c4Id, title: 'Voucher mới cho bạn',    message: 'Bạn có voucher DIAMOND20 giảm 20% — hãy sử dụng trước 31/12/2027!', type: 'voucher', isRead: true, createdAt: daysAgo(2) },
    { userId: c4Id, title: 'Lịch bị hủy',            message: 'Lịch VIP Cao Cấp ngày hôm qua đã bị hủy theo yêu cầu của bạn.', type: 'booking_cancelled', isRead: true, createdAt: daysAgo(1) },

    { userId: c5Id, title: 'Đặt lịch thành công',    message: 'Lịch rửa xe máy Exciter hôm nay 13:00 tại AutoWash Pro Quận 1 đã xác nhận.', type: 'booking_confirmed', isRead: false, createdAt: new Date() },

    // Managers
    { userId: mgr1Id, title: 'Có 6 lịch hôm nay',   message: '6 lịch đặt hôm nay đang chờ xử lý tại chi nhánh Quận 1.', type: 'booking_created', isRead: false, createdAt: new Date() },
    { userId: mgr1Id, title: 'Đánh giá 5⭐ mới',     message: 'Phạm Thị Dung vừa đánh giá 5⭐ dịch vụ Rửa xe cơ bản. Xem và phản hồi!', type: 'system', isRead: false, createdAt: new Date() },
    { userId: mgr1Id, title: 'Thanh toán tiền mặt',  message: 'Đã nhận thanh toán tiền mặt 100.000đ từ Phạm Thị Dung.', type: 'payment_received', isRead: true, createdAt: daysAgo(0, 9) },

    { userId: mgr2Id, title: 'Đánh giá mới từ KH',  message: 'Lê Văn Cường vừa đánh giá 4⭐ dịch vụ VIP tại chi nhánh Thủ Đức.', type: 'system', isRead: false, createdAt: new Date() },
    { userId: mgr2Id, title: 'Thanh toán MoMo',      message: 'Đã nhận 272.000đ qua MoMo từ Lê Văn Cường cho Gói VIP.', type: 'payment_received', isRead: false, createdAt: new Date() },
  ]);

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  const counts = {
    users:     await User.countDocuments(),
    branches:  await Branch.countDocuments(),
    packages:  await Package.countDocuments(),
    vehicles:  await Vehicle.countDocuments(),
    vouchers:  await Voucher.countDocuments(),
    bookings:  await Booking.countDocuments(),
    slotPacks: await SlotPack.countDocuments(),
    payments:  await Payment.countDocuments(),
    points:    await PointHistory.countDocuments(),
    notifs:    await Notification.countDocuments(),
  };

  console.log('\n✅ SEED HOÀN TẤT!\n');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  TÀI KHOẢN TEST');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  [ADMIN]');
  console.log('    Email    : admin@washpro.vn');
  console.log('    Password : Admin123!');
  console.log('');
  console.log('  [MANAGER — Chi nhánh Quận 1]');
  console.log('    Email    : manager1@washpro.vn');
  console.log('    Password : Manager@123');
  console.log('');
  console.log('  [MANAGER — Chi nhánh Thủ Đức]');
  console.log('    Email    : manager2@washpro.vn');
  console.log('    Password : Manager@123');
  console.log('');
  console.log('  [CUSTOMER — Bronze] Nguyễn Văn An');
  console.log('    Email    : an.nguyen@gmail.com');
  console.log('    Password : Customer@123');
  console.log('    Phone    : 0912111001');
  console.log('');
  console.log('  [CUSTOMER — Silver] Trần Thị Bích');
  console.log('    Email    : bich.tran@gmail.com');
  console.log('    Password : Customer@123');
  console.log('    Phone    : 0912111002');
  console.log('');
  console.log('  [CUSTOMER — Gold] Lê Văn Cường');
  console.log('    Email    : cuong.le@gmail.com');
  console.log('    Password : Customer@123');
  console.log('    Phone    : 0912111003');
  console.log('');
  console.log('  [CUSTOMER — Diamond] Phạm Thị Dung  ← sinh nhật hôm nay!');
  console.log('    Email    : dung.pham@gmail.com');
  console.log('    Password : Customer@123');
  console.log('    Phone    : 0912111004');
  console.log('');
  console.log('  [CUSTOMER — Bronze] Hoàng Văn Em');
  console.log('    Email    : em.hoang@gmail.com');
  console.log('    Password : Customer@123');
  console.log('    Phone    : 0912111005');
  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  VOUCHER CODES');
  console.log(`    WELCOME10 | SUMMER50K | SILVER15 | DIAMOND20`);
  console.log(`    ${birthdayVoucherCode}  ← voucher sinh nhật Phạm Thị Dung`);
  console.log('');
  console.log('  SLOT PACK CODES');
  console.log('    SP-BICHA1 (c2, Thủ Đức, còn 7)');
  console.log('    SP-CUONG2 (c3, Quận 1, còn 3)');
  console.log('    SP-DUNGG4 (c4, Quận 1, còn 8)');
  console.log('');
  console.log('  BIỂN SỐ ĐỂ TEST CHECK-IN NHANH');
  console.log('    51A-12345  (Nguyễn Văn An — Camry)');
  console.log('    59B-67890  (Trần Thị Bích — CR-V)');
  console.log('    51C-11111  (Lê Văn Cường  — Ranger)');
  console.log('    51D-22222  (Phạm Thị Dung — Mercedes)');
  console.log('    79E-33333  (Hoàng Văn Em  — Exciter)');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  Đã tạo:');
  Object.entries(counts).forEach(([k, v]) => console.log(`    ${k.padEnd(12)}: ${v}`));
  console.log('');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('\n❌ Seed thất bại:', err.message);
  console.error(err.stack);
  mongoose.disconnect();
  process.exit(1);
});
