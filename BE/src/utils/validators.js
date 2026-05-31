const { body, param, query } = require('express-validator');

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

const packageValidators = {
  create: [
    body('name').trim().notEmpty().withMessage('Package name is required').isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('duration').isInt({ min: 1 }).withMessage('Duration must be at least 1 minute'),
    body('image').optional().trim(),
    body('status').optional().isIn(['active', 'inactive']),
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid package ID'),
    body('name').optional().trim().isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('price').optional().isFloat({ min: 0 }),
    body('duration').optional().isInt({ min: 1 }),
    body('image').optional().trim(),
    body('status').optional().isIn(['active', 'inactive']),
  ],
};

const bookingValidators = {
  create: [
    body('branchId').isMongoId().withMessage('Invalid branch ID'),
    body('packageId').isMongoId().withMessage('Invalid package ID'),
    body('vehicleId').isMongoId().withMessage('Invalid vehicle ID'),
    body('bookingDate').isISO8601().withMessage('Invalid date format'),
    body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format (HH:mm)'),
    body('note').optional().trim().isLength({ max: 500 }),
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid booking ID'),
    body('bookingDate').optional().isISO8601(),
    body('startTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('note').optional().trim().isLength({ max: 500 }),
  ],
  updateStatus: [
    param('id').isMongoId().withMessage('Invalid booking ID'),
    body('status').notEmpty().withMessage('Status is required').isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']),
  ],
  slots: [
    query('branchId').isMongoId().withMessage('Invalid branch ID'),
    query('date').isISO8601().withMessage('Invalid date format'),
    query('packageId').isMongoId().withMessage('Invalid package ID'),
  ],
  cancel: [
    param('id').isMongoId().withMessage('Invalid booking ID'),
  ],
  getByBookingId: [
    param('bookingId').isMongoId().withMessage('Invalid booking ID'),
  ],
};

const paymentValidators = {
  create: [
    body('bookingId').isMongoId().withMessage('Invalid booking ID'),
    body('method').notEmpty().withMessage('Payment method is required').isIn(['cash', 'momo', 'vnpay']),
  ],
  confirm: [
    body('transactionId').trim().notEmpty().withMessage('Transaction ID is required'),
    body('method').trim().notEmpty().withMessage('Payment method is required').isIn(['cash', 'momo', 'vnpay']),
  ],
  refund: [
    body('bookingId').isMongoId().withMessage('Invalid booking ID'),
  ],
};

module.exports = { authValidators, vehicleValidators, branchValidators, packageValidators, bookingValidators, paymentValidators };
