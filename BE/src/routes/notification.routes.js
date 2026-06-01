const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../utils/helpers');
const { notificationValidators } = require('../utils/validators');
const notificationController = require('../controllers/notification.controller');
const { ROLES } = require('../config/permissions');

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get my notifications (paginated)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 */
router.get('/', authenticate, notificationController.getMyNotifications);

/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/read-all', authenticate, notificationController.markAllAsRead);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/:id/read', authenticate, notificationValidators.markRead, validate, notificationController.markAsRead);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', authenticate, notificationValidators.markRead, validate, notificationController.deleteNotification);

/**
 * @swagger
 * /api/notifications:
 *   delete:
 *     summary: Delete all my notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/', authenticate, notificationController.deleteAll);

module.exports = router;
