const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config');
const { ROLES } = require('../config/permissions');

const authenticate = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Truy cập bị từ chối. Không tìm thấy token xác thực.', code: 'UNAUTHORIZED' });

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'Người dùng không tồn tại', code: 'USER_NOT_FOUND' });
    if (user.status === 'suspended') return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị khóa', code: 'ACCOUNT_SUSPENDED' });

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
  if (!req.user) return res.status(401).json({ success: false, message: 'Yêu cầu đăng nhập để thực hiện thao tác này', code: 'UNAUTHORIZED' });
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Bạn không có quyền thực hiện thao tác này', code: 'FORBIDDEN' });
  }
  next();
};

module.exports = { authenticate, authorize, ROLES };
