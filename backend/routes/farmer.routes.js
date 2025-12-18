const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Farmer = require('../models/farmer.model');
const Subsidy = require('../models/subsidy.model');
const Notification = require('../models/notification.model');
const { verifyApprovedFarmer } = require('../middleware/admin.auth.middleware');
const jsonStorage = require('../utils/jsonStorage');

/**
 * @route   POST /api/farmers/register
 * @desc    Farmer registration - Status will be 'pending' until admin approves
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, mobile, password, location, cropType, language } = req.body;

    console.log('[FARMER REGISTER] Registration attempt for:', email);

    // Validate required fields
    if (!fullName || !email || !mobile || !password || !location || !cropType) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided'
      });
    }

    // Check if using JSON storage mode
    if (process.env.USE_JSON_STORAGE === 'true' || !process.env.MONGODB_URI) {
      console.log('[FARMER REGISTER] Using JSON storage mode');

      // Check if farmer already exists
      const existingFarmer = jsonStorage.findFarmerByEmailOrMobile(email, mobile);

      if (existingFarmer) {
        console.log('[FARMER REGISTER] Farmer already exists');
        return res.status(409).json({
          success: false,
          message: 'Farmer with this email or mobile number already exists'
        });
      }

      // Create new farmer
      const farmer = await jsonStorage.createFarmer({
        fullName,
        email,
        mobile,
        password,
        location,
        cropType,
        language: language || 'english'
      });

      console.log('[FARMER REGISTER] ✅ Farmer registered:', farmer.email, 'Status: PENDING');

      return res.status(201).json({
        success: true,
        message: 'Registration successful. Waiting for admin approval.',
        farmer: {
          id: farmer._id,
          fullName: farmer.fullName,
          email: farmer.email,
          mobile: farmer.mobile,
          location: farmer.location,
          cropType: farmer.cropType,
          status: 'PENDING',
          registeredAt: farmer.registeredAt
        }
      });
    }

    // MongoDB mode - original logic
    console.log('[FARMER REGISTER] Using MongoDB mode');

    // Check if farmer already exists
    const existingFarmer = await Farmer.findOne({
      $or: [{ email: email.toLowerCase() }, { mobile }]
    });

    if (existingFarmer) {
      return res.status(409).json({
        success: false,
        message: 'Farmer with this email or mobile number already exists'
      });
    }

    // Create new farmer with pending status
    const farmer = new Farmer({
      fullName,
      email: email.toLowerCase(),
      mobile,
      password,
      location,
      cropType,
      language: language || 'english',
      status: 'pending' // Requires admin approval
    });

    await farmer.save();

    console.log('✅ Farmer registered:', farmer.email, 'Status: PENDING');

    res.status(201).json({
      success: true,
      message: 'Registration successful. Waiting for admin approval.',
      farmer: {
        id: farmer._id,
        fullName: farmer.fullName,
        email: farmer.email,
        mobile: farmer.mobile,
        location: farmer.location,
        cropType: farmer.cropType,
        status: 'PENDING',
        registeredAt: farmer.registeredAt
      }
    });

  } catch (error) {
    console.error('[FARMER REGISTER] Error:', error);
    
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
});

/**
 * @route   POST /api/farmers/login
 * @desc    Farmer login - Authentication happens first, then approval check
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('[FARMER LOGIN] 🔐 Login attempt for:', email);

    // Validate input
    if (!email || !password) {
      console.log('[FARMER LOGIN] ❌ Missing credentials');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if using JSON storage mode
    if (process.env.USE_JSON_STORAGE === 'true' || !process.env.MONGODB_URI) {
      console.log('[FARMER LOGIN] Using JSON storage mode');

      // STEP 1: Find farmer by email
      const farmer = jsonStorage.findFarmerByEmail(email);

      if (!farmer) {
        console.log('[FARMER LOGIN] ❌ Farmer not found:', email);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      console.log('[FARMER LOGIN] ✅ Farmer found:', farmer.email, 'Status:', farmer.status);

      // STEP 2: Verify password (BEFORE checking approval status)
      const isPasswordValid = await jsonStorage.comparePassword(password, farmer.password);

      if (!isPasswordValid) {
        console.log('[FARMER LOGIN] ❌ Invalid password for:', email);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      console.log('[FARMER LOGIN] ✅ Password verified for:', email);

      // STEP 3: Check approval status (AFTER successful authentication)
      if (farmer.status === 'pending') {
        console.log('[FARMER LOGIN] ⏳ Account pending approval:', email);
        return res.status(403).json({
          success: false,
          message: 'Your account is awaiting admin approval',
          status: 'PENDING'
        });
      }

      if (farmer.status === 'rejected') {
        console.log('[FARMER LOGIN] ❌ Account rejected:', email);
        return res.status(403).json({
          success: false,
          message: 'Your registration was rejected by admin',
          status: 'REJECTED',
          reason: farmer.rejectionReason || 'No reason provided'
        });
      }

      if (farmer.status === 'suspended') {
        console.log('[FARMER LOGIN] 🚫 Account suspended:', email);
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended. Please contact admin.',
          status: 'SUSPENDED'
        });
      }

      // STEP 4: Check if status is APPROVED
      if (farmer.status !== 'approved') {
        console.log('[FARMER LOGIN] ⚠️ Invalid status:', farmer.status);
        return res.status(403).json({
          success: false,
          message: 'Access denied. Invalid account status.',
          status: farmer.status
        });
      }

      // Check if farmer is active
      if (!farmer.isActive) {
        console.log('[FARMER LOGIN] ❌ Account inactive:', email);
        return res.status(403).json({
          success: false,
          message: 'Your account is inactive'
        });
      }

      // STEP 5: Successful login - Update last login
      jsonStorage.updateFarmer(farmer._id, { lastLogin: new Date().toISOString() });

      // Generate JWT token
      const token = jwt.sign(
        {
          id: farmer._id,
          email: farmer.email,
          role: 'farmer'
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('[FARMER LOGIN] ✅ Login successful for:', email);

      return res.status(200).json({
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
          status: farmer.status
        }
      });
    }

    // MongoDB mode - original logic
    console.log('[FARMER LOGIN] Using MongoDB mode');

    // STEP 1: Find farmer by email (include password for comparison)
    const farmer = await Farmer.findOne({ email: email.toLowerCase() }).select('+password');

    if (!farmer) {
      console.log('❌ Farmer not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log('✅ Farmer found:', farmer.email, 'Status:', farmer.status);

    // STEP 2: Verify password (BEFORE checking approval status)
    const isPasswordValid = await farmer.comparePassword(password);

    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log('✅ Password verified for:', email);

    // STEP 3: Check approval status (AFTER successful authentication)
    if (farmer.status === 'pending') {
      console.log('⏳ Account pending approval:', email);
      return res.status(403).json({
        success: false,
        message: 'Your account is awaiting admin approval',
        status: 'PENDING'
      });
    }

    if (farmer.status === 'rejected') {
      console.log('❌ Account rejected:', email);
      return res.status(403).json({
        success: false,
        message: 'Your registration was rejected by admin',
        status: 'REJECTED',
        reason: farmer.rejectionReason || 'No reason provided'
      });
    }

    if (farmer.status === 'suspended') {
      console.log('🚫 Account suspended:', email);
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact admin.',
        status: 'SUSPENDED'
      });
    }

    // STEP 4: Check if status is APPROVED
    if (farmer.status !== 'approved') {
      console.log('⚠️ Invalid status:', farmer.status);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Invalid account status.',
        status: farmer.status
      });
    }

    // Check if farmer is active
    if (!farmer.isActive) {
      console.log('❌ Account inactive:', email);
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive'
      });
    }

    // STEP 5: Successful login - Update last login
    farmer.lastLogin = new Date();
    await farmer.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: farmer._id,
        email: farmer.email,
        role: 'farmer'
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful for:', email);

    res.status(200).json({
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
        status: farmer.status
      }
    });

  } catch (error) {
    console.error('[FARMER LOGIN] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/farmers/profile
 * @desc    Get farmer profile
 * @access  Private (Approved farmers only)
 */
router.get('/profile', verifyApprovedFarmer, async (req, res) => {
  try {
    res.json({
      success: true,
      farmer: req.farmer
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/farmers/profile
 * @desc    Update farmer profile
 * @access  Private (Approved farmers only)
 */
router.put('/profile', verifyApprovedFarmer, async (req, res) => {
  try {
    const { fullName, mobile, location, cropType, language } = req.body;

    // Prevent status change by farmer
    const updateFields = {
      fullName,
      mobile,
      location,
      cropType,
      language
    };

    // Remove undefined fields
    Object.keys(updateFields).forEach(key => 
      updateFields[key] === undefined && delete updateFields[key]
    );

    const farmer = await Farmer.findByIdAndUpdate(
      req.farmer._id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      farmer
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/farmers/subsidies
 * @desc    Get all active subsidies
 * @access  Private (Approved farmers only)
 */
router.get('/subsidies', verifyApprovedFarmer, async (req, res) => {
  try {
    const { category, state } = req.query;

    const query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (state) {
      query.state = state;
    }

    const subsidies = await Subsidy.find(query)
      .sort({ applicationDeadline: 1 });

    res.json({
      success: true,
      count: subsidies.length,
      subsidies
    });

  } catch (error) {
    console.error('Error fetching subsidies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subsidies',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/farmers/notifications
 * @desc    Get farmer notifications
 * @access  Private (Approved farmers only)
 */
router.get('/notifications', verifyApprovedFarmer, async (req, res) => {
  try {
    const { unreadOnly } = req.query;

    const query = { farmer: req.farmer._id };

    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: notifications.length,
      notifications
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/farmers/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private (Approved farmers only)
 */
router.put('/notifications/:id/read', verifyApprovedFarmer, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, farmer: req.farmer._id },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });

  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification',
      error: error.message
    });
  }
});

module.exports = router;
