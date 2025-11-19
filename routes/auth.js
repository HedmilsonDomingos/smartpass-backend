const auth = require('../middleware/auth');  // ← ADD THIS LINE
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');


// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET || 'fallbacksecret123', 
      { expiresIn: '7d' }
    );
    res.json({ token, message: "Login successful" });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error - check logs" });
  }
}); // FORCE UPDATE

// GET logged-in user profile
router.get('/me', auth, async (req, res) => {
  try {
    // req.user is set by the auth middleware (backend/middleware/auth.js)
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('GET /api/auth/me error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; // FORCE UPDATE
