const authRoutes = require('./authRoutes');
const vehiclesRoutes = require('./vehiclesRoutes');
const branchRoutes = require('./branch.routes');
const packageRoutes = require('./package.routes');
const bookingRoutes = require('./booking.routes');
const paymentRoutes = require('./payment.routes');
const voucherRoutes = require('./voucher.routes');
const checkinRoutes = require('./checkin.routes');
const notificationRoutes = require('./notification.routes');
const slotPackRoutes = require('./slotPack.routes');

module.exports = {
  authRoutes,
  vehiclesRoutes,
  branchRoutes,
  packageRoutes,
  bookingRoutes,
  paymentRoutes,
  voucherRoutes,
  checkinRoutes,
  notificationRoutes,
  slotPackRoutes,
};
