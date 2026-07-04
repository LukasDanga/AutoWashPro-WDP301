const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const reportController = require('../controllers/report.controller');
const { ROLES } = require('../config/permissions');

/**
 * @swagger
 * /api/reports/revenue:
 *   get:
 *     summary: Get revenue report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/revenue', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), reportController.getRevenueReport);
router.get('/revenue-trends', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), reportController.getRevenueTrends);
router.get('/booking-stats', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), reportController.getBookingStats);
router.get('/revenue-by-branch', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), reportController.getRevenueByBranch);

module.exports = router;
