const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: String,
  email: String,
  mobile: String,
  cargo: String,
  department: String,
  company: String,
  officeLocation: String,
  status: { type: String, default: 'Active' },
  employeeId: String,
  qrCode: String,
  idCardExpirationDate: Date,
  photo: { type: String, default: 'https://via.placeholder.com/150' }
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);