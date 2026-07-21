const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./config/swagger');
const config = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const { authRoutes, vehiclesRoutes, branchRoutes, packageRoutes, bookingRoutes, paymentRoutes, refundRequestRoutes, voucherRoutes, notificationRoutes, slotPackRoutes, reportRoutes, chatbotRoutes, sseRoutes, slotProductRoutes, giftRoutes, testimonialRoutes, statsRoutes, loyaltyRoutes } = require('./routes');

const allowedOrigins = [config.APP_URL, config.API_URL, config.FE_URL].filter(Boolean);

const app = express();

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

app.use(
  '/api/',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10000, message: { success: false, message: 'Too many requests' } })
);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/refund-requests', refundRequestRoutes);
app.use('/api/vouchers', voucherRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/api/slot-packs', slotPackRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/chat', chatbotRoutes);
app.use('/api/sse', sseRoutes);
app.use('/api/slot-products', slotProductRoutes);
app.use('/api/gifts', giftRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/loyalty', loyaltyRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
