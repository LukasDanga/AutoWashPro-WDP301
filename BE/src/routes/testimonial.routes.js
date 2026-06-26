const express = require('express');
const router = express.Router();
const testimonialController = require('../controllers/testimonial.controller');

router.get('/', testimonialController.getPublicTestimonials);

module.exports = router;
