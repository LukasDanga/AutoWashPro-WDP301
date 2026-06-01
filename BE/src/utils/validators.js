const { body, param } = require('express-validator');

const authValidators = {
  register: [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
    body('email').trim().isEmail().withMessage('Invalid email').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional().trim(),
  ],
  login: [
    body('identifier').trim().notEmpty().withMessage('Email or phone is required'),
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

const bookingValidators = {
  create: [
    body('branchId').trim().notEmpty().withMessage('Branch ID is required'),
    body('branchName').trim().notEmpty().withMessage('Branch name is required').isLength({ max: 200 }),
    body('branchAddress').trim().notEmpty().withMessage('Branch address is required').isLength({ max: 500 }),
    body('vehicleId').trim().notEmpty().withMessage('Vehicle ID is required'),
    body('vehicleName').trim().notEmpty().withMessage('Vehicle name is required').isLength({ max: 200 }),
    body('vehiclePlate').trim().notEmpty().withMessage('Vehicle plate is required').isLength({ max: 30 }),
    body('vehicleType').trim().notEmpty().withMessage('Vehicle type is required').isLength({ max: 30 }),
    body('serviceId').trim().notEmpty().withMessage('Service ID is required'),
    body('serviceName').trim().notEmpty().withMessage('Service name is required').isLength({ max: 200 }),
    body('serviceDuration').optional().trim().isLength({ max: 50 }),
    body('servicePrice').isInt({ min: 0 }).withMessage('Service price must be a positive integer'),
    body('bookingDate').isISO8601().withMessage('Booking date is required and must be valid'),
    body('timeSlot').trim().notEmpty().withMessage('Time slot is required').isLength({ max: 50 }),
    body('couponCode').optional().trim().isLength({ max: 50 }),
    body('discountAmount').optional().isInt({ min: 0 }),
    body('totalAmount').isInt({ min: 0 }).withMessage('Total amount must be a positive integer'),
    body('notes').optional().trim().isLength({ max: 500 }),
  ],
};

module.exports = { authValidators, vehicleValidators, branchValidators, bookingValidators };
