const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  cargo: { type: String },
  photo: { type: String },
  role: { type: String, enum: ['Administrator', 'Manager', 'Viewer'], default: 'Viewer' },
  forcePasswordChange: { type: Boolean, default: true },
  permissions: {
    addEmployees: { type: Boolean, default: false },
    editEmployees: { type: Boolean, default: false },
    deactivateEmployees: { type: Boolean, default: false },
    viewEmployees: { type: Boolean, default: true },
    generateQRCodes: { type: Boolean, default: false },
    revokeQRCodes: { type: Boolean, default: false },
    manageUsers: { type: Boolean, default: false },
  },
  settings: {
    darkMode: { type: Boolean, default: false },
    language: { type: String, default: 'English (United States)' },
    timezone: { type: String, default: '(GMT+01:00) West Africa Time (Luanda)' },
  },
  password: { type: String, required: true },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.virtual('name').get(function() {
  return [this.firstName, this.lastName].filter(Boolean).join(' ');
});

module.exports = mongoose.model('User', userSchema);
