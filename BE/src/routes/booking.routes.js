const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../utils/helpers');
const { bookingValidators } = require('../utils/validators');
const bookingController = require('../controllers/booking.controller');

router.use(authenticate);

router.post('/', bookingValidators.create, validate, bookingController.createBooking);
router.get('/', bookingController.getMyBookings);
router.get('/:id', bookingController.getBookingById);

module.exports = router;