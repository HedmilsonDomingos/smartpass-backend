const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

// Middleware: Auth with Bearer token
const auth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallbacksecret123');
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// GET all users (with pagination & search)
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (page - 1) * limit;

    const query = search
      ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { role: { $regex: search, $options: 'i' } },
        ],
      }
      : {};

    const users = await User.find(query)
      .select('_id name email role isActive createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('GET /api/users error:', err.message);
    res.status(500).json({ error: 'Failed to fetch users', message: err.message });
  }
});

// GET single user
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('GET /api/users/:id error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user', message: err.message });
  }
});

// CREATE user
router.post('/', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      photo,
      tempPassword,
      role,
      cargo,
      forcePasswordChange,
      permissions,
    } = req.body;

    if (!firstName || !lastName || !email || !tempPassword) {
      return res.status(400).json({ error: 'First name, last name, email, and password are required' });
    }

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // Create user
    const user = new User({
      firstName,
      lastName,
      email,
      photo,
      password: hashedPassword,
      role,
      cargo,
      forcePasswordChange,
      permissions,
    });
    await user.save();

    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      message: 'User created successfully'
    });
  } catch (err) {
    console.error('POST /api/users error:', err.message);
    res.status(500).json({ error: 'Failed to create user', message: err.message });
  }
});

// UPDATE user
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      name,
      email,
      photo,
      password,
      role,
      cargo,
      isActive,
      forcePasswordChange,
      permissions,
    } = req.body;

    const updateData = {
      name,
      email,
      photo,
      role,
      cargo,
      isActive,
      forcePasswordChange,
      permissions,
    };

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user, message: 'User updated successfully' });
  } catch (err) {
    console.error('PUT /api/users/:id error:', err.message);
    res.status(500).json({ error: 'Failed to update user', message: err.message });
  }
});

// DELETE user
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/users/:id error:', err.message);
    res.status(500).json({ error: 'Failed to delete user', message: err.message });
  }
});

// GET current user's settings
router.get('/me/settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('settings');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.settings);
  } catch (err) {
    console.error('GET /me/settings error:', err.message);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// UPDATE current user's settings
router.put('/me/settings', auth, async (req, res) => {
  try {
    const { darkMode, language, timezone } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update only the fields that are present in the request body
    if (typeof darkMode !== 'undefined') {
      user.settings.darkMode = darkMode;
    }
    if (language) {
      user.settings.language = language;
    }
    if (timezone) {
      user.settings.timezone = timezone;
    }

    await user.save();
    res.json(user.settings);
  } catch (err) {
    console.error('PUT /me/settings error:', err.message);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
