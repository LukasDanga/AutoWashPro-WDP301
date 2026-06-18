const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../utils/helpers');
const { bookingValidators } = require('../utils/validators');
const bookingController = require('../controllers/booking.controller');
const { ROLES } = require('../config/permissions');

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [branchId, packageId, vehicleId, bookingDate, startTime]
 *             properties:
 *               branchId: { type: string }
 *               packageId: { type: string }
 *               vehicleId: { type: string }
 *               bookingDate: { type: string, format: date }
 *               startTime: { type: string }
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Booking created
 */
router.post('/', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER), bookingValidators.create, validate, bookingController.createBooking);

// POST /api/bookings/recurring — Tạo định kỳ
router.post('/recurring', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER), [
  body('branchId').isMongoId().withMessage('Invalid branch ID'),
  body('packageId').isMongoId().withMessage('Invalid package ID'),
  body('vehicleId').isMongoId().withMessage('Invalid vehicle ID'),
  body('weekdays').isArray({ min: 1 }).withMessage('weekdays must be a non-empty array'),
  body('weekdays.*').isInt({ min: 0, max: 6 }).withMessage('Each weekday must be 0-6'),
  body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format (HH:mm)'),
  body('weeks').isInt({ min: 1, max: 12 }).withMessage('weeks must be between 1 and 12'),
  body('note').optional().trim().isLength({ max: 500 }),
  body('voucherCode').optional().trim().isLength({ max: 50 }),
], validate, bookingController.createRecurringBooking);

// DELETE /api/bookings/recurring/:groupId — Hủy cả loạt định kỳ
router.post('/recurring/:groupId/cancel', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER), [
  param('groupId').isString().notEmpty().withMessage('Group ID required'),
], validate, bookingController.cancelRecurringGroup);


/**
 * @swagger
 * /api/bookings:
 *   get:
 *     summary: Get all bookings (admin/manager)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), bookingController.getAllBookings);

router.get('/feedbacks', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), bookingController.getFeedbacks);

router.get('/customers', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), bookingController.getCustomers);

/**
 * @swagger
 * /api/bookings/my:
 *   get:
 *     summary: Get my bookings (customer)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 */
router.get('/my', authenticate, bookingController.getMyBookings);

/**
 * @swagger
 * /api/bookings/slots:
 *   get:
 *     summary: Get available time slots
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/slots', authenticate, bookingValidators.slots, validate, bookingController.getAvailableSlots);

/**
 * @swagger
 * /api/bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, bookingController.getBookingById);

/**
 * @swagger
 * /api/bookings/{id}:
 *   put:
 *     summary: Update booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), bookingValidators.update, validate, bookingController.updateBooking);

/**
 * @swagger
 * /api/bookings/{id}/status:
 *   patch:
 *     summary: Update booking status
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/status', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), bookingValidators.updateStatus, validate, bookingController.updateBookingStatus);

/**
 * @swagger
 * /api/bookings/{id}/cancel:
 *   post:
 *     summary: Cancel booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/cancel', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER), bookingValidators.cancel, validate, bookingController.cancelBooking);

// PATCH /api/bookings/:id/feedback — Customer submits rating + review
router.patch('/:id/feedback', authenticate, authorize(ROLES.CUSTOMER), [
  param('id').isMongoId(),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('feedback').optional().trim().isLength({ max: 1000 }),
], validate, bookingController.submitFeedback);

// PATCH /api/bookings/:id/feedback/reply — Manager replies to review
router.patch('/:id/feedback/reply', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), [
  param('id').isMongoId(),
  body('reply').trim().notEmpty().isLength({ max: 1000 }).withMessage('Reply is required (max 1000 chars)'),
], validate, bookingController.replyToFeedback);

// POST /api/bookings/:id/rebook — Clone booking with new date/time
router.post('/:id/rebook', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER), [
  param('id').isMongoId(),
  body('bookingDate').notEmpty().withMessage('bookingDate is required'),
  body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format (HH:mm)'),
], validate, bookingController.rebookBooking);

// GET /api/bookings/:id/qr — Generate QR code for check-in
router.get('/:id/qr', authenticate, [param('id').isMongoId()], validate, bookingController.getBookingQR);

/**
 * @swagger
 * /api/bookings/{id}:
 *   delete:
 *     summary: Delete booking (admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticate, authorize(ROLES.ADMIN), bookingController.deleteBooking);

module.exports = router;
