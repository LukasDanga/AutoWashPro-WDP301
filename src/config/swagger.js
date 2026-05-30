const swaggerJsdoc = require('swagger-jsdoc');

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
        url: 'http://localhost:3000',
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
            email: { type: 'string' },
            fullName: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['customer', 'admin'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Vehicle: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            licensePlate: { type: 'string' },
            brand: { type: 'string' },
            model: { type: 'string' },
            color: { type: 'string' },
            vehicleType: { type: 'string', enum: ['sedan', 'suv', 'pickup', 'van', 'other'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
