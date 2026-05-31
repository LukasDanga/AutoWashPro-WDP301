const config = require('./env');
const { connectDB } = require('./db');
const swaggerSpec = require('./swagger');

module.exports = { ...config, connectDB, swaggerSpec };
