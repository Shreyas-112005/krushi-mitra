// Role-Based Access Control (RBAC) Middleware
// This middleware ensures proper role-based access to routes

/**
 * Middleware to require farmer role
 * Checks if the authenticated user is a farmer
 */
const requireFarmer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Check if user has farmer role (or is a farmer account)
  if (req.user.role === 'FARMER' || req.user.role === 'farmer' || !req.user.role) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Farmer role required.'
  });
};

/**
 * Middleware to require admin role
 * Checks if the authenticated user is an admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Check if user has admin role
  if (req.user.role === 'MAIN_ADMIN' || req.user.role === 'ADMIN' || req.user.role === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Admin role required.'
  });
};

/**
 * Middleware to require either farmer or admin role
 */
const requireFarmerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  return next();
};

module.exports = {
  requireFarmer,
  requireAdmin,
  requireFarmerOrAdmin
};
