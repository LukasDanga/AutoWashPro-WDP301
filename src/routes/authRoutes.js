const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../utils/helpers');
const { authValidators } = require('../utils/validators');
const authController = require('../controllers/authController');

router.post('/register', authValidators.register, validate, authController.register);
router.post('/login', authValidators.login, validate, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, authValidators.changePassword, validate, authController.changePassword);

module.exports = router;
