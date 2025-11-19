const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const generateQRCode = require('../utils/generateQR');
const jwt = require('jsonwebtoken');
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

// GET all employees
router.get('/', auth, async (req, res) => {
  const { company, status, search, page = 1, limit = 10 } = req.query;
  const query = {};
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  if (company) {
    query.company = company;
  }

  if (status) {
    // Status can be 'Active' or 'Inactive'. If status is provided, use it directly.
    // If the user wants ALL, they should omit the status query parameter.
    query.status = status;
  }

  if (search) {
    const searchRegex = new RegExp(search, 'i');
    // Assuming the frontend search input is used for department or company search
    query.$or = [
      { department: searchRegex },
      { company: searchRegex },
      // Also include search by name or ID if the frontend search input is used for that too
      { name: searchRegex },
      { employeeId: searchRegex },
    ];
  }

  try {
    const totalEmployees = await Employee.countDocuments(query);
    const totalPages = Math.ceil(totalEmployees / limitNumber);

    const employees = await Employee.find(query)
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    res.json({
      employees,
      totalPages,
      currentPage: pageNumber,
      totalEmployees,
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// GET one employee
router.get('/:id', auth, async (req, res) => {
  const emp = await Employee.findById(req.params.id);
  res.json(emp);
});

// CREATE employee
router.post('/', auth, async (req, res) => {
  let emp = new Employee(req.body);
  emp.employeeId = 'EMP' + Date.now().toString().slice(-6);
  emp.qrCode = await generateQRCode(emp._id);
  await emp.save();
  res.json(emp);
});

// UPDATE
router.put('/:id', auth, async (req, res) => {
  const emp = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(emp);
});

// DELETE
router.delete('/:id', auth, async (req, res) => {
  await Employee.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// PUBLIC: Get employee by ID (no auth)
router.get('/public/:slug', async (req, res) => {
  const slug = req.params.slug;
  let emp = null;

  // 1. Try finding by MongoDB _id (if it looks like one)
  if (slug.match(/^[0-9a-fA-F]{24}$/)) {
    emp = await Employee.findById(slug);
  }

  // 2. If not found by _id, try finding by custom employeeId
  if (!emp) {
    emp = await Employee.findOne({ employeeId: slug });
  }

  if (!emp) return res.status(404).json({ error: 'Not found' });

  // Return only public fields
  res.json({
    name: emp.name,
    cargo: emp.cargo,
    department: emp.department,
    status: emp.status,
    photo: emp.photo,
    company: emp.company,
    idCardExpiration: emp.idCardExpirationDate, // Use the correct field name from model
  });
});

module.exports = router;