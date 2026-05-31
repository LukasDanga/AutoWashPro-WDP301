const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AutoWashPro API',
      version: '1.0.0',
      description: 'Backend API for WashPro - Car Wash Booking System',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'manager', 'staff', 'customer'] },
            status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Vehicle: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            licensePlate: { type: 'string' },
            vehicleType: { type: 'string', enum: ['sedan', 'suv', 'pickup', 'van', 'motorcycle'] },
            brand: { type: 'string' },
            model: { type: 'string' },
            color: { type: 'string' },
            year: { type: 'number' },
            isDefault: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
  },
  apis: [
    path.resolve(__dirname, '../routes/authRoutes.js'),
    path.resolve(__dirname, '../routes/vehiclesRoutes.js'),
    path.resolve(__dirname, '../routes/branch.routes.js'),
    path.resolve(__dirname, '../routes/package.routes.js'),
    path.resolve(__dirname, '../routes/booking.routes.js'),
    path.resolve(__dirname, '../routes/payment.routes.js'),
  ],
};

module.exports = swaggerJsdoc(options);
