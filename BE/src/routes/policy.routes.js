const express = require('express');
const router = express.Router();
const policyController = require('../controllers/policy.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// Public routes (cho Landing page, Footer & PolicyPage)
router.get('/', policyController.getPolicies);
router.get('/:slug', policyController.getPolicyBySlug);

// Admin-only routes (Quản lý CRUD & Seed)
router.post('/', authenticate, authorize('admin'), policyController.createPolicy);
router.put('/:id', authenticate, authorize('admin'), policyController.updatePolicy);
router.delete('/:id', authenticate, authorize('admin'), policyController.deletePolicy);
router.post('/seed', authenticate, authorize('admin'), policyController.seedPolicies);

module.exports = router;
