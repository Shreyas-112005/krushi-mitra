const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { authenticateFarmer } = require('../middleware/auth.middleware');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateRegistration = [
  body('name').trim().isLength({ min: 3 }).withMessage('Name must be at least 3 characters'),
  body('email').isEmail().withMessage('Invalid email address'),
  body('mobile').matches(/^[6-9]\d{9}$/).withMessage('Invalid mobile number'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('location').notEmpty().withMessage('Location is required'),
  body('cropType').notEmpty().withMessage('Crop type is required'),
  body('language').isIn(['english', 'kannada', 'hindi']).withMessage('Invalid language')
];

const validateLogin = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required')
];

// POST /register - Farmer registration
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, email, mobile, password, location, cropType, language } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or mobile already exists'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      mobile,
      password,
      location,
      cropType,
      language,
      status: 'pending',
      role: 'farmer'
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful. Your account is pending approval.',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

// POST /login - Only approved farmers can login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is approved
    if (user.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your account is pending approval. Please contact admin.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          location: user.location,
          cropType: user.cropType,
          language: user.language,
          role: user.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

// GET /profile - Protected route
router.get('/profile', authenticateFarmer, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        location: user.location,
        cropType: user.cropType,
        language: user.language,
        status: user.status,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
});

module.exports = router;
