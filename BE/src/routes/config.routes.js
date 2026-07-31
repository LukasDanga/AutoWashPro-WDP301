const express = require('express');
const router = express.Router();
const configController = require('../controllers/config.controller');
const { configValidators } = require('../utils/validators');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../utils/helpers');

// Public route for FE/Mobile app initialization
router.get('/public', configValidators.getPublic, validate, configController.getPublicConfigs);

// Admin / Manager routes
router.use(authenticate);
router.use(authorize('admin', 'manager'));

router.get('/', configValidators.getAll, validate, configController.getAllConfigs);
router.post('/update', configValidators.update, validate, configController.updateConfig);
router.post('/rollback', configValidators.rollback, validate, configController.rollbackConfig);

module.exports = router;
