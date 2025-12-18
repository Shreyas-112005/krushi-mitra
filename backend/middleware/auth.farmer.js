const jwt = require('jsonwebtoken');
const jsonStorage = require('../utils/jsonStorage');

/**
 * Verify Farmer JWT Token
 * Middleware to authenticate farmer requests
 */
const verifyFarmerToken = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if farmer exists in JSON storage
    if (process.env.USE_JSON_STORAGE === 'true') {
      const farmer = await jsonStorage.findFarmerById(decoded.id);
      
      if (!farmer) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Farmer not found.'
        });
      }

      // Check if farmer is approved
      if (farmer.status !== 'approved') {
        return res.status(403).json({
          success: false,
          message: 'Your account is awaiting admin approval.',
          status: farmer.status
        });
      }

      // Attach farmer info to request
      req.user = {
        id: farmer._id,
        email: farmer.email,
        fullName: farmer.fullName,
        role: 'FARMER'
      };
      req.farmer = farmer;
    } else {
      // MongoDB mode - attach decoded info
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: 'FARMER'
      };
    }

    next();
  } catch (error) {
    console.error('[FARMER AUTH] Token verification failed:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Token verification failed.'
    });
  }
};

module.exports = {
  verifyFarmerToken
};
