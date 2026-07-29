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

// POST /api/bookings/vnpay-provisional — Tạo VNPay URL trước khi có booking
router.post('/vnpay-provisional', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER), [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be positive'),
], validate, bookingController.createVnpayProvisional);

// POST /api/bookings/recurring/check-conflicts — Kiểm tra trùng lịch trước khi tạo
router.post('/recurring/check-conflicts', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER), [
  body('branchId').isMongoId().withMessage('ID chi nhánh không hợp lệ'),
  body('packageId').isMongoId().withMessage('ID gói dịch vụ không hợp lệ'),
  body('vehicleId').isMongoId().withMessage('ID xe không hợp lệ'),
  body('weekdays').isArray({ min: 1 }).withMessage('weekdays must be a non-empty array'),
  body('weekdays.*').isInt({ min: 0, max: 6 }).withMessage('Each weekday must be 0-6'),
  body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format (HH:mm)'),
  body('weeks').isInt({ min: 1, max: 12 }).withMessage('weeks must be between 1 and 12'),
], validate, bookingController.checkRecurringConflicts);

// POST /api/bookings/recurring — Tạo định kỳ
router.post('/recurring', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER), [
  body('branchId').isMongoId().withMessage('ID chi nhánh không hợp lệ'),
  body('packageId').isMongoId().withMessage('ID gói dịch vụ không hợp lệ'),
  body('vehicleId').isMongoId().withMessage('ID xe không hợp lệ'),
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

// POST /api/bookings/confirm — Xác nhận hàng loạt đơn pending (truyền ids, hoặc rỗng = tất cả)
router.post('/confirm', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), [
  body('ids').optional().isArray(),
  body('ids.*').optional().isMongoId(),
], validate, bookingController.confirmBookings);

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
router.get('/slots', bookingValidators.slots, validate, bookingController.getAvailableSlots);

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
 *     summary: Update booking (admin/manager can edit any field; customer can only reschedule their own booking's date/time/note)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER), bookingValidators.update, validate, bookingController.updateBooking);

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
 * /api/bookings/{id}/sub-services:
 *   patch:
 *     summary: Update sub-services for a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/sub-services', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.CUSTOMER), bookingValidators.updateSubServices, validate, bookingController.updateSubServices);

/**
 * @swagger
 * /api/bookings/{id}/extend-grace:
 *   patch:
 *     summary: Extend the no-show grace period for a booking at risk of auto-cancellation (manager/admin)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Grace period extended
 *       400:
 *         description: Invalid status or extension limit reached
 *       404:
 *         description: Booking not found
 */
router.patch('/:id/extend-grace', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), [
  param('id').isMongoId(),
], validate, bookingController.extendGracePeriod);

/**
 * @swagger
 * /api/bookings/{id}/cancel-preview:
 *   get:
 *     summary: Preview refund/penalty before cancelling (customer)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id/cancel-preview', authenticate, authorize(ROLES.CUSTOMER), [
  param('id').isMongoId(),
], validate, bookingController.getCancelPreview);

/**
 * @swagger
 * /api/bookings/{id}/cancel-otp:
 *   post:
 *     summary: Request OTP for cancelling booking (customer)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/cancel-otp', authenticate, authorize(ROLES.CUSTOMER), bookingValidators.cancel, validate, bookingController.requestCancelOtp);

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
 * /api/bookings/{id}/refund-complete:
 *   post:
 *     summary: Xác nhận đã hoàn tiền thủ công cho lịch hẹn
 *     tags: [Bookings]
 */
router.post('/:id/refund-complete', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), [
  param('id').isMongoId(),
], validate, bookingController.refundComplete);

/**
 * @swagger
 * /api/bookings/{id}/feedback:
 *   patch:
 *     summary: Submit rating & review for a completed booking (customer)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating 1-5
 *               feedback:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Review text
 *     responses:
 *       200:
 *         description: Feedback submitted
 *       400:
 *         description: Invalid status or validation error
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */
router.patch('/:id/feedback', authenticate, authorize(ROLES.CUSTOMER), [
  param('id').isMongoId(),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('feedback').optional().trim().isLength({ max: 1000 }),
], validate, bookingController.submitFeedback);

/**
 * @swagger
 * /api/bookings/{id}/feedback/reply:
 *   patch:
 *     summary: Reply to a customer review (admin/manager)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reply]
 *             properties:
 *               reply:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Manager reply text
 *     responses:
 *       200:
 *         description: Reply submitted
 *       400:
 *         description: No review to reply to
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Booking not found
 */
router.patch('/:id/feedback/reply', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), [
  param('id').isMongoId(),
  body('reply').trim().notEmpty().isLength({ max: 1000 }).withMessage('Reply is required (max 1000 chars)'),
], validate, bookingController.replyToFeedback);

/**
 * @swagger
 * /api/bookings/{id}/rebook:
 *   post:
 *     summary: Clone a booking with new date/time (rebook)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Original booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingDate, startTime]
 *             properties:
 *               bookingDate:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *     responses:
 *       201:
 *         description: Booking rebooked
 *       400:
 *         description: Validation error
 *       404:
 *         description: Booking not found
 */
// Đặt lại lịch — chỉ khách hàng (user) mới có quyền
router.post('/:id/rebook', authenticate, authorize(ROLES.CUSTOMER), [
  param('id').isMongoId(),
  body('bookingDate').notEmpty().withMessage('bookingDate is required'),
  body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format (HH:mm)'),
  body('voucherCode').optional().trim().isLength({ max: 50 }),
], validate, bookingController.rebookBooking);

/**
 * @swagger
 * /api/bookings/{id}/qr:
 *   get:
 *     summary: Generate QR code for check-in
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: QR code generated (base64 data URL)
 *       404:
 *         description: Booking not found
 */
router.get('/:id/qr', authenticate, [param('id').isMongoId()], validate, bookingController.getBookingQR);

/**
 * @swagger
 * /api/bookings/range:
 *   delete:
 *     summary: Delete bookings by date range (admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 */
router.delete('/range', authenticate, authorize(ROLES.ADMIN), bookingController.deleteBookingsByDateRange);

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
