const express = require('express');
const router = express.Router();
const slotProductController = require('../controllers/slotProduct.controller');

router.get('/public', slotProductController.getPublicSlotProducts);

module.exports = router;
