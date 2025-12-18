const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.model');
const User = require('../models/user.model');
const { authenticateAdmin } = require('../middleware/auth.middleware');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateAdminLogin = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// POST /admin/login - Admin authentication
router.post('/login', validateAdminLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username, password } = req.body;

    // Find admin with password field
    const admin = await Admin.findOne({ username }).select('+password');
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is inactive'
      });
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: admin._id, 
        username: admin.username,
        email: admin.email,
        role: admin.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        token,
        admin: {
          id: admin._id,
          username: admin.username,
          fullName: admin.fullName,
          email: admin.email,
          role: admin.role
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

// GET /admin/farmers - Get all farmers (protected)
router.get('/farmers', authenticateAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    
    const farmers = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        farmers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalFarmers: total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch farmers',
      error: error.message
    });
  }
});

// PUT /admin/approve/:id - Approve a farmer (protected)
router.put('/approve/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const farmer = await User.findById(id);
    
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    if (farmer.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Farmer is already approved'
      });
    }

    farmer.status = 'approved';
    farmer.updatedAt = new Date();
    await farmer.save();

    res.json({
      success: true,
      message: 'Farmer approved successfully',
      data: {
        id: farmer._id,
        name: farmer.name,
        email: farmer.email,
        status: farmer.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to approve farmer',
      error: error.message
    });
  }
});

// PUT /admin/reject/:id - Reject a farmer (protected)
router.put('/reject/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const farmer = await User.findById(id);
    
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    if (farmer.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject an approved farmer. Please suspend instead.'
      });
    }

    // You could add a rejectionReason field to the User model if needed
    farmer.status = 'pending'; // Or create a 'rejected' status in the User model
    farmer.updatedAt = new Date();
    await farmer.save();

    res.json({
      success: true,
      message: 'Farmer registration rejected',
      data: {
        id: farmer._id,
        name: farmer.name,
        email: farmer.email,
        status: farmer.status,
        reason: reason || 'Not provided'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reject farmer',
      error: error.message
    });
  }
});

module.exports = router;
