const { body, param } = require('express-validator');

const authValidators = {
  register: [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('email').trim().isEmail().withMessage('Invalid email').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional().trim(),
  ],
  login: [
    body('email').trim().isEmail().withMessage('Invalid email').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  createUser: [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('email').trim().isEmail().withMessage('Invalid email').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional().trim(),
    body('role').notEmpty().withMessage('Role is required').isIn(['admin', 'manager', 'staff']),
  ],
  updateUser: [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('name').optional().trim().isLength({ max: 100 }),
    body('phone').optional().trim(),
    body('role').optional().isIn(['admin', 'manager', 'staff']),
    body('status').optional().isIn(['active', 'inactive', 'suspended']),
  ],
};

const vehicleValidators = {
  create: [
    body('licensePlate').trim().notEmpty().withMessage('License plate is required').isLength({ max: 20 }),
    body('vehicleType').isIn(['sedan', 'suv', 'pickup', 'van', 'motorcycle']).withMessage('Invalid vehicle type'),
    body('brand').trim().notEmpty().withMessage('Brand is required').isLength({ max: 50 }),
    body('model').optional().trim().isLength({ max: 50 }),
    body('color').trim().notEmpty().withMessage('Color is required').isLength({ max: 30 }),
    body('year').optional().isInt({ min: 1900, max: 2030 }),
    body('isDefault').optional().isBoolean(),
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid vehicle ID'),
    body('licensePlate').optional().trim().isLength({ max: 20 }),
    body('vehicleType').optional().isIn(['sedan', 'suv', 'pickup', 'van', 'motorcycle']),
    body('brand').optional().trim(),
    body('color').optional().trim(),
    body('isDefault').optional().isBoolean(),
  ],
};

const branchValidators = {
  create: [
    body('name').trim().notEmpty().withMessage('Branch name is required').isLength({ max: 200 }),
    body('address').trim().notEmpty().withMessage('Address is required').isLength({ max: 500 }),
    body('phone').optional().trim().isLength({ max: 20 }),
    body('email').optional().trim().isEmail().withMessage('Invalid email').normalizeEmail(),
    body('openingTime').optional().trim(),
    body('closingTime').optional().trim(),
    body('status').optional().isIn(['active', 'inactive']),
    body('image').optional().trim(),
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid branch ID'),
    body('name').optional().trim().isLength({ max: 200 }),
    body('address').optional().trim().isLength({ max: 500 }),
    body('phone').optional().trim().isLength({ max: 20 }),
    body('email').optional().trim().isEmail().normalizeEmail(),
    body('openingTime').optional().trim(),
    body('closingTime').optional().trim(),
    body('status').optional().isIn(['active', 'inactive']),
    body('image').optional().trim(),
  ],
  updateStatus: [
    param('id').isMongoId().withMessage('Invalid branch ID'),
    body('status').notEmpty().withMessage('Status is required').isIn(['active', 'inactive']),
  ],
};

module.exports = { authValidators, vehicleValidators, branchValidators };
