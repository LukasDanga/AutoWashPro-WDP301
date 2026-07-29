const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const chatbotService = require('../services/chatbot.service');
const { catchAsync, success } = require('../utils/helpers');
const { User } = require('../models');

const extractUserInfo = async (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id || null;
      if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        const user = await User.findById(userId).select('role name').lean();
        if (user) return { userId: user._id.toString(), role: user.role, name: user.name };
      }
      return { userId, role: 'customer', name: '' };
    }
  } catch {
    // expired or invalid token — treat as anonymous
  }
  return { userId: null, role: 'customer', name: '' };
};

// Standard (non-streaming) endpoint — kept as fallback
exports.chat = catchAsync(async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message || !message.trim())
    return res.status(400).json({ success: false, message: 'Message is required' });
  if (!sessionId)
    return res.status(400).json({ success: false, message: 'sessionId is required' });

  const userInfo = await extractUserInfo(req);
  const result = await chatbotService.chat(sessionId, message.trim(), userInfo.userId, userInfo.role);
  success(res, result, 'OK');
});

// Streaming SSE endpoint
exports.streamChat = async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message || !message.trim())
    return res.status(400).json({ success: false, message: 'Message is required' });
  if (!sessionId)
    return res.status(400).json({ success: false, message: 'sessionId is required' });

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  const userInfo = await extractUserInfo(req);
  await chatbotService.streamChat(sessionId, message.trim(), userInfo.userId, userInfo.role, res);
};

exports.clearSession = catchAsync(async (req, res) => {
  const { sessionId } = req.body;
  if (sessionId) chatbotService.clearSession(sessionId);
  success(res, null, 'Session cleared');
});
