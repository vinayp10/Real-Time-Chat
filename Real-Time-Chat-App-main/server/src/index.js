require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const setupSocket = require('./config/socket');

const server = http.createServer(app);

// Setup Socket.IO
setupSocket(server);

// Start server
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Server startup failed:', error.message);
  process.exit(1);
});
