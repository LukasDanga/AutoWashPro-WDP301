require('dotenv').config();
require('./src/config/dns'); // Override DNS for MongoDB Atlas SRV resolution
const app = require('./src/app');
const config = require('./src/config');
const { connectDB } = require('./src/config/db');
const { startReminderJob } = require('./src/jobs/reminder.job');
const { startBirthdayJob } = require('./src/jobs/birthday.job');

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

  // Start background jobs
  startReminderJob();
  startBirthdayJob();
};

startServer();
