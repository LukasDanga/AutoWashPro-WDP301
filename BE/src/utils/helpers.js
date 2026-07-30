const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  console.log('Validate req.body:', req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const catchAsync = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const success = (res, data, message = 'Success', status = 200, pagination = null) =>
  res.status(status).json({ success: true, message, data, ...(pagination ? { pagination } : {}), timestamp: new Date().toISOString() });

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Internal server error';

  if (err.name === 'CastError') return res.status(400).json({ success: false, message: `Invalid ${err.path}`, code: 'CAST_ERROR' });
  if (err.code === 11000) { const field = Object.keys(err.keyPattern)[0]; return res.status(409).json({ success: false, message: `${field} already exists`, code: 'DUPLICATE_KEY' }); }
  if (err.name === 'ValidationError') { const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })); return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ', code: 'VALIDATION_ERROR', errors }); }
  if (err.name === 'JsonWebTokenError') return res.status(401).json({ success: false, message: 'Token không hợp lệ', code: 'INVALID_TOKEN' });
  if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token đã hết hạn', code: 'TOKEN_EXPIRED' });

  res.status(statusCode).json({ success: false, message, code });
};

const notFoundHandler = (req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found`, code: 'NOT_FOUND' });

module.exports = { validate, catchAsync, success, errorHandler, notFoundHandler };
