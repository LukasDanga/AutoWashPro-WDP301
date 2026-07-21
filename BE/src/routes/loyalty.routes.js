const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyalty.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/tiers', loyaltyController.getTiers);

module.exports = router;    