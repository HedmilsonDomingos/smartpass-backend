const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// REGISTER
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ username, password: hashedPassword });
    await user.save();

    res.json({ message: "User created successfully" });
  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ message: "Server error - check MongoDB URI" });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  try {
    const user = await User.findOne({ username });
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

module.exports = router;
