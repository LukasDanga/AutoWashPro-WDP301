const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');

router.get('/public', statsController.getPublicStats);

module.exports = router;
