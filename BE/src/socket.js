const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { User } = require('./models');
const config = require('./config/env'); // Wait, looking at app.js, it's require('./config/env')

let io;

module.exports = {
  init: (httpServer) => {
    io = socketIo(httpServer, {
      cors: {
        origin: '*', // Adjust to specific frontend URL in production
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
      }
    });

    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        let token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (token) {
           token = token.replace('Bearer ', '');
        }
        
        if (!token || token === 'null' || token === 'undefined') {
          // Allow guest connection, same as sse.routes.js
          socket.userId = 'guest_' + Math.random().toString(36).substr(2, 9);
          socket.userRole = 'guest';
          return next();
        }
        
        // Use config.JWT_SECRET (app.js uses config/env, let's verify if config.JWT_SECRET is there, actually sse.routes.js used require('../config'))
        // I will use require('./config') just like sse.routes.js used require('../config')
        const cfg = require('./config');
        const decoded = jwt.verify(token, cfg.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user || user.status === 'suspended') {
          socket.userId = 'guest_' + Math.random().toString(36).substr(2, 9);
          socket.userRole = 'guest';
          return next();
        }
        
        socket.userId = String(user._id);
        socket.userRole = user.role;
        if (user.branchId) {
          socket.branchId = String(user.branchId);
        }
        next();
      } catch (error) {
        // Fallback to guest instead of rejecting, to match SSE logic
        socket.userId = 'guest_' + Math.random().toString(36).substr(2, 9);
        socket.userRole = 'guest';
        next();
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id, 'User:', socket.userId);

      // Automatically join personal user room
      if (socket.userId && !socket.userId.startsWith('guest_')) {
        socket.join(`user_${socket.userId}`);
        console.log(`Socket ${socket.id} joined room: user_${socket.userId}`);
      }

      // Automatically join manager branch room
      if (socket.userRole === 'manager' && socket.branchId) {
        socket.join(`branch_${socket.branchId}`);
        console.log(`Socket ${socket.id} joined room: branch_${socket.branchId}`);
      }

      // Automatically join admin room
      if (socket.userRole === 'admin') {
        socket.join('admin');
        console.log(`Socket ${socket.id} joined room: admin`);
      }

      // Legacy support for manual joins
      socket.on('join_user_room', (userId) => {
        if (userId) {
          const roomName = `user_${userId}`;
          socket.join(roomName);
          console.log(`Socket ${socket.id} manually joined room: ${roomName}`);
        }
      });

      socket.on('leave_user_room', (userId) => {
        if (userId) {
          const roomName = `user_${userId}`;
          socket.leave(roomName);
          console.log(`Socket ${socket.id} manually left room: ${roomName}`);
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id, 'User:', socket.userId);
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};
