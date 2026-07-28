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

module.exports = router;
