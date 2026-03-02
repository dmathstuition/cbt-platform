const jwt = require('jsonwebtoken');
require('dotenv').config();

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const token = authHeader.split(' ')[1];
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('JWT_ACCESS_SECRET exists:', !!process.env.JWT_ACCESS_SECRET);
    console.log('Token first 20 chars:', token.substring(0, 20));
    
    const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
    console.log('Using secret:', !!secret);
    
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();

  } catch (error) {
    console.error('Token verify error:', error.message);
    res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied for your role' });
    }
    next();
  };
};

module.exports = { protect, allowRoles };