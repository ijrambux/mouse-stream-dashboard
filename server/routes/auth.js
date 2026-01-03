const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock users (في الإنتاج تستخدم قاعدة بيانات)
const users = [
  {
    id: 1,
    username: "admin",
    email: "admin@mousestream.com",
    password: "$2a$10$YourHashedPasswordHere", // admin123
    role: "admin",
    status: "active",
    avatar: "👑"
  }
];

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if user exists
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = {
      id: users.length + 1,
      username,
      email,
      password: hashedPassword,
      role: 'viewer',
      status: 'active',
      avatar: '👤',
      createdAt: new Date(),
      lastLogin: new Date()
    };
    
    users.push(newUser);
    
    // Generate JWT
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check status
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }
    
    // Verify password (في الإنتاج الحقيقي)
    // const validPassword = await bcrypt.compare(password, user.password);
    // if (!validPassword) {
    //   return res.status(401).json({ error: 'Invalid credentials' });
    // }
    
    // For demo, accept any password
    const validPassword = true;
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    user.lastLogin = new Date();
    
    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token
router.post('/verify', (req, res) => {
  const token = req.body.token || req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    res.json({
      success: true,
      data: decoded
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  // In a real app, you might want to blacklist the token
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
