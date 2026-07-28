/**
 * AutoWashPro — Full Seed: 8 Branches, 32 Packages, Users, Vehicles,
 *                Bookings, Slot Packs, Vouchers
 * Run: node scripts/seed-branches-packages.js
 */

require('dotenv').config();
require('../src/config/dns');
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../src/models/user.schema');
const Branch   = require('../src/models/branch.schema');
const Package  = require('../src/models/package.schema');
const Vehicle  = require('../src/models/vehicle.schema');
const Booking  = require('../src/models/booking.schema');
const Voucher  = require('../src/models/voucher.schema');
const SlotPack = require('../src/models/slotPack.schema');

const MONGO_URI = process.env.MONGODB_URI;
const hash = pwd => bcrypt.hashSync(pwd, 12);
const oid = () => new mongoose.Types.ObjectId();

function daysAgo(n, h = 0) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, 0, 0, 0); return d;
}
function daysFromNow(n, h = 0) {
  const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, 0, 0, 0); return d;
}
function todayAt(h, m = 0) {
  const d = new Date(); d.setHours(h, m, 0, 0); return d;
}

// ─── 4 Package Templates ───────────────────────────────────────────────────────
const PKG_TEMPLATES = [
  {
    name: 'Gội rửa cơ bản',
    description: 'Rửa ngoại thất bằng bọt tuyết kết hợp chổi xoay tự động, xịt gầm áp lực cao, sấy khô và dưỡng lốp xe.',
    price: 99000, duration: 30, category: 'external',
    vehicleTypes: ['sedan', 'suv', 'pickup', 'van'],
    subServices: [
      { name: 'Phun bọt tuyết tự động', price: 0, duration: 5, isOptional: false },
      { name: 'Rửa vỏ xe chổi xoay', price: 0, duration: 10, isOptional: false },
      { name: 'Xịt rửa gầm áp lực cao', price: 0, duration: 5, isOptional: false },
      { name: 'Sấy khô & dưỡng lốp', price: 0, duration: 10, isOptional: false },
      { name: 'Hút bụi nội thất nhanh', price: 50000, duration: 10, isOptional: true },
      { name: 'Xịt nước hoa cabin', price: 20000, duration: 5, isOptional: true },
    ],
  },
  {
    name: 'Rửa sạch & phủ sáp',
    description: 'Rửa ngoại thất chuyên sâu, phủ sáp bóng nano bảo vệ sơn xe và vệ sinh nhanh nội thất.',
    price: 249000, duration: 55, category: 'external',
    vehicleTypes: ['sedan', 'suv', 'pickup', 'van'],
    subServices: [
      { name: 'Rửa bọt tuyết chuyên sâu', price: 0, duration: 15, isOptional: false },
      { name: 'Xịt gầm & rửa khoang máy', price: 0, duration: 10, isOptional: false },
      { name: 'Phủ sáp nano bảo vệ sơn', price: 0, duration: 15, isOptional: false },
      { name: 'Vệ sinh nội thất nhanh', price: 0, duration: 15, isOptional: false },
      { name: 'Đánh bóng đèn pha', price: 80000, duration: 15, isOptional: true },
      { name: 'Tẩy ố kính & nhựa đường', price: 100000, duration: 20, isOptional: true },
      { name: 'Phủ gầm chống gỉ', price: 200000, duration: 30, isOptional: true },
    ],
  },
  {
    name: 'Vệ sinh nội thất toàn diện',
    description: 'Giặt ghế da/nỉ, vệ sinh trần, bảng taplo, cửa, sàn xe và khử mùi ozon.',
    price: 399000, duration: 90, category: 'internal',
    vehicleTypes: ['sedan', 'suv'],
    subServices: [
      { name: 'Hút bụi & vệ sinh bảng đồng hồ', price: 0, duration: 15, isOptional: false },
      { name: 'Giặt ghế nỉ / bảo dưỡng da', price: 0, duration: 30, isOptional: false },
      { name: 'Vệ sinh trần, cửa & sàn xe', price: 0, duration: 25, isOptional: false },
      { name: 'Xông hơi khử mùi ozon', price: 0, duration: 20, isOptional: false },
      { name: 'Phủ nano chống bám bẩn ghế', price: 250000, duration: 30, isOptional: true },
      { name: 'Khử mùi sinh học cabin', price: 60000, duration: 10, isOptional: true },
    ],
  },
  {
    name: 'Chăm sóc VIP toàn diện',
    description: 'Gói cao cấp nhất: rửa xe, vệ sinh nội thất chi tiết, đánh bóng sơn, phủ ceramic và bảo dưỡng toàn xe.',
    price: 699000, duration: 150, category: 'full',
    vehicleTypes: ['sedan', 'suv', 'pickup', 'van'],
    subServices: [
      { name: 'Rửa xe bọt tuyết + xịt gầm', price: 0, duration: 20, isOptional: false },
      { name: 'Hút bụi & vệ sinh nội thất sâu', price: 0, duration: 30, isOptional: false },
      { name: 'Đánh bóng xóa xước sơn', price: 0, duration: 30, isOptional: false },
      { name: 'Phủ bóng ceramic bảo vệ sơn', price: 0, duration: 30, isOptional: false },
      { name: 'Dưỡng da & khử mùi nội thất', price: 0, duration: 20, isOptional: false },
      { name: 'Phủ nano toàn bộ kính lái', price: 300000, duration: 40, isOptional: true },
      { name: 'Phủ ceramic khoang máy', price: 200000, duration: 30, isOptional: true },
    ],
  },
];

// ─── 8 Branches ────────────────────────────────────────────────────────────────
const BRANCHES = [
  // ── TP.HCM (5 branches) ──
  {
    name: 'AutoWash Pro Quận 1',
    city: 'Hồ Chí Minh',
    image: '/branches/autowash_quan_1.jpg',
    address: '123 Nguyễn Thị Minh Khai, Phường 2, Quận 1, TP.HCM',
    phone: '028 3822 1111',
    email: 'q1@autowashpro.vn',
    openingTime: '07:00', closingTime: '19:00',
    location: { type: 'Point', coordinates: [106.6920, 10.7769] },
    mapCoordinates: { svgCx: 247, svgCy: 708 },
  },
  {
    name: 'AutoWash Pro Thủ Đức',
    city: 'Hồ Chí Minh',
    image: '/branches/autowash_thu_duc.jpg',
    address: '456 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP.HCM',
    phone: '028 3720 2222',
    email: 'thuduc@autowashpro.vn',
    openingTime: '07:00', closingTime: '20:00',
    location: { type: 'Point', coordinates: [106.7690, 10.8504] },
    mapCoordinates: { svgCx: 253, svgCy: 703 },
  },
  {
    name: 'AutoWash Pro Bình Thạnh',
    city: 'Hồ Chí Minh',
    image: '/branches/autowash_binh_thanh.jpg',
    address: '789 Điện Biên Phủ, Phường 11, Bình Thạnh, TP.HCM',
    phone: '028 3510 3333',
    email: 'binhthanh@autowashpro.vn',
    openingTime: '07:00', closingTime: '20:00',
    location: { type: 'Point', coordinates: [106.7130, 10.8010] },
    mapCoordinates: { svgCx: 250, svgCy: 706 },
  },
  {
    name: 'AutoWash Pro Gò Vấp',
    city: 'Hồ Chí Minh',
    image: '/branches/autowash_go_vap.jpg',
    address: '321 Phan Văn Trị, Phường 11, Gò Vấp, TP.HCM',
    phone: '028 3890 4444',
    email: 'govap@autowashpro.vn',
    openingTime: '07:00', closingTime: '19:30',
    location: { type: 'Point', coordinates: [106.6690, 10.8380] },
    mapCoordinates: { svgCx: 244, svgCy: 702 },
  },
  {
    name: 'AutoWash Pro Tân Phú',
    city: 'Hồ Chí Minh',
    image: '/branches/autowash_tan_phu.jpg',
    address: '55 Trường Chinh, Phường Tân Thới Nhất, Tân Phú, TP.HCM',
    phone: '028 3710 5555',
    email: 'tanphu@autowashpro.vn',
    openingTime: '07:00', closingTime: '20:00',
    location: { type: 'Point', coordinates: [106.6260, 10.7900] },
    mapCoordinates: { svgCx: 241, svgCy: 707 },
  },
  // ── Hà Nội (2 branches) ──
  {
    name: 'AutoWash Pro Cầu Giấy',
    city: 'Hà Nội',
    image: '/branches/autowash_cau_giay.jpg',
    address: '122 Cầu Giấy, Phường Quan Hoa, Cầu Giấy, Hà Nội',
    phone: '024 3822 6666',
    email: 'caugiay@autowashpro.vn',
    openingTime: '06:00', closingTime: '20:00',
    location: { type: 'Point', coordinates: [105.801, 21.032] },
    mapCoordinates: { svgCx: 190, svgCy: 128 },
  },
  {
    name: 'AutoWash Pro Thanh Xuân',
    city: 'Hà Nội',
    image: '/branches/autowash_tan_binh.jpg',
    address: '350 Nguyễn Trãi, Phường Thanh Xuân Trung, Thanh Xuân, Hà Nội',
    phone: '024 3510 7777',
    email: 'thanhxuan@autowashpro.vn',
    openingTime: '06:00', closingTime: '20:00',
    location: { type: 'Point', coordinates: [105.798, 20.995] },
    mapCoordinates: { svgCx: 197, svgCy: 135 },
  },
  // ── Đà Nẵng (1 branch) ──
  {
    name: 'AutoWash Pro Hải Châu',
    city: 'Đà Nẵng',
    image: '/branches/autowash_hai_chau.jpg',
    address: '120 Nguyễn Văn Linh, Phường Nam Dương, Hải Châu, Đà Nẵng',
    phone: '0236 3890 8888',
    email: 'haichau@autowashpro.vn',
    openingTime: '06:00', closingTime: '20:00',
    location: { type: 'Point', coordinates: [108.220, 16.054] },
    mapCoordinates: { svgCx: 309, svgCy: 403 },
  },
];

// ─── Admin + Managers + Customers ───────────────────────────────────────────────
const ADMIN = {
  name: 'Admin AutoWash', email: 'admin@washpro.vn',
  password: hash('123456'), phone: '0901000001', role: 'admin',
  status: 'active', tier: 'diamond', loyaltyPoints: 0, lifetimePoints: 0,
};

const MANAGERS = [
  { name: 'Nguyễn Quản Lý 1', email: 'manager1@washpro.vn', phone: '0901000002', branchIdx: 0 },
  { name: 'Trần Quản Lý 2',   email: 'manager2@washpro.vn', phone: '0901000003', branchIdx: 1 },
  { name: 'Lê Quản Lý 3',     email: 'manager3@washpro.vn', phone: '0901000004', branchIdx: 2 },
  { name: 'Phạm Quản Lý 4',   email: 'manager4@washpro.vn', phone: '0901000005', branchIdx: 3 },
  { name: 'Hoàng Quản Lý 5',  email: 'manager5@washpro.vn', phone: '0901000006', branchIdx: 4 },
  { name: 'Đặng Quản Lý 6',   email: 'manager6@washpro.vn', phone: '0901000007', branchIdx: 5 },
  { name: 'Vũ Quản Lý 7',     email: 'manager7@washpro.vn', phone: '0901000008', branchIdx: 6 },
  { name: 'Bùi Quản Lý 8',    email: 'manager8@washpro.vn', phone: '0901000009', branchIdx: 7 },
];

const CUSTOMERS = [
  { name: 'Nguyễn Văn An',     email: 'an.nguyen@gmail.com',       phone: '0912111001', tier: 'bronze',  points: 150,  lifetime: 150,  dob: '1995-03-15' },
  { name: 'Trần Thị Bích',     email: 'bich.tran@gmail.com',       phone: '0912111002', tier: 'silver',  points: 350,  lifetime: 550,  dob: '1992-07-22' },
  { name: 'Lê Văn Cường',      email: 'cuong.le@gmail.com',        phone: '0912111003', tier: 'gold',    points: 1500, lifetime: 3200, dob: '1988-11-08' },
  { name: 'Phạm Thị Dung',     email: 'binhtntse182370@fpt.edu.vn', phone: '0912111004', tier: 'diamond', points: 5000, lifetime: 12000, dob: '1998-01-15' },
  { name: 'Hoàng Văn Em',      email: 'em.hoang@gmail.com',        phone: '0912111005', tier: 'bronze',  points: 80,   lifetime: 80,   dob: '2000-09-05' },
];

// ─── Vehicles per Customer ───────────────────────────────────────────────────────
const VEHICLE_DATA = [
  // Nguyễn Văn An (3 xe)
  { custIdx: 0, plate: '51A-12345', type: 'sedan',  brand: 'Toyota',   model: 'Camry 2.0',     color: 'Trắng',      year: 2021, isDefault: true },
  { custIdx: 0, plate: '51A-99999', type: 'suv',    brand: 'Toyota',   model: 'Fortuner',       color: 'Bạc',        year: 2023, isDefault: false },
  { custIdx: 0, plate: '51A-88888', type: 'sedan',  brand: 'Mazda',    model: 'Mazda 3',        color: 'Đỏ',         year: 2022, isDefault: false },
  // Trần Thị Bích (3 xe)
  { custIdx: 1, plate: '59B-67890', type: 'suv',    brand: 'Honda',    model: 'CR-V 1.5T',      color: 'Đen',        year: 2022, isDefault: true },
  { custIdx: 1, plate: '59B-11199', type: 'sedan',  brand: 'Toyota',   model: 'Vios 1.5G',      color: 'Bạc',        year: 2021, isDefault: false },
  { custIdx: 1, plate: '59B-55555', type: 'suv',    brand: 'Hyundai',  model: 'Santa Fe',       color: 'Xanh đậm',   year: 2023, isDefault: false },
  // Lê Văn Cường (3 xe)
  { custIdx: 2, plate: '51C-11111', type: 'pickup', brand: 'Ford',     model: 'Ranger XLS',     color: 'Bạc',        year: 2023, isDefault: true },
  { custIdx: 2, plate: '51C-22222', type: 'suv',    brand: 'Mazda',    model: 'CX-5 2.0',       color: 'Đỏ',         year: 2022, isDefault: false },
  { custIdx: 2, plate: '51C-33333', type: 'sedan',  brand: 'BMW',      model: '320i Sport',     color: 'Trắng',      year: 2024, isDefault: false },
  // Phạm Thị Dung (3 xe)
  { custIdx: 3, plate: '51D-22222', type: 'sedan',  brand: 'Mercedes', model: 'C200 AMG',       color: 'Trắng ngọc', year: 2024, isDefault: true },
  { custIdx: 3, plate: '51D-33333', type: 'suv',    brand: 'BMW',      model: 'X3 20d',         color: 'Xanh rêu',   year: 2024, isDefault: false },
  { custIdx: 3, plate: '51D-44444', type: 'sedan',  brand: 'Lexus',    model: 'ES 300h',        color: 'Đen',        year: 2023, isDefault: false },
  // Hoàng Văn Em (2 xe)
  { custIdx: 4, plate: '79E-33333', type: 'sedan',  brand: 'Hyundai',  model: 'Grand i10',      color: 'Xanh dương', year: 2023, isDefault: true },
  { custIdx: 4, plate: '79E-44444', type: 'sedan',  brand: 'Kia',      model: 'Morning',        color: 'Đỏ',         year: 2025, isDefault: false },
];

// ─── Bookings ────────────────────────────────────────────────────────────────────
const BOOKING_DATA = [
  // Hôm nay — Thủ Đức (branch idx 1) — nhiều booking nhất
  { custIdx: 3, brIdx: 1, start: '08:00', end: '08:30', status: 'completed', bType: 'single', price: 99000,   payStatus: 'paid',   payMethod: 'cash', rating: 5 },
  { custIdx: 0, brIdx: 1, start: '09:00', end: '09:30', status: 'confirmed', bType: 'single', price: 99000,   payStatus: 'unpaid' },
  { custIdx: 1, brIdx: 1, start: '10:00', end: '10:55', status: 'in_progress', bType: 'single', price: 249000, payStatus: 'paid',   payMethod: 'momo', checkIn: true },
  { custIdx: 2, brIdx: 1, start: '11:00', end: '12:30', status: 'checked_in', bType: 'single', price: 399000, payStatus: 'paid',   payMethod: 'bank', checkIn: true },
  { custIdx: 4, brIdx: 1, start: '13:00', end: '13:30', status: 'pending',   bType: 'single', price: 99000,   payStatus: 'unpaid' },
  { custIdx: 3, brIdx: 1, start: '14:00', end: '14:55', status: 'pending',   bType: 'single', price: 249000,  payStatus: 'unpaid' },
  { custIdx: 3, brIdx: 1, start: '15:30', end: '18:00', status: 'pending',   bType: 'single', price: 699000,  payStatus: 'unpaid' },
  // Quận 1 (branch idx 0)
  { custIdx: 0, brIdx: 0, start: '09:00', end: '09:30', status: 'completed', bType: 'single', price: 99000,   payStatus: 'paid',   payMethod: 'cash', rating: 4 },
  { custIdx: 1, brIdx: 0, start: '10:00', end: '10:55', status: 'completed', bType: 'single', price: 249000,  payStatus: 'paid',   payMethod: 'vnpay', rating: 5 },
  { custIdx: 2, brIdx: 0, start: '14:00', end: '14:55', status: 'confirmed', bType: 'single', price: 249000,  payStatus: 'unpaid' },
  { custIdx: 4, brIdx: 0, start: '16:00', end: '16:30', status: 'pending',   bType: 'single', price: 99000,   payStatus: 'unpaid' },
  // Bình Thạnh (branch idx 2)
  { custIdx: 3, brIdx: 2, start: '08:30', end: '09:25', status: 'completed', bType: 'single', price: 249000,  payStatus: 'paid', payMethod: 'momo', rating: 5 },
  { custIdx: 0, brIdx: 2, start: '10:30', end: '11:00', status: 'confirmed', bType: 'single', price: 99000,  payStatus: 'unpaid' },
  // Gò Vấp (branch idx 3)
  { custIdx: 1, brIdx: 3, start: '09:30', end: '11:00', status: 'completed', bType: 'single', price: 399000, payStatus: 'paid', payMethod: 'cash', rating: 4 },
  { custIdx: 2, brIdx: 3, start: '14:00', end: '14:30', status: 'pending',   bType: 'single', price: 99000,  payStatus: 'unpaid' },
  // Tân Phú (branch idx 4)
  { custIdx: 4, brIdx: 4, start: '08:00', end: '08:30', status: 'checked_in', bType: 'single', price: 99000,  payStatus: 'paid', payMethod: 'bank', checkIn: true },
  { custIdx: 3, brIdx: 4, start: '11:00', end: '13:30', status: 'confirmed',  bType: 'single', price: 699000, payStatus: 'deposit_paid' },
  // Cầu Giấy Hà Nội (branch idx 5)
  { custIdx: 0, brIdx: 5, start: '09:00', end: '09:30', status: 'completed', bType: 'single', price: 99000,  payStatus: 'paid', payMethod: 'cash', rating: 5 },
  { custIdx: 1, brIdx: 5, start: '10:00', end: '10:55', status: 'pending',   bType: 'single', price: 249000, payStatus: 'unpaid' },
  // Thanh Xuân Hà Nội (branch idx 6)
  { custIdx: 2, brIdx: 6, start: '14:30', end: '15:25', status: 'completed', bType: 'single', price: 249000, payStatus: 'paid', payMethod: 'vnpay', rating: 4 },
  { custIdx: 4, brIdx: 6, start: '16:00', end: '16:30', status: 'pending',   bType: 'single', price: 99000,  payStatus: 'unpaid' },
  // Hải Châu Đà Nẵng (branch idx 7)
  { custIdx: 3, brIdx: 7, start: '08:00', end: '08:55', status: 'completed', bType: 'single', price: 249000, payStatus: 'paid', payMethod: 'momo', rating: 5 },
  { custIdx: 0, brIdx: 7, start: '10:00', end: '10:30', status: 'pending',   bType: 'single', price: 99000,  payStatus: 'unpaid' },

  // Quá khứ — Thủ Đức (nhiều booking cũ)
  { custIdx: 3, brIdx: 1, start: '08:00', end: '08:30', status: 'completed', bType: 'single', price: 99000,  payStatus: 'paid', payMethod: 'cash', rating: 5, daysAgo: 3 },
  { custIdx: 3, brIdx: 1, start: '10:00', end: '10:55', status: 'completed', bType: 'single', price: 249000, payStatus: 'paid', payMethod: 'momo', rating: 4, daysAgo: 7 },
  { custIdx: 3, brIdx: 1, start: '14:00', end: '16:30', status: 'completed', bType: 'single', price: 699000, payStatus: 'paid', payMethod: 'bank', rating: 5, daysAgo: 14 },
  { custIdx: 1, brIdx: 1, start: '09:00', end: '09:30', status: 'completed', bType: 'single', price: 99000,  payStatus: 'paid', payMethod: 'cash', rating: 4, daysAgo: 5 },
  { custIdx: 2, brIdx: 1, start: '11:00', end: '12:30', status: 'completed', bType: 'single', price: 399000, payStatus: 'paid', payMethod: 'vnpay', rating: 5, daysAgo: 10 },

  // Tương lai
  { custIdx: 3, brIdx: 1, start: '09:00', end: '09:30', status: 'pending', bType: 'slot_pack_usage', price: 0, payStatus: 'paid', daysFromNow: 2 },
  { custIdx: 3, brIdx: 1, start: '09:00', end: '09:30', status: 'pending', bType: 'slot_pack_usage', price: 0, payStatus: 'paid', daysFromNow: 5 },
];

// ─── Voucher per Branch ──────────────────────────────────────────────────────────
function makeVoucherCode(branchIdx, idx) {
  const prefixes = ['Q1', 'TD', 'BT', 'GV', 'TP', 'CG', 'TX', 'HC'];
  const names = ['GIAM10', 'GIAM50K', 'MIENPHI'];
  return `AWP${prefixes[branchIdx]}${names[idx]}`;
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected\n');

  console.log('Clearing collections...');
  await User.deleteMany({});
  await Branch.deleteMany({});
  await Package.deleteMany({});
  await Vehicle.deleteMany({});
  await Booking.deleteMany({});
  await Voucher.deleteMany({});
  await SlotPack.deleteMany({});

  // ── 1. Users ──────────────────────────────────────────────────────────────
  console.log('Seeding users...');

  const adminId = oid();
  const mgrIds = Array.from({ length: 8 }, () => oid());
  const custIds = Array.from({ length: 5 }, () => oid());

  const users = [
    { _id: adminId, ...ADMIN },
    ...MANAGERS.map((m, i) => ({
      _id: mgrIds[i], name: m.name, email: m.email,
      password: hash('123456'), phone: m.phone, role: 'manager',
      status: 'active', tier: 'bronze', loyaltyPoints: 0, lifetimePoints: 0,
      branchId: null,
    })),
    ...CUSTOMERS.map((c, i) => ({
      _id: custIds[i], name: c.name, email: c.email,
      password: hash('123456'), phone: c.phone, role: 'customer',
      status: 'active', tier: c.tier, loyaltyPoints: c.points, lifetimePoints: c.lifetime,
      dateOfBirth: new Date(c.dob),
    })),
  ];

  await User.insertMany(users);
  console.log(`  ✓ ${users.length} users`);

  // ── 2. Branches ──────────────────────────────────────────────────────────
  console.log('Seeding 8 branches...');
  const branchDocs = BRANCHES.map((b, i) => ({
    ...b, status: 'active', managerId: mgrIds[i],
  }));
  const branches = await Branch.insertMany(branchDocs);
  console.log(`  ✓ ${branches.length} branches`);

  for (let i = 0; i < branches.length; i++) {
    await User.findByIdAndUpdate(mgrIds[i], { branchId: branches[i]._id });
  }

  // ── 3. Packages ──────────────────────────────────────────────────────────
  console.log('Seeding packages (4 per branch)...');
  const allPackages = [];
  for (const branch of branches) {
    for (const tpl of PKG_TEMPLATES) {
      allPackages.push({
        name: tpl.name, description: tpl.description,
        price: tpl.price, duration: tpl.duration,
        category: tpl.category, vehicleTypes: tpl.vehicleTypes,
        subServices: tpl.subServices,
        branchId: branch._id, status: 'active',
      });
    }
  }
  const pkgDocs = await Package.insertMany(allPackages);
  console.log(`  ✓ ${pkgDocs.length} packages`);

  // ── 4. Vehicles ──────────────────────────────────────────────────────────
  console.log('Seeding vehicles (2-3 per customer)...');
  const vehicleDocs = await Vehicle.insertMany(
    VEHICLE_DATA.map(v => ({
      userId: custIds[v.custIdx],
      licensePlate: v.plate,
      vehicleType: v.type,
      brand: v.brand,
      model: v.model,
      color: v.color,
      year: v.year,
      isDefault: v.isDefault,
    }))
  );
  console.log(`  ✓ ${vehicleDocs.length} vehicles`);

  // ── 5. Bookings ──────────────────────────────────────────────────────────
  console.log('Seeding bookings (many at Thủ Đức)...');

  // Map package per branch: find package by branchId and index (0-3)
  function getPkg(branchId, pkgIdx) {
    return pkgDocs.find(p => p.branchId.equals(branchId) && p.name === PKG_TEMPLATES[pkgIdx].name);
  }

  const bookings = [];
  BOOKING_DATA.forEach((b, idx) => {
    const branch = branches[b.brIdx];
    const customerId = custIds[b.custIdx];
    const customerVehicles = vehicleDocs.filter(v => v.userId.equals(customerId));
    const vehicle = customerVehicles[0] || vehicleDocs[0];
    const pkgIdx = [0, 1, 2, 3].find(pi => b.price === PKG_TEMPLATES[pi].price) || 0;
    const pkg = getPkg(branch._id, pkgIdx);

    const bookingDate = b.daysAgo ? daysAgo(b.daysAgo) : (b.daysFromNow ? daysFromNow(b.daysFromNow) : daysAgo(0));

    bookings.push({
      userId: customerId,
      branchId: branch._id,
      packageId: pkg._id,
      vehicleId: vehicle._id,
      bookingDate,
      startTime: b.start,
      endTime: b.end,
      status: b.status,
      bookingType: b.bType || 'single',
      priority: [1, 2, 3, 4][b.custIdx],
      finalPrice: b.price,
      paymentStatus: b.payStatus,
      paymentMethod: b.payMethod || undefined,
      checkInTime: b.checkIn ? todayAt(parseInt(b.start.split(':')[0]), parseInt(b.start.split(':')[1])) : undefined,
      rating: b.rating || undefined,
      feedback: b.rating ? ['Tuyệt vời!', 'Sạch sẽ, nhanh gọn', 'Phục vụ tốt', 'Hài lòng'][b.rating - 1] || null : undefined,
      feedbackAt: b.rating ? bookingDate : undefined,
    });
  });
  await Booking.insertMany(bookings);
  console.log(`  ✓ ${bookings.length} bookings`);

  // ── 6. Vouchers (2-3 per branch) ────────────────────────────────────────
  console.log('Seeding vouchers (2-3 per branch)...');
  const voucherDocs = [];
  branches.forEach((branch, bi) => {
    const branchVouchers = [
      {
        code: makeVoucherCode(bi, 0),
        name: `Giảm 10% tại ${branch.name}`,
        description: `Giảm 10% cho tất cả gói dịch vụ tại ${branch.name}.`,
        type: 'percentage', value: 10, maxDiscount: 50000, minOrder: 100000,
        quantity: 100, remaining: 85,
        startDate: new Date('2025-01-01'), endDate: new Date('2027-12-31'),
        applicableToAllPackages: true,
        applicableBranches: [branch._id],
        status: 'active', createdBy: adminId, maxUsagePerUser: 2,
      },
      {
        code: makeVoucherCode(bi, 1),
        name: `Giảm 50.000đ tại ${branch.name}`,
        description: `Giảm 50.000đ cho đơn từ 200.000đ tại ${branch.name}.`,
        type: 'fixed', value: 50000, minOrder: 200000,
        quantity: 50, remaining: 38,
        startDate: new Date('2025-01-01'), endDate: new Date('2027-12-31'),
        applicableToAllPackages: true,
        applicableBranches: [branch._id],
        status: 'active', createdBy: adminId, maxUsagePerUser: 3,
      },
    ];
    // Thêm voucher thứ 3 cho 4 branch đầu
    if (bi < 4) {
      branchVouchers.push({
        code: makeVoucherCode(bi, 2),
        name: `Miễn phí dịch vụ lẻ tại ${branch.name}`,
        description: `Miễn phí 1 dịch vụ lẻ bất kỳ (tối đa 100.000đ) khi đặt gói Rửa sạch & phủ sáp tại ${branch.name}.`,
        type: 'fixed', value: 100000, minOrder: 249000,
        quantity: 30, remaining: 22,
        startDate: new Date('2025-06-01'), endDate: new Date('2027-12-31'),
        applicableToAllPackages: false,
        applicableBranches: [branch._id],
        status: 'active', createdBy: adminId, maxUsagePerUser: 1,
      });
    }
    voucherDocs.push(...branchVouchers);
  });
  await Voucher.insertMany(voucherDocs);
  console.log(`  ✓ ${voucherDocs.length} vouchers`);

  // ── 7. Slot Packs for Phạm Thị Dung at Thủ Đức ─────────────────────────
  console.log('Seeding slot packs (Phạm Thị Dung @ Thủ Đức)...');
  const thuDucBranch = branches[1];
  const dungUserId = custIds[3];
  const dungVehicles = vehicleDocs.filter(v => v.userId.equals(dungUserId));
  const thuDucPkgs = pkgDocs.filter(p => p.branchId.equals(thuDucBranch._id));

  const slotPackData = [
    {
      userId: dungUserId, branchId: thuDucBranch._id,
      packageId: thuDucPkgs[0]._id, vehicleId: dungVehicles[0]._id,
      totalSlots: 10, remainingSlots: 7, usedSlots: 3,
      unitPrice: 99000, discountPercent: 10, discountAmount: 99000,
      finalPrice: 891000, finalPriceAfterVoucher: 891000,
      packCode: 'SP-DUNG-TD1', priority: 4,
      status: 'active', paymentStatus: 'paid', paidAt: daysAgo(20),
      expiresAt: daysFromNow(180),
    },
    {
      userId: dungUserId, branchId: thuDucBranch._id,
      packageId: thuDucPkgs[1]._id, vehicleId: dungVehicles[0]._id,
      totalSlots: 5, remainingSlots: 5, usedSlots: 0,
      unitPrice: 249000, discountPercent: 5, discountAmount: 62250,
      finalPrice: 1182750, finalPriceAfterVoucher: 1132750,
      voucherCode: makeVoucherCode(1, 0), voucherDiscount: 50000,
      packCode: 'SP-DUNG-TD2', priority: 4,
      status: 'active', paymentStatus: 'paid', paidAt: daysAgo(5),
      expiresAt: daysFromNow(365),
    },
    {
      userId: dungUserId, branchId: thuDucBranch._id,
      packageId: thuDucPkgs[0]._id, vehicleId: dungVehicles[1]._id,
      totalSlots: 20, remainingSlots: 20, usedSlots: 0,
      unitPrice: 99000, discountPercent: 15, discountAmount: 297000,
      finalPrice: 1683000, finalPriceAfterVoucher: 1683000,
      packCode: 'SP-DUNG-TD3', priority: 4,
      status: 'active', paymentStatus: 'unpaid',
    },
  ];

  await SlotPack.insertMany(slotPackData);
  console.log(`  ✓ ${slotPackData.length} slot packs`);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  TÀI KHOẢN TEST (password: 123456)');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  [ADMIN]    admin@washpro.vn`);
  MANAGERS.forEach((m, i) => console.log(`  [MANAGER]  ${m.email.padEnd(30)} → ${BRANCHES[i].name}`));
  CUSTOMERS.forEach(c => console.log(`  [CUSTOMER] ${c.email.padEnd(30)} (${c.tier})`));
  console.log('');
  console.log(`  VOUCHERS: ${voucherDocs.length} vouchers (2-3 per branch)`);
  console.log(`  SLOT PACKS: ${slotPackData.length} packs cho Phạm Thị Dung @ Thủ Đức`);
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  Đã tạo: ${users.length} users, ${branches.length} branches, ${pkgDocs.length} packages, ${vehicleDocs.length} vehicles, ${bookings.length} bookings, ${voucherDocs.length} vouchers, ${slotPackData.length} slot packs`);
  console.log('');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('\n❌ Seed thất bại:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
