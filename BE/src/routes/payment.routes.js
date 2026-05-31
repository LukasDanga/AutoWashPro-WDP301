const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../utils/helpers');
const { paymentValidators, bookingValidators } = require('../utils/validators');
const bookingController = require('../controllers/booking.controller');
const { ROLES } = require('../config/permissions');

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Create payment for a booking
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CUSTOMER), paymentValidators.create, validate, bookingController.createPayment);

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: Get all payments (admin/manager)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), bookingController.getAllPayments);

/**
 * @swagger
 * /api/payments/my:
 *   get:
 *     summary: Get my payments
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/my', authenticate, bookingController.getMyPayments);

/**
 * @swagger
 * /api/payments/booking/{bookingId}:
 *   get:
 *     summary: Get payment by booking ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.get('/booking/:bookingId', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF, ROLES.CUSTOMER), bookingValidators.getByBookingId, validate, bookingController.getPaymentByBooking);

/**
 * @swagger
 * /api/payments/confirm:
 *   post:
 *     summary: Confirm payment (staff/manager/admin)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/confirm', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.STAFF), paymentValidators.confirm, validate, bookingController.confirmPayment);

/**
 * @swagger
 * /api/payments/refund:
 *   post:
 *     summary: Refund payment (admin/manager)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.post('/refund', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), paymentValidators.refund, validate, bookingController.refundPayment);

module.exports = router;
