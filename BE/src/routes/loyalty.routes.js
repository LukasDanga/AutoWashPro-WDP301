const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyalty.controller');

router.get('/tiers', loyaltyController.getTiers);

module.exports = router;
