const { Gift, User, Voucher } = require('../models');
const mongoose = require('mongoose');
const Notification = require('../models/notification.schema');
const notificationService = require('./notification.service');

exports.getPublicGifts = async () => {
  return Gift.find({ status: 'active' }).sort({ sortOrder: 1, createdAt: 1 });
};

exports.getAllGifts = async () => {
  return Gift.find().sort({ sortOrder: 1, createdAt: 1 });
};

exports.createGift = async (data) => {
  return Gift.create(data);
};

exports.updateGift = async (id, data) => {
  const gift = await Gift.findByIdAndUpdate(id, data, { new: true });
  if (!gift) throw Object.assign(new Error('Gift not found'), { statusCode: 404 });
  return gift;
};

exports.deleteGift = async (id) => {
  const gift = await Gift.findByIdAndDelete(id);
  if (!gift) throw Object.assign(new Error('Gift not found'), { statusCode: 404 });
  return gift;
};

exports.spinWheel = async (userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
    
    if (user.spinCount <= 0) {
      throw Object.assign(new Error('No spins left'), { statusCode: 400 });
    }

    const gifts = await Gift.find({ status: 'active' }).session(session);
    if (!gifts.length) {
      throw Object.assign(new Error('No prizes available'), { statusCode: 400 });
    }

    // Decrement spin count
    user.spinCount -= 1;
    await user.save({ session });

    // Randomize based on probability
    let totalProb = 0;
    for (const g of gifts) totalProb += (g.probability || 0);

    let random = Math.random() * totalProb;
    let selectedGift = gifts[gifts.length - 1]; // fallback
    for (const g of gifts) {
      if (random < (g.probability || 0)) {
        selectedGift = g;
        break;
      }
      random -= (g.probability || 0);
    }

    let createdVoucher = null;
    const isRealPrize = selectedGift && !/may\s*mắn|không\s*trúng/i.test(selectedGift.name || '');

    if (isRealPrize) {
      // Create a unique voucher / prize item for the user
      const code = `WHEEL${Date.now().toString().slice(-6)}${Math.floor(Math.random()*1000)}`;
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // Valid for 30 days

      const vData = {
        code,
        name: `Quà từ vòng quay: ${selectedGift.name}`,
        description: `Chúc mừng bạn đã trúng quà "${selectedGift.name}" từ vòng quay may mắn!`,
        type: selectedGift.type === 'none' ? 'fixed' : selectedGift.type,
        value: selectedGift.value || 0,
        quantity: 1,
        remaining: 1,
        startDate: now,
        endDate: endDate,
        status: 'active',
        assignedTo: userId,
        maxUsagePerUser: 1,
        isTemplate: false,
        applicableToAllBranches: true,
        applicableToAllPackages: true
      };
      
      const v = new Voucher(vData);
      await v.save({ session });
      createdVoucher = v;
    }

    await session.commitTransaction();
    
    if (createdVoucher && selectedGift) {
      notificationService.send(
        userId, 
        'Trúng thưởng vòng quay', 
        `Chúc mừng! Bạn đã trúng ${selectedGift.name}. Voucher đã được thêm vào tài khoản của bạn.`, 
        'spin_won', 
        { giftId: selectedGift._id, voucherCode: createdVoucher.code }
      ).catch(() => {});
    }
    
    return {
      spinCount: user.spinCount,
      prize: selectedGift,
      voucher: createdVoucher
    };
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    session.endSession();
  }
};

exports.getMySpinHistory = async (userId) => {
  const wonVouchers = await Voucher.find({
    assignedTo: userId,
    $or: [
      { name: { $regex: /^Quà từ vòng quay/i } },
      { code: { $regex: /^WHEEL/i } }
    ]
  }).sort({ createdAt: -1 });

  const historyMap = new Map();

  wonVouchers.forEach(v => {
    historyMap.set(v.code, {
      _id: v._id,
      name: v.name.replace(/^Quà từ vòng quay:\s*/i, ''),
      code: v.code,
      type: v.type,
      value: v.value,
      wonAt: v.createdAt || v.startDate,
      endDate: v.endDate,
      status: v.remaining <= 0 ? 'used' : (new Date(v.endDate) < new Date() ? 'expired' : 'active')
    });
  });

  try {
    const spinNotifs = await Notification.find({
      userId,
      type: 'spin_won'
    }).sort({ createdAt: -1 });

    spinNotifs.forEach(n => {
      const code = n.data?.voucherCode || `NOTIF_${n._id}`;
      if (!historyMap.has(code)) {
        let prizeName = 'Quà tặng vòng quay';
        const match = n.message?.match(/trúng\s+([^.]+)\./i);
        if (match && match[1]) {
          prizeName = match[1].trim();
        }

        historyMap.set(code, {
          _id: n._id,
          name: prizeName,
          code: code.startsWith('NOTIF_') ? 'WHEEL_BONUS' : code,
          type: 'fixed',
          value: 0,
          wonAt: n.createdAt,
          endDate: null,
          status: 'active'
        });
      }
    });
  } catch (e) {
    console.error('Error loading spin notifications fallback:', e);
  }

  return Array.from(historyMap.values()).sort((a, b) => new Date(b.wonAt) - new Date(a.wonAt));
};
