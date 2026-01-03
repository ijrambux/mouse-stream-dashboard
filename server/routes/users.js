const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock Database
let users = [
  {
    id: 1,
    username: "admin",
    email: "admin@mousestream.com",
    password: "$2a$10$YourHashedPasswordHere", // admin123
    role: "admin",
    status: "active",
    lastLogin: new Date(),
    createdAt: new Date(),
    avatar: "👑",
    permissions: ["all"]
  }
];

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Get all users (Admin only)
router.get('/', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const { page = 1, limit = 10, role, status } = req.query;
  
  let filteredUsers = [...users];
  
  if (role) {
    filteredUsers = filteredUsers.filter(user => user.role === role);
  }
  
  if (status) {
    filteredUsers = filteredUsers.filter(user => user.status === status);
  }
  
  // Remove passwords from response
  const usersWithoutPasswords = filteredUsers.map(({ password, ...user }) => user);
  
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedUsers = usersWithoutPasswords.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedUsers,
    pagination: {
      total: filteredUsers.length,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(filteredUsers.length / limit)
    }
  });
});

// Get user profile
router.get('/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const { password, ...userWithoutPassword } = user;
  
  res.json({
    success: true,
    data: userWithoutPassword
  });
});

// Create new user (Admin only)
router.post('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const { username, email, password, role = 'viewer', avatar = '👤' } = req.body;
  
  // Check if user exists
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }
  
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const newUser = {
    id: users.length + 1,
    username,
    email,
    password: hashedPassword,
    role,
    status: 'active',
    avatar,
    createdAt: new Date(),
    lastLogin: null,
    permissions: role === 'admin' ? ['all'] : ['view']
  };
  
  users.push(newUser);
  
  // Emit WebSocket event
  req.app.get('io').emit('user:created', { id: newUser.id, username: newUser.username, role: newUser.role });
  
  const { password: _, ...userWithoutPassword } = newUser;
  
  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: userWithoutPassword
  });
});

// Update user
router.put('/:id', authenticateToken, async (req, res) => {
  const userId = parseInt(req.params.id);
  
  // Check permissions
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const { password, ...updateData } = req.body;
  
  // Update password if provided
  if (password) {
    updateData.password = await bcrypt.hash(password, 10);
  }
  
  users[userIndex] = {
    ...users[userIndex],
    ...updateData,
    updatedAt: new Date()
  };
  
  const { password: _, ...userWithoutPassword } = users[userIndex];
  
  // Emit WebSocket event
  req.app.get('io').emit('user:updated', { id: userId, ...updateData });
  
  res.json({
    success: true,
    message: 'User updated successfully',
    data: userWithoutPassword
  });
});

// Delete user (Admin only)
router.delete('/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const userIndex = users.findIndex(u => u.id === parseInt(req.params.id));
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const deletedUser = users.splice(userIndex, 1)[0];
  
  // Emit WebSocket event
  req.app.get('io').emit('user:deleted', { id: deletedUser.id, username: deletedUser.username });
  
  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

// Get user statistics
router.get('/stats', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const viewerUsers = users.filter(u => u.role === 'viewer').length;
  
  const today = new Date();
  const newToday = users.filter(u => {
    const createdDate = new Date(u.createdAt);
    return createdDate.toDateString() === today.toDateString();
  }).length;
  
  res.json({
    success: true,
    data: {
      total: totalUsers,
      active: activeUsers,
      roles: {
        admin: adminUsers,
        viewer: viewerUsers
      },
      newToday: newToday,
      lastWeekGrowth: Math.floor(Math.random() * 20) + 5
    }
  });
});

module.exports = router;
