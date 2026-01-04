const jwt = require('jsonwebtoken');
const Farmer = require('../models/farmer.model');
const Admin = require('../models/admin.model');

/**
 * Verify JWT token middleware
 * Protects routes by validating JWT tokens
 */
const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1]; // "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'krushi_mithra_secret_key_2025_secure_token'
    );

    // Attach user info to request
    req.user = decoded;

    // Fetch full user data based on type
    if (decoded.type === 'farmer' || decoded.role === 'farmer') {
      const farmer = await Farmer.findById(decoded.id).select('-password');
      if (!farmer) {
        return res.status(401).json({
          success: false,
          message: 'Farmer not found'
        });
      }
      req.farmer = farmer;
    } else if (decoded.type === 'admin' || decoded.role === 'admin' || decoded.role === 'super_admin') {
      const admin = await Admin.findById(decoded.id).select('-password');
      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Admin not found'
        });
      }
      req.admin = admin;
    }

    next();
  } catch (error) {
    console.error('[AUTH] Token verification failed:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

/**
 * Verify farmer-specific access
 */
const verifyFarmer = async (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'farmer' && req.user.type !== 'farmer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Farmers only.'
      });
    }
    next();
  });
};

/**
 * Verify admin-specific access
 */
const verifyAdmin = async (req, res, next) => {
  verifyToken(req, res, () => {
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admins only.'
      });
    }
    next();
  });
};

module.exports = {
  verifyToken,
  verifyFarmer,
  verifyAdmin
};
