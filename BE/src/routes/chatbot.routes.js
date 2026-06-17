const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot.controller');

router.post('/message', chatbotController.chat);
router.post('/clear', chatbotController.clearSession);

module.exports = router;
