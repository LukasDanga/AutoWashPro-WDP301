const jwt = require('jsonwebtoken');
const chatbotService = require('../services/chatbot.service');
const { catchAsync, success } = require('../utils/helpers');

const extractUserId = (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.id || null;
    }
  } catch {
    // expired or invalid token — treat as anonymous
  }
  return null;
};

exports.chat = catchAsync(async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }
  if (!sessionId) {
    return res.status(400).json({ success: false, message: 'sessionId is required' });
  }

  const userId = extractUserId(req);
  const result = await chatbotService.chat(sessionId, message.trim(), userId);
  success(res, result, 'OK');
});

exports.clearSession = catchAsync(async (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) chatbotService.clearSession(sessionId);
  success(res, null, 'Session cleared');
});
