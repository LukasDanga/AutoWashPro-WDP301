const { body, param, query } = require('express-validator');

const authValidators = {
  register: [
    body('name').optional().trim().isLength({ max: 100 }),
    body('email').trim().isEmail().withMessage('Invalid email').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional().trim(),
  ],
  login: [
    body('identifier').trim().notEmpty().withMessage('Email or phone number is required'),
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
    body('role').notEmpty().withMessage('Role is required').isIn(['admin', 'manager']),
    body('branchId').optional().isMongoId().withMessage('Invalid branch ID'),
  ],
  updateUser: [
    param('id').isMongoId().withMessage('Invalid user ID'),
    body('name').optional().trim().isLength({ max: 100 }),
    body('phone').optional().trim(),
    body('role').optional().isIn(['admin', 'manager']),
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
    body('location.coordinates').optional().isArray().withMessage('Coordinates must be an array [longitude, latitude]'),
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
    body('location.coordinates').optional().isArray(),
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
    body('branchId').optional().isMongoId().withMessage('Invalid branch ID'),
    body('status').optional().isIn(['active', 'inactive']),
    body('category').optional().isIn(['external', 'internal', 'full']),
    body('vehicleTypes').optional().isArray(),
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid package ID'),
    body('name').optional().trim().isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('price').optional().isFloat({ min: 0 }),
    body('duration').optional().isInt({ min: 1 }),
    body('image').optional().trim(),
    body('branchId').optional().isMongoId().withMessage('Invalid branch ID'),
    body('status').optional().isIn(['active', 'inactive']),
    body('category').optional().isIn(['external', 'internal', 'full']),
    body('vehicleTypes').optional().isArray(),
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
    body('voucherCode').optional().trim().isLength({ max: 50 }),
    body('discountAmount').optional().isFloat({ min: 0 }),
    body('finalPrice').optional().isFloat({ min: 0 }),
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid booking ID'),
    body('bookingDate').optional().isISO8601(),
    body('startTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('note').optional().trim().isLength({ max: 500 }),
    body('packageId').optional().isMongoId().withMessage('Invalid package ID'),
  ],
  updateStatus: [
    param('id').isMongoId().withMessage('Invalid booking ID'),
    body('status').notEmpty().withMessage('Status is required').isIn(['pending', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled']),
  ],
  slots: [
    query('branchId').isString().notEmpty().withMessage('Invalid branch ID'),
    query('date').isISO8601().withMessage('Invalid date format'),
    query('packageId').isString().notEmpty().withMessage('Invalid package ID'),
  ],
  cancel: [
    param('id').isMongoId().withMessage('Invalid booking ID'),
    body('cancellationReason').optional().trim().isLength({ max: 500 }),
  ],
  getByBookingId: [
    param('bookingId').isMongoId().withMessage('Invalid booking ID'),
  ],
};

const paymentValidators = {
  create: [
    body('bookingId').isMongoId().withMessage('Invalid booking ID'),
    body('method').notEmpty().withMessage('Payment method is required').isIn(['cash', 'bank']),
  ],
  confirm: [
    body('transactionId').trim().notEmpty().withMessage('Transaction ID is required'),
    body('method').trim().notEmpty().withMessage('Payment method is required').isIn(['cash', 'bank']),
    body('gatewayTransactionId').optional().trim(),
  ],
  refund: [
    body('bookingId').isMongoId().withMessage('Invalid booking ID'),
  ],
  callback: [
    body('transactionId').trim().notEmpty().withMessage('Transaction ID is required'),
    body('gatewayTransactionId').optional().trim(),
    body('success').isBoolean().withMessage('Success flag is required'),
  ],
};

const refundRequestValidators = {
  create: [
    body('bookingId').isMongoId().withMessage('Invalid booking ID'),
    body('reason').trim().notEmpty().withMessage('Reason is required').isLength({ max: 500 }),
  ],
  review: [
    param('id').isMongoId().withMessage('Invalid refund request ID'),
    body('decision').notEmpty().withMessage('Decision is required').isIn(['approved', 'rejected']),
    body('reviewNote').optional().trim().isLength({ max: 500 }),
  ],
  getById: [
    param('id').isMongoId().withMessage('Invalid refund request ID'),
  ],
};

const voucherValidators = {
  create: [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('type').notEmpty().withMessage('Type is required').isIn(['percentage', 'fixed']),
    body('value').isFloat({ min: 0 }).withMessage('Value must be a positive number'),
    body('maxDiscount').optional().isFloat({ min: 0 }),
    body('minOrder').optional().isFloat({ min: 0 }),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be at least 0'),
    body('maxUsagePerUser').optional().isInt({ min: 1 }),
    body('startDate').isISO8601().withMessage('Invalid start date'),
    body('endDate').isISO8601().withMessage('Invalid end date'),
    body('applicablePackages').optional().isArray(),
    body('applicableBranches').optional().isArray(),
    body('applicableToAllPackages').optional().isBoolean(),
    body('applicableToAllBranches').optional().isBoolean(),
    body('status').optional().isIn(['active', 'inactive']),
  ],
  update: [
    param('id').isMongoId().withMessage('Invalid voucher ID'),
    body('name').optional().trim().isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('type').optional().isIn(['percentage', 'fixed']),
    body('value').optional().isFloat({ min: 0 }),
    body('maxDiscount').optional().isFloat({ min: 0 }),
    body('minOrder').optional().isFloat({ min: 0 }),
    body('quantity').optional().isInt({ min: 0 }),
    body('maxUsagePerUser').optional().isInt({ min: 1 }),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('status').optional().isIn(['active', 'inactive']),
  ],
  validate: [
    body('code').trim().notEmpty().withMessage('Voucher code is required'),
    body('bookingData').isObject().withMessage('Booking data is required'),
  ],
  redeem: [
    body('code').trim().notEmpty().withMessage('Voucher code is required'),
    body('bookingId').optional().isMongoId().withMessage('Invalid booking ID'),
    body('discountAmount').optional().isFloat({ min: 0 }),
  ],
  reserve: [
    body('code').trim().notEmpty().withMessage('Voucher code is required'),
    body('bookingId').isMongoId().withMessage('Booking ID is required'),
    body('discountAmount').optional().isFloat({ min: 0 }),
  ],
  rollback: [
    body('code').trim().notEmpty().withMessage('Voucher code is required'),
    body('bookingId').isMongoId().withMessage('Booking ID is required'),
  ],
};

const checkinValidators = {
  checkIn: [
    body('bookingId').isMongoId().withMessage('Invalid booking ID'),
  ],
  updateStatus: [
    param('bookingId').isMongoId().withMessage('Invalid booking ID'),
    body('status').notEmpty().withMessage('Status is required').isIn(['in_progress', 'completed']),
    body('note').optional().trim().isLength({ max: 500 }),
    body('rating').optional().isInt({ min: 1, max: 5 }),
    body('feedback').optional().trim().isLength({ max: 1000 }),
  ],
};

const notificationValidators = {
  markRead: [
    param('id').isMongoId().withMessage('Invalid notification ID'),
  ],
};

module.exports = { authValidators, vehicleValidators, branchValidators, packageValidators, bookingValidators, paymentValidators, refundRequestValidators, voucherValidators, checkinValidators, notificationValidators };
