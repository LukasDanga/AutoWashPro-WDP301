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
const { authRoutes, vehiclesRoutes, branchRoutes, packageRoutes, bookingRoutes, paymentRoutes, refundRequestRoutes, voucherRoutes, notificationRoutes, slotPackRoutes, reportRoutes, chatbotRoutes, sseRoutes, slotProductRoutes, giftRoutes, testimonialRoutes, statsRoutes, loyaltyRoutes, walletTransactionRoutes } = require('./routes');

const extraOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const allowedOrigins = [config.APP_URL, config.API_URL, config.FE_URL, ...extraOrigins].filter(Boolean);

// M-5 SAFETY: trước đây cho phép `*.vercel.app` (suffix match) — bất kỳ Vercel
// deploy domain nào (kể cả attacker.Vercel.app) đều có thể gọi API. Giờ chỉ
// cho phép:
//   1. Origins trong whitelist (env)
//   2. Domain CHA (suffix *.vercel.app) — chỉ domain AutoWashPro của mình
//   3. localhost (chỉ dev)
const isDev = process.env.NODE_ENV !== 'production';
const ALLOWED_VERCEL_HOSTS = new Set([
  'autowashpro.vercel.app',
  'autowash-pro.vercel.app',
  // thêm domain Vercel cụ thể của dự án tại đây
]);

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Same-origin / server-to-server (no Origin header): cho phép.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Vercel wildcard — chỉ chấp nhận nếu parent hostname nằm trong whitelist.
    // Ví dụ: my-app-abc123.vercel.app → parent = 'my-app-abc123' hoặc
    // nếu deploy với domain gốc 'autowashpro' → autowashpro.vercel.app match.
    const vercelMatch = origin.match(/^https?:\/\/([a-z0-9-]+)\.vercel\.app$/i);
    if (vercelMatch) {
      const parentHost = vercelMatch[1];
      // Cho phép nếu parentHost nằm trong whitelist (vd: 'autowashpro' nhận
      // mọi PR-branch domain).
      if (ALLOWED_VERCEL_HOSTS.has(`${parentHost}.vercel.app`)) {
        return callback(null, true);
      }
    }

    // Localhost (chỉ dev) — production vẫn chấp nhận để tiện smoke test qua
    // browser, có thể siết lại bằng cách remove nếu muốn.
    if (isDev && origin.includes('localhost')) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
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
app.use('/api/wallet-transactions', walletTransactionRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
