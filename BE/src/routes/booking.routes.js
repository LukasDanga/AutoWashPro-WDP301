const express = require('express');
const router = express.Router();
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
