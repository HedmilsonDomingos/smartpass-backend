const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const generateQRCode = require('../utils/generateQR');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware
const auth = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// GET all employees
router.get('/', auth, async (req, res) => {
  const employees = await Employee.find();
  res.json(employees);
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
router.get('/public-employee/:id', async (req, res) => {
  const emp = await Employee.findById(req.params.id);
  if (!emp) return res.status(404).json({ error: 'Not found' });
  res.json({
    name: emp.name,
    position: emp.position,
    department: emp.department,
    status: emp.status,
    photo: emp.photo
  });
});

module.exports = router;