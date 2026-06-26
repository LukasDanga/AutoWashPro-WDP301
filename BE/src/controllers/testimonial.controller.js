const bookingService = require('../services/booking.service');
const { catchAsync, success } = require('../utils/helpers');

exports.getPublicTestimonials = catchAsync(async (req, res) => {
  const testimonials = await bookingService.getPublicTestimonials();
  success(res, testimonials, 'Testimonials retrieved');
});
