const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config');
const sseService = require('../services/sse.service');

// EventSource cannot set Authorization header — accept token via query param
async function authenticateSSE(req, res, next) {
  try {
    const token = req.query.token || (req.headers.authorization || '').replace('Bearer ', '');
    if (!token || token === 'null' || token === 'undefined') {
      // Allow guest connections for public broadcasts
      req.userId = 'guest_' + Math.random().toString(36).substr(2, 9);
      req.user = null;
      return next();
    }
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.status === 'suspended') {
      req.userId = 'guest_' + Math.random().toString(36).substr(2, 9);
      req.user = null;
      return next();
    }
    req.user = user;
    req.userId = user._id;
    next();
  } catch {
    // If token is invalid, fallback to guest instead of 401
    req.userId = 'guest_' + Math.random().toString(36).substr(2, 9);
    req.user = null;
    next();
  }
}

/**
 * GET /api/sse?token=<jwt> — Server-Sent Events stream for the authenticated user.
 * Sends a "ping" every 25s to keep the connection alive through proxies.
 * Emits:
 *   - event: "notification"  data: { title, message, type }
 *   - event: "booking_new"   data: { bookingId, branchId }  (managers only)
 *   - event: "ping"          data: {}
 */
router.get('/', authenticateSSE, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const userId = String(req.userId);
  const user = req.user;
  sseService.addClient(userId, res);

  // Initial welcome ping
  res.write('event: ping\ndata: {}\n\n');

  // Keepalive every 25 seconds
  const ping = setInterval(() => {
    try { res.write('event: ping\ndata: {}\n\n'); } catch { clearInterval(ping); }
  }, 25000);

  // Manager: forward branch-specific booking events
  let managerListener;
  if (user && user.role === 'manager' && user.branchId) {
    const branchId = String(user.branchId);
    managerListener = ({ branchId: evtBranch, event, data }) => {
      if (evtBranch !== branchId) return;
      try {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch { /* client gone */ }
    };
    sseService.emitter.on('manager-event', managerListener);
  }

  // Admin: forward all booking events (all branches)
  let adminListener;
  if (user && user.role === 'admin') {
    adminListener = ({ event, data }) => {
      try {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      } catch { /* client gone */ }
    };
    sseService.emitter.on('manager-event', adminListener);
  }

  req.on('close', () => {
    clearInterval(ping);
    sseService.removeClient(userId, res);
    if (managerListener) sseService.emitter.off('manager-event', managerListener);
    if (adminListener) sseService.emitter.off('manager-event', adminListener);
  });
});

module.exports = router;
