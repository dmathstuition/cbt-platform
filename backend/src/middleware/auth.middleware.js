const jwt = require('jsonwebtoken');
require('dotenv').config();

const protect = (req, res, next) => {
  try {
    // Get token from request header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    // Verify the token
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Attach user info to request
    req.user = decoded;
    next();

  } catch (error) {
    res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

// Role-based access control
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied for your role' });
    }
    next();
  };
};

module.exports = { protect, allowRoles };