const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../utils/helpers');
const { refundRequestValidators } = require('../utils/validators');
const refundRequestController = require('../controllers/refundRequest.controller');
const { ROLES } = require('../config/permissions');

/**
 * @swagger
 * /api/refund-requests:
 *   post:
 *     summary: Create a refund request (customer)
 *     tags: [RefundRequests]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', authenticate, authorize(ROLES.CUSTOMER), refundRequestValidators.create, validate, refundRequestController.createRequest);

/**
 * @swagger
 * /api/refund-requests:
 *   get:
 *     summary: Get all refund requests (admin/manager)
 *     tags: [RefundRequests]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), refundRequestController.getAllRequests);

/**
 * @swagger
 * /api/refund-requests/my:
 *   get:
 *     summary: Get my refund requests
 *     tags: [RefundRequests]
 *     security:
 *       - bearerAuth: []
 */
router.get('/my', authenticate, refundRequestController.getMyRequests);

/**
 * @swagger
 * /api/refund-requests/{id}:
 *   get:
 *     summary: Get refund request by ID
 *     tags: [RefundRequests]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, refundRequestValidators.getById, validate, refundRequestController.getRequestById);

/**
 * @swagger
 * /api/refund-requests/{id}/review:
 *   post:
 *     summary: Approve or reject a refund request (admin/manager)
 *     tags: [RefundRequests]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/review', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), refundRequestValidators.review, validate, refundRequestController.reviewRequest);

module.exports = router;
