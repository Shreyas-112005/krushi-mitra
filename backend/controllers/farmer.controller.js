const Farmer = require('../models/farmer.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const otpService = require('../services/otp.service');

/**
 * FARMER REGISTRATION CONTROLLER
 * Step 1: Send OTP for email verification
 * Step 2: Verify OTP and create farmer account
 */

/**
 * @desc    Request OTP for registration (Step 1 of registration)
 * @route   POST /api/farmers/register/request-otp
 * @access  Public
 */
const requestRegistrationOTP = async (req, res) => {
  try {
    const { email, fullName } = req.body;

    console.log('[REGISTRATION] 📧 OTP request for:', email);

    // Validate email
    if (!email || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Email and name are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if farmer already exists
    const existingFarmer = await Farmer.findOne({ email: email.toLowerCase() });
    if (existingFarmer) {
      console.log('[REGISTRATION] ❌ Email already registered');
      return res.status(409).json({
        success: false,
        message: 'Email already registered. Please login instead.'
      });
    }

    // Generate and send OTP
    const result = await otpService.generateAndSendOTP(email, fullName);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message || 'Failed to send OTP'
      });
    }

    console.log('[REGISTRATION] ✅ OTP sent to:', email);

    res.json({
      success: true,
      message: 'OTP sent successfully to your email. Please verify to complete registration.',
      email: email,
      ...(process.env.NODE_ENV === 'development' && result.otp ? { otp: result.otp } : {})
    });

  } catch (error) {
    console.error('[REGISTRATION] ❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    });
  }
};

/**
 * @desc    Verify OTP and complete registration (Step 2 of registration)
 * @route   POST /api/farmers/register/verify-otp
 * @access  Public
 */
const verifyOTPAndRegister = async (req, res) => {
  try {
    const { fullName, email, password, mobile, location, cropType, language, otp } = req.body;

    console.log('[REGISTRATION] 🔐 OTP verification and registration for:', email);

    // Validate all required fields
    if (!fullName || !email || !password || !mobile || !location || !cropType || !otp) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required including OTP'
      });
    }

    // Verify OTP
    const verification = otpService.verifyOTP(email, otp);
    if (!verification.valid) {
      console.log('[REGISTRATION] ❌ Invalid OTP:', verification.message);
      return res.status(401).json({
        success: false,
        message: verification.message
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate mobile format (Indian 10-digit)
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number. Must be 10 digits starting with 6-9'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check if farmer already exists (double check)
    const existingFarmer = await Farmer.findOne({
      $or: [{ email: email.toLowerCase() }, { mobile }]
    });

    if (existingFarmer) {
      console.log('[REGISTRATION] ❌ Farmer already exists');
      return res.status(409).json({
        success: false,
        message: 'Farmer with this email or mobile number already exists'
      });
    }

    // Create new farmer with hashed password
    const farmer = new Farmer({
      fullName,
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save hook in model
      mobile,
      location,
      cropType,
      language: language || 'english',
      isVerified: true // Email verified via OTP
    });

    await farmer.save();

    console.log('[REGISTRATION] ✅ Farmer registered successfully:', farmer.email);

    // Generate JWT token for auto-login after registration
    const token = jwt.sign(
      {
        id: farmer._id,
        email: farmer.email,
        role: 'farmer',
        type: 'farmer'
      },
      process.env.JWT_SECRET || 'krushi_mithra_secret_key_2025_secure_token',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful! You are now logged in.',
      token,
      farmer: {
        id: farmer._id,
        fullName: farmer.fullName,
        email: farmer.email,
        mobile: farmer.mobile,
        location: farmer.location,
        cropType: farmer.cropType,
        language: farmer.language,
        isVerified: farmer.isVerified,
        registeredAt: farmer.registeredAt
      }
    });

  } catch (error) {
    console.error('[REGISTRATION] ❌ Error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email or mobile number already registered'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * FARMER LOGIN CONTROLLER
 * Simple email + password authentication (NO OTP)
 */

/**
 * @desc    Farmer login with email and password
 * @route   POST /api/farmers/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('[FARMER LOGIN] 🔑 Login attempt for:', email);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find farmer by email
    const farmer = await Farmer.findOne({ email: email.toLowerCase() });

    if (!farmer) {
      console.log('[FARMER LOGIN] ❌ Farmer not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if farmer is active
    if (!farmer.isActive) {
      console.log('[FARMER LOGIN] ❌ Account inactive:', email);
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await farmer.comparePassword(password);

    if (!isPasswordValid) {
      console.log('[FARMER LOGIN] ❌ Invalid password for:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    farmer.lastLogin = new Date();
    await farmer.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: farmer._id,
        email: farmer.email,
        role: 'farmer',
        type: 'farmer'
      },
      process.env.JWT_SECRET || 'krushi_mithra_secret_key_2025_secure_token',
      { expiresIn: '7d' }
    );

    console.log('[FARMER LOGIN] ✅ Login successful for:', email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      farmer: {
        id: farmer._id,
        fullName: farmer.fullName,
        email: farmer.email,
        mobile: farmer.mobile,
        location: farmer.location,
        cropType: farmer.cropType,
        language: farmer.language,
        isVerified: farmer.isVerified
      }
    });

  } catch (error) {
    console.error('[FARMER LOGIN] ❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * @desc    Get farmer profile
 * @route   GET /api/farmers/profile
 * @access  Private (Farmer)
 */
const getProfile = async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.user.id).select('-password');
    
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    res.json({
      success: true,
      farmer
    });

  } catch (error) {
    console.error('[FARMER PROFILE] ❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

/**
 * @desc    Update farmer profile
 * @route   PUT /api/farmers/profile
 * @access  Private (Farmer)
 */
const updateProfile = async (req, res) => {
  try {
    const { fullName, mobile, location, cropType, language } = req.body;

    const farmer = await Farmer.findById(req.user.id);

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    // Update allowed fields
    if (fullName) farmer.fullName = fullName;
    if (mobile) farmer.mobile = mobile;
    if (location) farmer.location = location;
    if (cropType) farmer.cropType = cropType;
    if (language) farmer.language = language;

    await farmer.save();

    console.log('[FARMER PROFILE] ✅ Profile updated for:', farmer.email);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      farmer: {
        id: farmer._id,
        fullName: farmer.fullName,
        email: farmer.email,
        mobile: farmer.mobile,
        location: farmer.location,
        cropType: farmer.cropType,
        language: farmer.language
      }
    });

  } catch (error) {
    console.error('[FARMER PROFILE] ❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

module.exports = {
  requestRegistrationOTP,
  verifyOTPAndRegister,
  login,
  getProfile,
  updateProfile
};
