const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

// Mock Database (يمكن استبدالها بقاعدة بيانات حقيقية)
let channels = [
  {
    id: 1,
    name: "beIN MAX 1 4K",
    url: "http://fr.ottv.pro/live/4476647188407159/4476647188407159/432904.m3u8",
    type: "sports",
    quality: "4K",
    country: "DZ",
    language: "العربية",
    status: "active",
    views: 1245,
    logo: "🏆",
    description: "قناة رياضية متخصصة في البث المباشر",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  // ... المزيد من القنوات
];

// Get all channels
router.get('/', (req, res) => {
  const { type, status, search, page = 1, limit = 10 } = req.query;
  
  let filteredChannels = [...channels];
  
  // Filter by type
  if (type) {
    filteredChannels = filteredChannels.filter(channel => channel.type === type);
  }
  
  // Filter by status
  if (status) {
    filteredChannels = filteredChannels.filter(channel => channel.status === status);
  }
  
  // Search
  if (search) {
    filteredChannels = filteredChannels.filter(channel =>
      channel.name.toLowerCase().includes(search.toLowerCase()) ||
      channel.description.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedChannels = filteredChannels.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedChannels,
    pagination: {
      total: filteredChannels.length,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(filteredChannels.length / limit)
    },
    timestamp: new Date().toISOString()
  });
});

// Get single channel
router.get('/:id', (req, res) => {
  const channel = channels.find(c => c.id === parseInt(req.params.id));
  
  if (!channel) {
    return res.status(404).json({
      success: false,
      error: 'Channel not found'
    });
  }
  
  res.json({
    success: true,
    data: channel
  });
});

// Create new channel
router.post('/', [
  body('name').notEmpty().withMessage('Channel name is required'),
  body('url').notEmpty().withMessage('Channel URL is required'),
  body('type').notEmpty().withMessage('Channel type is required'),
  body('quality').notEmpty().withMessage('Channel quality is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const newChannel = {
    id: channels.length + 1,
    ...req.body,
    status: req.body.status || 'active',
    views: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  channels.unshift(newChannel);
  
  // Emit WebSocket event
  req.app.get('io').emit('channel:created', newChannel);
  
  res.status(201).json({
    success: true,
    message: 'Channel created successfully',
    data: newChannel
  });
});

// Update channel
router.put('/:id', [
  body('name').optional().notEmpty().withMessage('Channel name cannot be empty'),
  body('url').optional().notEmpty().withMessage('Channel URL cannot be empty')
], (req, res) => {
  const channelIndex = channels.findIndex(c => c.id === parseInt(req.params.id));
  
  if (channelIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Channel not found'
    });
  }
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  channels[channelIndex] = {
    ...channels[channelIndex],
    ...req.body,
    updatedAt: new Date()
  };
  
  // Emit WebSocket event
  req.app.get('io').emit('channel:updated', channels[channelIndex]);
  
  res.json({
    success: true,
    message: 'Channel updated successfully',
    data: channels[channelIndex]
  });
});

// Delete channel
router.delete('/:id', (req, res) => {
  const channelIndex = channels.findIndex(c => c.id === parseInt(req.params.id));
  
  if (channelIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Channel not found'
    });
  }
  
  const deletedChannel = channels.splice(channelIndex, 1)[0];
  
  // Emit WebSocket event
  req.app.get('io').emit('channel:deleted', deletedChannel);
  
  res.json({
    success: true,
    message: 'Channel deleted successfully',
    data: deletedChannel
  });
});

// Test channel stream
router.post('/:id/test', (req, res) => {
  const channel = channels.find(c => c.id === parseInt(req.params.id));
  
  if (!channel) {
    return res.status(404).json({
      success: false,
      error: 'Channel not found'
    });
  }
  
  // Simulate stream testing
  setTimeout(() => {
    const isWorking = Math.random() > 0.3;
    
    res.json({
      success: true,
      data: {
        channelId: channel.id,
        channelName: channel.name,
        url: channel.url,
        isWorking,
        responseTime: `${Math.floor(Math.random() * 2000) + 500}ms`,
        quality: channel.quality,
        testedAt: new Date().toISOString()
      }
    });
  }, 1000);
});

// Get channel statistics
router.get('/:id/stats', (req, res) => {
  const channel = channels.find(c => c.id === parseInt(req.params.id));
  
  if (!channel) {
    return res.status(404).json({
      success: false,
      error: 'Channel not found'
    });
  }
  
  const stats = {
    channelId: channel.id,
    channelName: channel.name,
    totalViews: channel.views,
    dailyViews: Math.floor(Math.random() * 500),
    peakHour: "19:00 - 22:00",
    averageWatchTime: `${Math.floor(Math.random() * 60) + 10} minutes`,
    lastWeekViews: Array.from({ length: 7 }, () => Math.floor(Math.random() * 1000)),
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: stats
  });
});

module.exports = router;
