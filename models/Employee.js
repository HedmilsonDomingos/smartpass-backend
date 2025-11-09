const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: String,
  email: String,
  mobile: String,
  position: String,
  department: String,
  category: String,
  company: String,
  status: { type: String, default: 'Active' },
  employeeId: String,
  qrCode: String,
  photo: { type: String, default: 'https://via.placeholder.com/150' }
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);