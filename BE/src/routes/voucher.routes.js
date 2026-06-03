const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../utils/helpers');
const { voucherValidators } = require('../utils/validators');
const voucherController = require('../controllers/voucher.controller');
const { ROLES } = require('../config/permissions');

router.post('/', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), voucherValidators.create, validate, voucherController.createVoucher);
router.get('/', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), voucherController.getAllVouchers);
router.get('/me', authenticate, voucherController.getUserVouchers);
router.get('/code/:code', authenticate, voucherController.getVoucherByCode);
router.get('/usage/:id', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), voucherController.getVoucherUsage);
router.get('/:id', authenticate, voucherController.getVoucherById);
router.put('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), voucherValidators.update, validate, voucherController.updateVoucher);
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), voucherController.deleteVoucher);
router.post('/validate', authenticate, voucherValidators.validate, validate, voucherController.validateVoucher);
router.post('/redeem-points', authenticate, voucherController.redeemPoints);

// Reserve voucher when payment is created (any authenticated user: customer, admin, manager)
router.post('/reserve', authenticate, voucherValidators.reserve, validate, voucherController.reserveVoucher);

// Rollback voucher when payment fails
router.post('/rollback', authenticate, voucherValidators.rollback, validate, voucherController.rollbackVoucher);

module.exports = router;
