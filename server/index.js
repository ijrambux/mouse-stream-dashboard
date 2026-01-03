const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://*.m3u8", "http://*.m3u8", "ws:", "wss:"]
    }
  }
}));
app.use(compression());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Static Files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/channels', require('./routes/channels'));
app.use('/api/users', require('./routes/users'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/auth', require('./routes/auth'));

// Serve Frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`
    🚀 Mouse Stream Dashboard Server
    ================================
    📍 Environment: ${process.env.NODE_ENV || 'development'}
    🌐 URL: http://localhost:${PORT}
    ⏰ Time: ${new Date().toISOString()}
    📊 Health Check: http://localhost:${PORT}/health
  `);
});

// WebSocket (Socket.io)
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.io Events
io.on('connection', (socket) => {
  console.log('🔌 New WebSocket connection:', socket.id);

  // Live stats updates
  socket.on('subscribe:stats', () => {
    setInterval(() => {
      socket.emit('stats:update', {
        activeUsers: Math.floor(Math.random() * 100) + 50,
        activeStreams: Math.floor(Math.random() * 20) + 5,
        bandwidth: `${(Math.random() * 10).toFixed(2)} GB`,
        timestamp: new Date().toISOString()
      });
    }, 5000);
  });

  // Channel updates
  socket.on('subscribe:channels', () => {
    setInterval(() => {
      socket.emit('channels:update', {
        newChannels: Math.floor(Math.random() * 3),
        updatedChannels: Math.floor(Math.random() * 5),
        timestamp: new Date().toISOString()
      });
    }, 10000);
  });

  socket.on('disconnect', () => {
    console.log('🔌 WebSocket disconnected:', socket.id);
  });
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = { app, server, io };
