const { SlotProduct } = require('../models');

exports.getPublicSlotProducts = async () => {
  return SlotProduct.find({ status: 'active' }).sort({ sortOrder: 1, price: 1 });
};
