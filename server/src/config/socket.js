const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const allowOrigin = require('./cors');

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: allowOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const onlineUsers = new Map();

  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth.token;
      if (!token && socket.handshake.headers.cookie) {
        const cookieMatch = socket.handshake.headers.cookie.match(/token=([^;]+)/);
        if (cookieMatch) {
          token = cookieMatch[1];
        }
      }

      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  const handlers = require('../socket/handlers');
  
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);
    handlers(io, socket, onlineUsers);
  });

  return io;
};

module.exports = setupSocket;
