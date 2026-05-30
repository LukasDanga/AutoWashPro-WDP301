require('dotenv').config();
const app = require('./src/app');
const config = require('./src/config');
const { connectDB } = require('./src/config/db');

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

const startServer = async () => {
  await connectDB(config.MONGODB_URI);
  app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT} [${config.NODE_ENV}]`);
    console.log(`Swagger UI: http://localhost:${config.PORT}/api-docs`);
  });
};

startServer();
