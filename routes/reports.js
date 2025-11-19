const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
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

// GET stats
router.get('/stats', auth, async (req, res) => {
  try {
    const { filter = 'all' } = req.query;
    
    const totalEmployees = await Employee.countDocuments();
    const activeEmployees = await Employee.countDocuments({ status: 'Active' });
    const inactiveEmployees = await Employee.countDocuments({ status: 'Inactive' });
    const totalUsers = await User.countDocuments();

    res.json({
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      totalUsers,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('GET /api/reports/stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats', message: err.message });
  }
});

// GET growth data
router.get('/growth', auth, async (req, res) => {
  try {
    const { range = '30days' } = req.query;
    let startDate = new Date();
    let groupByFormat;

    switch (range) {
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        groupByFormat = '%Y-%m-%d'; // Group by day
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        groupByFormat = '%Y-%m-%d'; // Group by day
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        groupByFormat = '%Y-%m'; // Group by month
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
        groupByFormat = '%Y-%m-%d';
    }

    const employeeGrowth = await Employee.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format data for frontend consumption (e.g., fill missing dates with 0)
    // For simplicity, we return the raw aggregated data. Frontend can handle formatting.
    res.json(employeeGrowth.map(item => ({
      date: item._id,
      employees: item.count
    })));

  } catch (err) {
    console.error('GET /api/reports/growth error:', err.message);
    res.status(500).json({ error: 'Failed to fetch growth data', message: err.message });
  }
});

// GET activity log
router.get('/activity', auth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Fetch recent employee creations
    const recentEmployees = await Employee.find({})
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('name createdAt');

    const employeeActivities = recentEmployees.map(emp => ({
      user: 'System/Admin', // Assuming creation is done by an admin or system
      name: emp.name,
      action: `New Employee Added: ${emp.name}`,
      timestamp: emp.createdAt,
    }));

    // For a more comprehensive log, we would need a dedicated ActivityLog model.
    // For now, we return the recent employee additions as the activity log.
    
    // Sort by timestamp and limit the final result
    const sortedActivities = employeeActivities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, parseInt(limit));

    res.json(sortedActivities);
  } catch (err) {
    console.error('GET /api/reports/activity error:', err.message);
    res.status(500).json({ error: 'Failed to fetch activity log', message: err.message });
  }
});

// GET custom report data
router.post('/custom', auth, async (req, res) => {
  try {
    const { status, dateFrom, dateTo } = req.body;
    
    let query = {};

    // 1. Filter by Status
    if (status && status !== 'All') {
      // Use status as received (e.g., 'Active' or 'Inactive')
      query.status = status;
    }

    // 2. Filter by Date Range (using createdAt)
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        // Add one day to dateTo to include the entire day
        const endOfDay = new Date(dateTo);
        endOfDay.setDate(endOfDay.getDate() + 1);
        query.createdAt.$lt = endOfDay;
      }
    }

    // Fetch filtered employees
    const employees = await Employee.find(query).select('-qrCode -__v').sort({ createdAt: -1 });

    // Calculate summary
    const total = employees.length;
    // Ensure comparison uses capitalized status 'Active'
    const active = employees.filter(e => e.status === 'Active').length;
    const inactive = total - active;

    // Return structured report data
    res.json({
      summary: { total, active, inactive },
      results: employees,
      filters: req.body,
    });

  } catch (err) {
    console.error('POST /api/reports/custom error:', err.message);
    res.status(500).json({ error: 'Failed to generate custom report', message: err.message });
  }
});

// Placeholder for export endpoints (if needed later)
router.post('/export/pdf', auth, (req, res) => {
  // In a real app, this would generate and stream a PDF
  res.status(200).json({ message: 'PDF export initiated (placeholder)' });
});

router.post('/export/csv', auth, (req, res) => {
  // In a real app, this would generate and stream a CSV
  res.status(200).json({ message: 'CSV export initiated (placeholder)' });
});

module.exports = router;
