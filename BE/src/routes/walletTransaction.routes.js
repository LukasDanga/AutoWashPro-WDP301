const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const walletTransactionController = require('../controllers/walletTransaction.controller');
const { ROLES } = require('../config/permissions');

/**
 * @swagger
 * /api/wallet-transactions/my:
 *   get:
 *     summary: Get my wallet transactions
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 */
router.get('/my', authenticate, authorize(ROLES.CUSTOMER), walletTransactionController.getMyWalletTransactions);

/**
 * @swagger
 * /api/wallet-transactions/:id:
 *   get:
 *     summary: Get wallet transaction details by ID
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, authorize(ROLES.CUSTOMER), walletTransactionController.getWalletTransactionById);

module.exports = router;
