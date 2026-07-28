/**
 * AutoWashPro — Seed gói lượt đã mua cho huongne
 * Run: node scripts/seed-huongne-slot-packs.js
 *
 * Tạo gói lượt cho huongne@gmail.com để test đặt lịch nhanh bằng gói lượt.
 *
 * Yêu cầu: đã chạy seed-full.js và seed-paid-bookings.js.
 * Gói tuân theo discount của SlotPack service.
 */

require('dotenv').config();
require('../src/config/dns');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI;

const User     = require('../src/models/user.schema');
const Package  = require('../src/models/package.schema');
const Vehicle  = require('../src/models/vehicle.schema');
const SlotPack = require('../src/models/slotPack.schema');
const Payment  = require('../src/models/payment.schema');

const TIER_PRIORITY = { bronze: 1, silver: 2, gold: 3, diamond: 4 };

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(7, 0, 0, 0); return d;
}
function daysFromNow(n) {
  const d = new Date(); d.setDate(d.getDate() + n); d.setHours(7, 0, 0, 0); return d;
}

function generatePackCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'SP-HN-';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function getDiscountPercent(totalSlots, tier) {
  let pct = 0;
  if (totalSlots >= 20) pct = 15;
  else if (totalSlots >= 10) pct = 10;
  else if (totalSlots >= 5) pct = 5;
  if (tier === 'diamond') pct += 10;
  else if (tier === 'gold') pct += 5;
  return Math.min(pct, 100);
}

function calcPack(pkg, totalSlots, usedSlots, tier) {
  const discountPercent = getDiscountPercent(totalSlots, tier);
  const gross = pkg.price * totalSlots;
  const discount = Math.floor(gross * discountPercent / 100);
  const final = gross - discount;
  return {
    totalSlots, remainingSlots: totalSlots - usedSlots, usedSlots,
    unitPrice: pkg.price, discountPercent, discountAmount: discount,
    finalPrice: final, finalPriceAfterVoucher: final,
  };
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // ── Find huongne ──
  const huongne = await User.findOne({ email: 'huongne@gmail.com' });
  if (!huongne) { console.error('huongne not found'); process.exit(1); }
  console.log(`Found: ${huongne.name} (${huongne.email}) — tier: ${huongne.tier}`);

  const priority = TIER_PRIORITY[huongne.tier] || 1;

  // ── Find her vehicles ──
  const vehicles = await Vehicle.find({ userId: huongne._id });
  if (!vehicles.length) { console.error('No vehicles found'); process.exit(1); }
  console.log(`Vehicles: ${vehicles.length}`);

  // ── Find packages by name (any branch) ──
  const basicWash  = await Package.findOne({ name: 'Rửa ô tô cơ bản',         status: 'active' });
  const polishPack = await Package.findOne({ name: 'Đánh bóng sơn ô tô nhanh', status: 'active' });
  const nanoWash   = await Package.findOne({ name: 'Rửa ô tô + Phủ Nano',      status: 'active' });

  if (!basicWash || !polishPack || !nanoWash) {
    console.error('Missing packages — run seed-full.js first');
    process.exit(1);
  }

  // ── Compute 3 slot packs ──
  // 1) Rửa cơ bản — 10 slots, 2 used (8 remaining)
  const p1 = calcPack(basicWash, 10, 2, huongne.tier);
  const sp1 = {
    userId: huongne._id, branchId: basicWash.branchId, packageId: basicWash._id,
    vehicleId: vehicles[0]._id,
    totalSlots: p1.totalSlots, remainingSlots: p1.remainingSlots, usedSlots: p1.usedSlots,
    unitPrice: p1.unitPrice, discountPercent: p1.discountPercent,
    discountAmount: p1.discountAmount, finalPrice: p1.finalPrice,
    finalPriceAfterVoucher: p1.finalPriceAfterVoucher,
    priority, packCode: generatePackCode(), status: 'active',
    paymentStatus: 'paid', paidAt: daysAgo(15), expiresAt: daysFromNow(180),
  };

  // 2) Đánh bóng sơn nhanh — 5 slots, 0 used (5 remaining)
  const p2 = calcPack(polishPack, 5, 0, huongne.tier);
  const sp2 = {
    userId: huongne._id, branchId: polishPack.branchId, packageId: polishPack._id,
    vehicleId: vehicles[0]._id,
    totalSlots: p2.totalSlots, remainingSlots: p2.remainingSlots, usedSlots: p2.usedSlots,
    unitPrice: p2.unitPrice, discountPercent: p2.discountPercent,
    discountAmount: p2.discountAmount, finalPrice: p2.finalPrice,
    finalPriceAfterVoucher: p2.finalPriceAfterVoucher,
    priority, packCode: generatePackCode(), status: 'active',
    paymentStatus: 'paid', paidAt: daysAgo(7), expiresAt: daysFromNow(90),
  };

  // 3) Rửa + Phủ Nano — 20 slots, 3 used (17 remaining)
  const p3 = calcPack(nanoWash, 20, 3, huongne.tier);
  const vehId = vehicles.length > 1 ? vehicles[1]._id : vehicles[0]._id;
  const sp3 = {
    userId: huongne._id, branchId: nanoWash.branchId, packageId: nanoWash._id,
    vehicleId: vehId,
    totalSlots: p3.totalSlots, remainingSlots: p3.remainingSlots, usedSlots: p3.usedSlots,
    unitPrice: p3.unitPrice, discountPercent: p3.discountPercent,
    discountAmount: p3.discountAmount, finalPrice: p3.finalPrice,
    finalPriceAfterVoucher: p3.finalPriceAfterVoucher,
    priority, packCode: generatePackCode(), status: 'active',
    paymentStatus: 'paid', paidAt: daysAgo(30), expiresAt: daysFromNow(365),
  };

  // ── Clear old slot packs for huongne ──
  await SlotPack.deleteMany({ userId: huongne._id });
  console.log('Cleared existing slot packs');

  const slotPacks = await SlotPack.insertMany([sp1, sp2, sp3]);
  console.log(`Inserted ${slotPacks.length} slot packs`);

  // ── Payments ──
  await Payment.deleteMany({ slotPackId: { $in: slotPacks.map(sp => sp._id) } });
  const payments = slotPacks.map(sp => ({
    slotPackId: sp._id, userId: huongne._id,
    amount: sp.finalPrice, method: 'bank', status: 'paid',
    paidAt: sp.paidAt, transactionId: 'PAY-SP-' + sp.packCode.replace('SP-', ''),
  }));
  await Payment.insertMany(payments);
  console.log(`Inserted ${payments.length} payment records`);

  // ── Summary ──
  console.log('\n=== GÓI LƯỢT ĐÃ MUA — huongne ===');
  for (const sp of slotPacks) {
    const pkg = [basicWash, polishPack, nanoWash].find(p => String(p._id) === String(sp.packageId));
    console.log(`  ${sp.packCode} | ${pkg?.name} | ${sp.remainingSlots}/${sp.totalSlots} lượt còn | ${sp.finalPrice.toLocaleString('vi-VN')}đ | ${sp.status}`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(err => { console.error(err); process.exit(1); });
