const express = require('express');
const router = express.Router();
const giftController = require('../controllers/gift.controller');

router.get('/public', giftController.getPublicGifts);

module.exports = router;
