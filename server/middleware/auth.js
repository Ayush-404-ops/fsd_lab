const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_super_secret_key_here';

/**
 * Middleware to authenticate JWT token from Authorization header.
 * Attaches decoded payload { id, username, email, role } to req.user.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      error: 'Access denied. Authentication token missing.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired authentication token.'
    });
  }
}

/**
 * Higher-order middleware to enforce Role-Based Access Control (RBAC).
 * Usage: requireRole('admin') or requireRole('developer', 'admin') or requireRole(['curator', 'admin'])
 */
function requireRole(...allowedRoles) {
  // Flatten array arguments if passed as an array or rest parameters
  const roles = allowedRoles.flat().map((r) => String(r).toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required.'
      });
    }

    const userRole = (req.user.role || '').toLowerCase();

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: `Forbidden. Access requires one of the following roles: [${roles.join(', ')}]. Your role: "${userRole}".`
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole
};
