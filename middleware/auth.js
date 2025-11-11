// middleware/auth.js
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  // Accept any case: Authorization, authorization, AUTHORIZATION, etc.
  let authHeader = req.headers.authorization || 
                   req.headers.Authorization || 
                   req.headers['authorization'] || 
                   req.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smartpass2025supersecret');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid or expired' });
  }
};

module.exports = auth;