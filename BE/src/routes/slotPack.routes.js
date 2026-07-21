const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../utils/helpers');
const { body, param, query } = require('express-validator');
const slotPackController = require('../controllers/slotPack.controller');
const { ROLES } = require('../config/permissions');

// ─── Validators ───────────────────────────────────────────────────────────────

const createValidators = [
  body('branchId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid branch ID'),
  body('packageId').isMongoId().withMessage('Invalid package ID'),
  body('vehicleId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid vehicle ID'),
  body('totalSlots').isInt({ min: 1, max: 50 }).withMessage('totalSlots must be between 1 and 50'),
  body('voucherCode').optional().trim().isLength({ max: 50 }),
  body('expiresAt').optional().isISO8601().withMessage('Invalid expiry date'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/slot-packs/preview:
 *   get:
 *     summary: Preview chiết khấu theo số lượng slot
 *     tags: [SlotPacks]
 *     parameters:
 *       - in: query
 *         name: totalSlots
 *         required: true
 *       - in: query
 *         name: unitPrice
 *         required: true
 */
router.get('/preview', slotPackController.previewDiscount);

/**
 * @swagger
 * /api/slot-packs:
 *   post:
 *     summary: Tạo gói slot mới (customer)
 *     tags: [SlotPacks]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, authorize(ROLES.CUSTOMER, ROLES.ADMIN, ROLES.MANAGER), createValidators, validate, slotPackController.createSlotPack);

/**
 * @swagger
 * /api/slot-packs/my:
 *   get:
 *     summary: Lấy danh sách gói slot của tôi
 *     tags: [SlotPacks]
 *     security:
 *       - bearerAuth: []
 */
router.get('/my', authenticate, slotPackController.getMySlotPacks);

/**
 * @swagger
 * /api/slot-packs:
 *   get:
 *     summary: Lấy tất cả gói slot (admin/manager)
 *     tags: [SlotPacks]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), slotPackController.getAllSlotPacks);

/**
 * @swagger
 * /api/slot-packs/usage-history:
 *   get:
 *     summary: Lịch sử sử dụng gói lượt (tất cả booking slot_pack_usage)
 *     tags: [SlotPacks]
 *     security:
 *       - bearerAuth: []
 */
router.get('/usage-history', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), slotPackController.getUsageHistory);

/**
 * @swagger
 * /api/slot-packs/{id}/usage-history:
 *   get:
 *     summary: Lịch sử sử dụng của 1 gói cụ thể
 *     tags: [SlotPacks]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/usage-history', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), [
  param('id').isMongoId().withMessage('Invalid slot pack ID'),
], validate, slotPackController.getSlotPackUsageHistory);

/**
 * @swagger
 * /api/slot-packs/code/{code}:
 *   get:
 *     summary: Lookup gói bằng mã packCode (manager checkin)
 *     tags: [SlotPacks]
 *     security:
 *       - bearerAuth: []
 */
router.get('/code/:code', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), slotPackController.getSlotPackByCode);

/**
 * @swagger
 * /api/slot-packs/{id}:
 *   get:
 *     summary: Chi tiết gói slot
 *     tags: [SlotPacks]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, slotPackController.getSlotPackById);

/**
 * @swagger
 * /api/slot-packs/{id}/use:
 *   post:
 *     summary: Dùng 1 slot (manager checkin khi khách đến)
 *     tags: [SlotPacks]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/use', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), [
  param('id').isMongoId().withMessage('Invalid slot pack ID'),
  body('note').optional().trim().isLength({ max: 500 }),
], validate, slotPackController.useSlot);

/**
 * @swagger
 * /api/slot-packs/{id}/cancel:
 *   post:
 *     summary: Hủy gói slot
 *     tags: [SlotPacks]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/cancel', authenticate, [
  param('id').isMongoId().withMessage('Invalid slot pack ID'),
], validate, slotPackController.cancelSlotPack);

/**
 * POST /api/slot-packs/:id/pay — Thanh toán gói slot (bank hoặc vnpay)
 */
router.post('/:id/pay', authenticate, authorize(ROLES.CUSTOMER, ROLES.ADMIN, ROLES.MANAGER), [
  param('id').isMongoId().withMessage('Invalid slot pack ID'),
  body('method').isIn(['bank', 'vnpay']).withMessage('Method must be bank or vnpay'),
], validate, slotPackController.paySlotPack);

/**
 * GET /api/slot-packs/:id/payment — Kiểm tra trạng thái thanh toán
 */
router.get('/:id/payment', authenticate, slotPackController.getSlotPackPayment);

module.exports = router;
