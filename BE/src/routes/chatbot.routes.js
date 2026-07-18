const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot.controller');

router.post('/message', chatbotController.chat);       // fallback non-streaming
router.post('/stream', chatbotController.streamChat);  // streaming SSE
router.post('/clear', chatbotController.clearSession);

module.exports = router;
