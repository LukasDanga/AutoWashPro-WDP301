const { Gift } = require('../models');

exports.getPublicGifts = async () => {
  return Gift.find({ status: 'active' }).sort({ sortOrder: 1, price: 1 });
};
