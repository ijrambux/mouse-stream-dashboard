const express = require('express');
const router = express.Router();

// Mock analytics data
const generateAnalytics = () => {
  const now = new Date();
  const days = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
  
  return {
    overview: {
      totalViews: 12543,
      activeUsers: 156,
      totalChannels: 24,
      bandwidth: '4.2 GB',
      uptime: '99.8%'
    },
    viewership: {
      labels: days,
      data: [1200, 1900, 3000, 5000, 2000, 3000, 4500]
    },
    topChannels: [
      { name: 'beIN MAX 1', views: 2450, growth: '+12%' },
      { name: 'Rakuten Movies', views: 1980, growth: '+8%' },
      { name: 'EL BILAD TV', views: 1560, growth: '+15%' },
      { name: 'Action Movies', views: 1320, growth: '+5%' },
      { name: 'Algerie 6', views: 980, growth: '+3%' }
    ],
    peakHours: [
      { hour: '12 ص', viewers: 100 },
      { hour: '2 ص', viewers: 150 },
      { hour: '4 ص', viewers: 200 },
      { hour: '6 ص', viewers: 300 },
      { hour: '8 ص', viewers: 500 },
      { hour: '10 ص', viewers: 800 },
      { hour: '12 م', viewers: 1200 },
      { hour: '2 م', viewers: 1800 },
      { hour: '4 م', viewers: 2200 },
      { hour: '6 م', viewers: 2500 },
      { hour: '8 م', viewers: 2100 },
      { hour: '10 م', viewers: 1500 }
    ],
    geographic: [
      { country: 'الجزائر', viewers: 4500, percentage: 36 },
      { country: 'المغرب', viewers: 2800, percentage: 22 },
      { country: 'تونس', viewers: 1900, percentage: 15 },
      { country: 'مصر', viewers: 1500, percentage: 12 },
      { country: 'السعودية', viewers: 900, percentage: 7 },
      { country: 'أخرى', viewers: 943, percentage: 8 }
    ],
    qualityStats: [
      { quality: '4K', percentage: 15 },
      { quality: 'FHD', percentage: 35 },
      { quality: 'HD', percentage: 40 },
      { quality: 'SD', percentage: 10 }
    ],
    updatedAt: now.toISOString()
  };
};

// Get analytics overview
router.get('/', (req, res) => {
  const analytics = generateAnalytics();
  res.json({
    success: true,
    data: analytics,
    timestamp: new Date().toISOString()
  });
});

// Get real-time stats
router.get('/realtime', (req, res) => {
  const stats = {
    activeStreams: Math.floor(Math.random() * 20) + 5,
    currentViewers: Math.floor(Math.random() * 500) + 100,
    bandwidth: `${(Math.random() * 10).toFixed(2)} Mbps`,
    serverLoad: `${(Math.random() * 100).toFixed(1)}%`,
    timestamp: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: stats
  });
});

// Get channel analytics
router.get('/channels/:id', (req, res) => {
  const channelId = parseInt(req.params.id);
  
  const channelStats = {
    channelId,
    dailyViews: Array.from({ length: 7 }, () => Math.floor(Math.random() * 1000)),
    audienceRetention: `${Math.floor(Math.random() * 60) + 20}%`,
    peakTimes: ['19:00', '21:00', '23:00'],
    geographic: [
      { country: 'الجزائر', percentage: Math.floor(Math.random() * 50) + 30 },
      { country: 'فرنسا', percentage: Math.floor(Math.random() * 30) + 10 },
      { country: 'كندا', percentage: Math.floor(Math.random() * 20) + 5 }
    ],
    deviceUsage: [
      { device: 'موبايل', percentage: 45 },
      { device: 'كمبيوتر', percentage: 35 },
      { device: 'تلفاز', percentage: 20 }
    ],
    updatedAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: channelStats
  });
});

// Export analytics data
router.get('/export', (req, res) => {
  const analytics = generateAnalytics();
  const format = req.query.format || 'json';
  
  if (format === 'csv') {
    // Generate CSV (simplified)
    let csv = 'Metric,Value\n';
    csv += `Total Views,${analytics.overview.totalViews}\n`;
    csv += `Active Users,${analytics.overview.activeUsers}\n`;
    csv += `Total Channels,${analytics.overview.totalChannels}\n`;
    csv += `Bandwidth,${analytics.overview.bandwidth}\n`;
    
    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename=analytics.csv');
    res.send(csv);
  } else {
    res.json({
      success: true,
      data: analytics
    });
  }
});

module.exports = router;
