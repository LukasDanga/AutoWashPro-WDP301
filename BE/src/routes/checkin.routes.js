const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../utils/helpers');
const { checkinValidators } = require('../utils/validators');
const checkinController = require('../controllers/checkin.controller');
const { ROLES } = require('../config/permissions');

/**
 * @swagger
 * /api/checkins:
 *   post:
 *     summary: Check in a booking (manager/admin)
 *     tags: [Check-ins]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), checkinValidators.checkIn, validate, checkinController.checkIn);

/**
 * @swagger
 * /api/checkins/me/{bookingId}:
 *   post:
 *     summary: Self check-in (customer checks in their own booking)
 *     tags: [Check-ins]
 *     security:
 *       - bearerAuth: []
 */
router.post('/me/:bookingId', authenticate, checkinController.checkIn);

/**
 * @swagger
 * /api/checkins:
 *   get:
 *     summary: Get all check-ins (manager/admin)
 *     tags: [Check-ins]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), checkinController.getAllCheckins);

/**
 * @swagger
 * /api/checkins/stats:
 *   get:
 *     summary: Get check-in statistics (manager/admin)
 *     tags: [Check-ins]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), checkinController.getCheckinStats);

/**
 * @swagger
 * /api/checkins/booking/{bookingId}:
 *   get:
 *     summary: Get check-in by booking ID
 *     tags: [Check-ins]
 *     security:
 *       - bearerAuth: []
 */
router.get('/booking/:bookingId', authenticate, checkinController.getCheckinByBooking);

/**
 * @swagger
 * /api/checkins/{id}:
 *   get:
 *     summary: Get check-in by ID
 *     tags: [Check-ins]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, checkinController.getCheckinById);

/**
 * @swagger
 * /api/checkins/{bookingId}/status:
 *   patch:
 *     summary: Update check-in status (manager/admin)
 *     tags: [Check-ins]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:bookingId/status', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), checkinValidators.updateStatus, validate, checkinController.updateCheckinStatus);

module.exports = router;
