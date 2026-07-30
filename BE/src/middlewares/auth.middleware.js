const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config');
const { ROLES } = require('../config/permissions');

const authenticate = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Access denied. No token.', code: 'UNAUTHORIZED' });

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found', code: 'USER_NOT_FOUND' });
    if (user.status === 'suspended') return res.status(403).json({ success: false, message: 'Account suspended', code: 'ACCOUNT_SUSPENDED' });

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ success: false, message: 'Token không hợp lệ', code: 'INVALID_TOKEN' });
    if (error.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token đã hết hạn', code: 'TOKEN_EXPIRED' });
    next(error);
  }
};

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required', code: 'UNAUTHORIZED' });
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions', code: 'FORBIDDEN' });
  }
  next();
};

module.exports = { authenticate, authorize, ROLES };
