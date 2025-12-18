/**
 * Validation Middleware
 * Contains validation functions for various request inputs
 */

/**
 * Validate Profile Update Data
 */
const validateProfileUpdate = (req, res, next) => {
  const { fullName, mobile, location, cropType, language } = req.body;

  if (fullName && fullName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Full name must be at least 2 characters'
    });
  }

  if (mobile && !/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: 'Mobile number must be 10 digits'
    });
  }

  next();
};

/**
 * Validate Subsidy Application Data
 */
const validateSubsidyApplication = (req, res, next) => {
  const { subsidyId } = req.body;

  if (!subsidyId) {
    return res.status(400).json({
      success: false,
      message: 'Subsidy ID is required'
    });
  }

  next();
};

/**
 * Validate Language Update
 */
const validateLanguageUpdate = (req, res, next) => {
  const { language } = req.body;

  const validLanguages = ['en', 'kannada', 'hindi', 'tamil', 'telugu'];

  if (!language || !validLanguages.includes(language)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid language selection'
    });
  }

  next();
};

/**
 * Validate ObjectId Parameter
 */
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id) {
      return res.status(400).json({
        success: false,
        message: `${paramName} is required`
      });
    }

    // For JSON storage mode, just check if ID exists
    next();
  };
};

/**
 * Validate Farmer Registration Data
 */
const validateFarmerRegistration = (req, res, next) => {
  const { fullName, email, mobile, password, location, cropType } = req.body;

  // Check required fields
  if (!fullName || !email || !mobile || !password || !location || !cropType) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  // Validate full name
  if (fullName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Full name must be at least 2 characters'
    });
  }

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }

  // Validate mobile
  if (!/^[0-9]{10}$/.test(mobile)) {
    return res.status(400).json({
      success: false,
      message: 'Mobile number must be 10 digits'
    });
  }

  // Validate password
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters'
    });
  }

  next();
};

/**
 * Validate Login Data
 */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  next();
};

module.exports = {
  validateProfileUpdate,
  validateSubsidyApplication,
  validateLanguageUpdate,
  validateObjectId,
  validateFarmerRegistration,
  validateLogin
};
