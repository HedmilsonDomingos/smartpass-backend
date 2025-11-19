const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { Parser } = require('json2csv');
require('dotenv').config();

// Middleware
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

// GET all activity logs
router.get('/', auth, async (req, res) => {
  const { page = 1, limit = 10, search, action, dateRange } = req.query;
  const query = {};

  if (search) {
    const users = await User.find({
      $or: [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
      ],
    }).select('_id');
    const userIds = users.map(user => user._id);
    query.user = { $in: userIds };
  }
  if (action) {
    query.action = action;
  }
  if (dateRange) {
    let startDate;
    const now = new Date();
    
    if (dateRange === 'Last 7 Days') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (dateRange === 'Last 30 Days') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
    } else if (dateRange === 'All Time') {
      // Skip date filtering
    }
    
    if (startDate) {
      query.createdAt = { $gte: startDate };
    }
  }

  try {
    const logs = await Activity.find(query)
      .populate('user', 'name profilePic')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const totalPages = Math.ceil(await Activity.countDocuments(query) / limit);

    res.json({ logs, totalPages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Export activity logs to CSV
router.get('/export', auth, async (req, res) => {
  try {
    const logs = await Activity.find().populate('user', 'name').sort({ createdAt: -1 });
    const fields = [
      { label: 'User', value: 'user.name' },
      { label: 'Action', value: 'action' },
      { label: 'Target', value: 'target' },
      { label: 'Date', value: 'createdAt' },
    ];
    const json2csv = new Parser({ fields });
    const csv = json2csv.parse(logs);
    res.header('Content-Type', 'text/csv');
    res.attachment('activity-log.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export activity log' });
  }
});

module.exports = router;
