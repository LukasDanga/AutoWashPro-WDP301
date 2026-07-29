require('dotenv').config();
require('./src/config/dns'); // Override DNS for MongoDB Atlas SRV resolution
const app = require('./src/app');
const config = require('./src/config');
const { connectDB } = require('./src/config/db');
const { startReminderJob } = require('./src/jobs/reminder.job');
const { startBirthdayJob } = require('./src/jobs/birthday.job');
const { startSlotPackExpireJob } = require('./src/jobs/slotPackExpire.job');
const { startAutoCancelJob } = require('./src/jobs/autoCancel.job');

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

const startServer = async () => {
  await connectDB(config.MONGODB_URI);
  const server = app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT} [${config.NODE_ENV}]`);
    console.log(`Swagger UI: http://localhost:${config.PORT}/api-docs`);

    // Start background jobs
    startReminderJob();
    startBirthdayJob();
    startSlotPackExpireJob();
    startAutoCancelJob();
  });

  // Initialize Socket.IO
  const socket = require('./src/socket');
  socket.init(server);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${config.PORT} đã được sử dụng. Đang thử kill tiến trình cũ...`);
      const { execSync } = require('child_process');
      try {
        const cmd = process.platform === 'win32'
          ? `netstat -ano | findstr ":${config.PORT} "`
          : `lsof -ti:${config.PORT}`;
        const result = execSync(cmd, { encoding: 'utf8', timeout: 5000 });
        const lines = result.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[parts.length - 1]);
          if (pid && pid !== process.pid) {
            process.kill(pid, 'SIGTERM');
            console.log(`Đã kill tiến trình PID ${pid}`);
          }
        }
        setTimeout(() => {
          console.log('Khởi động lại server...');
          app.listen(config.PORT, () => {
            console.log(`Server running on port ${config.PORT} [${config.NODE_ENV}]`);
            startReminderJob();
            startBirthdayJob();
            startSlotPackExpireJob();
            startAutoCancelJob();
          }).on('error', (e2) => {
            console.error(`Không thể khởi động server trên port ${config.PORT}:`, e2.message);
            process.exit(1);
          });
        }, 2000);
      } catch (e) {
        console.error(`Không thể kill tiến trình cũ. Vui lòng chạy lại với port khác: PORT=${config.PORT + 1} node server.js`);
        process.exit(1);
      }
    } else {
      console.error('Server error:', err.message);
      process.exit(1);
    }
  });
};

startServer();
