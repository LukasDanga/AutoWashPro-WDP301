const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../utils/helpers');
const { voucherValidators } = require('../utils/validators');
const voucherController = require('../controllers/voucher.controller');
const { ROLES } = require('../config/permissions');

/**
 * @swagger
 * /api/vouchers:
 *   post:
 *     summary: Create voucher (admin/manager)
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), voucherValidators.create, validate, voucherController.createVoucher);

/**
 * @swagger
 * /api/vouchers:
 *   get:
 *     summary: Get all vouchers
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, voucherController.getAllVouchers);

/**
 * @swagger
 * /api/vouchers/code/{code}:
 *   get:
 *     summary: Get voucher by code
 *     tags: [Vouchers]
 */
router.get('/code/:code', authenticate, voucherController.getVoucherByCode);

/**
 * @swagger
 * /api/vouchers/{id}:
 *   get:
 *     summary: Get voucher by ID
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, voucherController.getVoucherById);

/**
 * @swagger
 * /api/vouchers/{id}:
 *   put:
 *     summary: Update voucher (admin/manager)
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), voucherValidators.update, validate, voucherController.updateVoucher);

/**
 * @swagger
 * /api/vouchers/{id}:
 *   delete:
 *     summary: Delete voucher (admin only)
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), voucherController.deleteVoucher);

/**
 * @swagger
 * /api/vouchers/validate:
 *   post:
 *     summary: Validate voucher for a booking
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 */
router.post('/validate', authenticate, voucherValidators.validate, validate, voucherController.validateVoucher);

/**
 * @swagger
 * /api/vouchers/redeem:
 *   post:
 *     summary: Redeem voucher (use after payment)
 *     tags: [Vouchers]
 *     security:
 *       - bearerAuth: []
 */
router.post('/redeem', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), voucherController.redeemVoucher);

module.exports = router;
