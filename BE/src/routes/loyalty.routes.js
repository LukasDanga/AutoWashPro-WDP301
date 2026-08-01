const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyalty.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/permissions');

router.get('/tiers', loyaltyController.getTiers);
router.get('/config', loyaltyController.getConfig);
router.put('/config', authenticate, authorize(ROLES.ADMIN), loyaltyController.updateConfig);
router.get('/my-history', authenticate, loyaltyController.getMyPointHistory);
router.get('/my-history/:id', authenticate, loyaltyController.getMyPointHistoryDetail);
router.get('/admin/history', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), loyaltyController.getPointHistoryAdmin);
router.get('/admin/history/:id', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), loyaltyController.getPointHistoryDetailAdmin);
router.delete('/admin/history/:id', authenticate, authorize(ROLES.ADMIN), loyaltyController.deletePointHistoryAdmin);

module.exports = router;
