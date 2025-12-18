const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/admin.model');
const Farmer = require('../models/farmer.model');
const Subsidy = require('../models/subsidy.model');
const Notification = require('../models/notification.model');
const { verifyMainAdmin } = require('../middleware/admin.auth.middleware');
const jsonStorage = require('../utils/jsonStorage');

/**
 * @route   POST /api/admin/login
 * @desc    Main Admin Login - ONLY for MAIN_ADMIN
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('[ADMIN LOGIN] Received login request for:', email);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // If using JSON storage mode (no MongoDB), validate against env variables
    if (process.env.USE_JSON_STORAGE === 'true' || !process.env.MONGODB_URI) {
      console.log('[ADMIN LOGIN] Using JSON storage mode authentication');
      
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!adminEmail || !adminPassword) {
        console.error('[ADMIN LOGIN] Admin credentials not set in environment');
        return res.status(500).json({
          success: false,
          message: 'Server configuration error'
        });
      }

      // Check credentials
      if (email.toLowerCase() !== adminEmail.toLowerCase() || password !== adminPassword) {
        console.log('[ADMIN LOGIN] Invalid credentials');
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: 'main_admin_json',
          email: adminEmail,
          role: 'MAIN_ADMIN'
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('[ADMIN LOGIN] Login successful');

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        admin: {
          email: adminEmail,
          role: 'MAIN_ADMIN',
          isActive: true,
          lastLogin: new Date().toISOString()
        }
      });
    }

    // MongoDB mode - original logic
    console.log('[ADMIN LOGIN] Using MongoDB authentication');
    
    // Find admin by email (include password for comparison)
    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify role is MAIN_ADMIN
    if (admin.role !== 'MAIN_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only main admin allowed'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is inactive'
      });
    }

    // Compare password
    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        role: admin.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: admin.toSafeObject()
    });

  } catch (error) {
    console.error('[ADMIN LOGIN] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/farmers
 * @desc    Get all farmer registrations with filtering
 * @access  Private (MAIN_ADMIN only)
 */
router.get('/farmers', verifyMainAdmin, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    console.log('[ADMIN FARMERS] Fetching farmers, status:', status);

    // Check if using JSON storage mode
    if (process.env.USE_JSON_STORAGE === 'true' || !process.env.MONGODB_URI) {
      console.log('[ADMIN FARMERS] Using JSON storage mode');

      let farmers = jsonStorage.getAllFarmers();

      // Filter by status
      if (status) {
        farmers = farmers.filter(f => f.status === status);
      }

      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        farmers = farmers.filter(f =>
          f.fullName.toLowerCase().includes(searchLower) ||
          f.email.toLowerCase().includes(searchLower) ||
          f.mobile.includes(searchLower) ||
          f.location.toLowerCase().includes(searchLower)
        );
      }

      // Sort by registeredAt (newest first)
      farmers.sort((a, b) => new Date(b.registeredAt) - new Date(b.registeredAt));

      // Remove password field
      farmers = farmers.map(({ password, ...farmer }) => farmer);

      // Pagination
      const total = farmers.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedFarmers = farmers.slice(startIndex, endIndex);

      console.log('[ADMIN FARMERS] Found', total, 'farmers');

      return res.json({
        success: true,
        farmers: paginatedFarmers,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
          limit: parseInt(limit)
        }
      });
    }

    // MongoDB mode - original logic
    console.log('[ADMIN FARMERS] Using MongoDB mode');

    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Get farmers with pagination
    const farmers = await Farmer.find(query)
      .select('-password')
      .populate('approvedBy', 'email')
      .sort({ registeredAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Farmer.countDocuments(query);

    res.json({
      success: true,
      farmers,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('[ADMIN FARMERS] Error fetching farmers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch farmers',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/farmers/:id/approve
 * @desc    Approve farmer account
 * @access  Private (MAIN_ADMIN only)
 */
router.put('/farmers/:id/approve', verifyMainAdmin, async (req, res) => {
  try {
    console.log('[ADMIN APPROVE] Approving farmer:', req.params.id);

    // Check if using JSON storage mode
    if (process.env.USE_JSON_STORAGE === 'true' || !process.env.MONGODB_URI) {
      console.log('[ADMIN APPROVE] Using JSON storage mode');

      const farmer = jsonStorage.findFarmerById(req.params.id);

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

      // Update farmer status
      const updatedFarmer = jsonStorage.updateFarmer(req.params.id, {
        status: 'approved',
        approvedBy: req.admin.id || 'main_admin_json',
        approvedAt: new Date().toISOString(),
        rejectionReason: undefined
      });

      console.log('[ADMIN APPROVE] ✅ Farmer approved:', updatedFarmer.email);

      // Remove password from response
      const { password, ...farmerData } = updatedFarmer;

      return res.json({
        success: true,
        message: 'Farmer approved successfully',
        farmer: farmerData
      });
    }

    // MongoDB mode - original logic
    console.log('[ADMIN APPROVE] Using MongoDB mode');

    const farmer = await Farmer.findById(req.params.id);

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

    // Update farmer status
    farmer.status = 'approved';
    farmer.approvedBy = req.admin._id;
    farmer.approvedAt = new Date();
    farmer.rejectionReason = undefined; // Clear rejection reason if any

    await farmer.save();

    // Create notification for farmer
    try {
      await Notification.create({
        farmer: farmer._id,
        title: 'Account Approved',
        message: 'Congratulations! Your KRUSHI MITHRA account has been approved. You can now access all features.',
        type: 'account',
        priority: 'high'
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    res.json({
      success: true,
      message: 'Farmer approved successfully',
      farmer: farmer.toObject({ getters: true, virtuals: false })
    });

  } catch (error) {
    console.error('[ADMIN APPROVE] Error approving farmer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve farmer',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/farmers/:id/reject
 * @desc    Reject farmer account
 * @access  Private (MAIN_ADMIN only)
 */
router.put('/farmers/:id/reject', verifyMainAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const farmer = await Farmer.findById(req.params.id);

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    // Update farmer status
    farmer.status = 'rejected';
    farmer.rejectionReason = reason;

    await farmer.save();

    // Create notification for farmer
    try {
      await Notification.create({
        farmer: farmer._id,
        title: 'Account Rejected',
        message: `Your KRUSHI MITHRA account registration has been rejected. Reason: ${reason}`,
        type: 'account',
        priority: 'high'
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    res.json({
      success: true,
      message: 'Farmer rejected successfully',
      farmer: farmer.toObject({ getters: true, virtuals: false })
    });

  } catch (error) {
    console.error('Error rejecting farmer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject farmer',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/farmers/:id/suspend
 * @desc    Suspend farmer account
 * @access  Private (MAIN_ADMIN only)
 */
router.put('/farmers/:id/suspend', verifyMainAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    const farmer = await Farmer.findById(req.params.id);

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    farmer.status = 'suspended';
    if (reason) {
      farmer.rejectionReason = reason;
    }

    await farmer.save();

    res.json({
      success: true,
      message: 'Farmer suspended successfully',
      farmer: farmer.toObject({ getters: true, virtuals: false })
    });

  } catch (error) {
    console.error('Error suspending farmer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to suspend farmer',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/subsidies
 * @desc    Get all subsidies
 * @access  Private (MAIN_ADMIN only)
 */
router.get('/subsidies', verifyMainAdmin, async (req, res) => {
  try {
    const subsidies = await Subsidy.find().sort({ createdAt: -1 });

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
 * @route   POST /api/admin/subsidies
 * @desc    Create new subsidy scheme
 * @access  Private (MAIN_ADMIN only)
 */
router.post('/subsidies', verifyMainAdmin, async (req, res) => {
  try {
    const subsidy = new Subsidy(req.body);
    await subsidy.save();

    res.status(201).json({
      success: true,
      message: 'Subsidy created successfully',
      subsidy
    });

  } catch (error) {
    console.error('Error creating subsidy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subsidy',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/subsidies/:id
 * @desc    Update subsidy scheme
 * @access  Private (MAIN_ADMIN only)
 */
router.put('/subsidies/:id', verifyMainAdmin, async (req, res) => {
  try {
    const subsidy = await Subsidy.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!subsidy) {
      return res.status(404).json({
        success: false,
        message: 'Subsidy not found'
      });
    }

    res.json({
      success: true,
      message: 'Subsidy updated successfully',
      subsidy
    });

  } catch (error) {
    console.error('Error updating subsidy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subsidy',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/admin/subsidies/:id
 * @desc    Delete subsidy scheme
 * @access  Private (MAIN_ADMIN only)
 */
router.delete('/subsidies/:id', verifyMainAdmin, async (req, res) => {
  try {
    const subsidy = await Subsidy.findByIdAndDelete(req.params.id);

    if (!subsidy) {
      return res.status(404).json({
        success: false,
        message: 'Subsidy not found'
      });
    }

    res.json({
      success: true,
      message: 'Subsidy deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting subsidy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subsidy',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/notifications/broadcast
 * @desc    Send notification to all farmers
 * @access  Private (MAIN_ADMIN only)
 */
router.post('/notifications/broadcast', verifyMainAdmin, async (req, res) => {
  try {
    const { title, message, type = 'announcement', priority = 'medium' } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    // Get all approved farmers
    const farmers = await Farmer.find({ status: 'approved' }).select('_id');

    // Create notifications for all farmers
    const notifications = farmers.map(farmer => ({
      farmer: farmer._id,
      title,
      message,
      type,
      priority
    }));

    await Notification.insertMany(notifications);

    res.json({
      success: true,
      message: `Notification sent to ${farmers.length} farmers`,
      count: farmers.length
    });

  } catch (error) {
    console.error('Error broadcasting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/statistics
 * @desc    Get platform statistics
 * @access  Private (MAIN_ADMIN only)
 */
router.get('/statistics', verifyMainAdmin, async (req, res) => {
  try {
    const [
      totalFarmers,
      pendingFarmers,
      approvedFarmers,
      rejectedFarmers,
      totalSubsidies,
      activeSubsidies
    ] = await Promise.all([
      Farmer.countDocuments(),
      Farmer.countDocuments({ status: 'pending' }),
      Farmer.countDocuments({ status: 'approved' }),
      Farmer.countDocuments({ status: 'rejected' }),
      Subsidy.countDocuments(),
      Subsidy.countDocuments({ isActive: true })
    ]);

    // Get recent registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentRegistrations = await Farmer.countDocuments({
      registeredAt: { $gte: sevenDaysAgo }
    });

    res.json({
      success: true,
      statistics: {
        farmers: {
          total: totalFarmers,
          pending: pendingFarmers,
          approved: approvedFarmers,
          rejected: rejectedFarmers,
          recentRegistrations
        },
        subsidies: {
          total: totalSubsidies,
          active: activeSubsidies
        }
      }
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/notifications/broadcast
 * @desc    Create and broadcast notification to farmers
 * @access  Admin only
 */
const notificationController = require('../controllers/notification.controller');
router.post('/notifications/broadcast', verifyMainAdmin, notificationController.createNotification);

/**
 * @route   GET /api/admin/notifications
 * @desc    Get admin notifications
 * @access  Admin only
 */
router.get('/notifications', verifyMainAdmin, notificationController.getAdminNotifications);

module.exports = router;
