const { Gift, User, Voucher } = require('../models');
const mongoose = require('mongoose');

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
    if (selectedGift && selectedGift.type !== 'none') {
      // Create a unique voucher for the user
      const code = `WHEEL${Date.now().toString().slice(-6)}${Math.floor(Math.random()*1000)}`;
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // Valid for 30 days

      const vData = {
        code,
        name: `Quà từ vòng quay: ${selectedGift.name}`,
        description: `Chúc mừng bạn đã trúng thưởng từ vòng quay may mắn!`,
        type: selectedGift.type,
        value: selectedGift.value,
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
