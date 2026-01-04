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
      console.log('[ADMIN LOGIN] Admin not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('[ADMIN LOGIN] Admin found:', admin.email, 'Role:', admin.role);

    // Verify role is valid admin role (MAIN_ADMIN or super_admin)
    const validAdminRoles = ['MAIN_ADMIN', 'super_admin', 'admin', 'superadmin'];
    if (!validAdminRoles.includes(admin.role)) {
      console.log('[ADMIN LOGIN] Invalid role:', admin.role);
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only main admin allowed'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      console.log('[ADMIN LOGIN] Admin account inactive');
      return res.status(403).json({
        success: false,
        message: 'Admin account is inactive'
      });
    }

    console.log('[ADMIN LOGIN] Comparing password...');
    // Compare password
    const isPasswordValid = await admin.comparePassword(password);
    console.log('[ADMIN LOGIN] Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('[ADMIN LOGIN] Invalid password');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('[ADMIN LOGIN] ✅ Authentication successful');
    
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

    console.log('[ADMIN LOGIN] ✅ Login complete for:', admin.email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        username: admin.username,
        role: admin.role,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin
      }
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
 * @desc    Get all registered farmers (VIEW ONLY - No approval system)
 * @access  Private (MAIN_ADMIN only)
 */
router.get('/farmers', verifyMainAdmin, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;

    console.log('[ADMIN FARMERS] Fetching all farmers (view-only mode)');

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { cropType: { $regex: search, $options: 'i' } }
      ];
    }

    // Get farmers with pagination
    const farmers = await Farmer.find(query)
      .select('fullName email mobile location cropType language isVerified registeredAt lastLogin')
      .sort({ registeredAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Farmer.countDocuments(query);

    console.log('[ADMIN FARMERS] ✅ Found', total, 'farmers');

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
 * @approval SYSTEM REMOVED
 * 
 * The following routes have been removed as farmer approval is no longer required:
 * - GET /api/admin/farmers/:id/debug
 * - PUT /api/admin/farmers/:id/approve  
 * - PUT /api/admin/farmers/:id/reject
 * - PUT /api/admin/farmers/:id/suspend
 * 
 * Farmers now use OTP-based authentication and can login immediately after registration.
 * Admin dashboard is VIEW-ONLY for farmer registration details.
 */

/**
 * @route   GET /api/admin/farmers/:id
 * @desc    Get single farmer details (VIEW ONLY)
 * @access  Private (MAIN_ADMIN only)
 */
router.get('/farmers/:id', verifyMainAdmin, async (req, res) => {
  try {
    const farmer = await Farmer.findById(req.params.id)
      .select('fullName email mobile location cropType language isVerified registeredAt lastLogin');
    
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
    console.error('[ADMIN] Error fetching farmer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch farmer',
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
 * @route   GET /api/admin/stats
 * @desc    Get dashboard statistics
 * @access  Admin only
 */
router.get('/stats', verifyMainAdmin, async (req, res) => {
  try {
    console.log('[ADMIN STATS] Fetching dashboard statistics');

    const totalFarmers = await Farmer.countDocuments();
    const pendingApprovals = await Farmer.countDocuments({ status: 'pending' });
    const approvedFarmers = await Farmer.countDocuments({ status: 'approved' });
    const rejectedFarmers = await Farmer.countDocuments({ status: 'rejected' });
    
    // Get market prices count (we'll add proper market price model later)
    const MarketPrice = require('../models/marketPrice.model');
    const marketPrices = await MarketPrice.countDocuments().catch(() => 0);

    const stats = {
      totalFarmers,
      pendingApprovals,
      approvedFarmers,
      rejectedFarmers,
      marketPrices
    };

    console.log('[ADMIN STATS] Statistics:', stats);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[ADMIN STATS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/market-stats
 * @desc    Get market price statistics
 * @access  Admin only
 */
router.get('/market-stats', verifyMainAdmin, async (req, res) => {
  try {
    console.log('[ADMIN MARKET STATS] Fetching market price data');

    const MarketPrice = require('../models/marketPrice.model');
    
    // Get all market prices sorted by date
    const prices = await MarketPrice.find()
      .sort({ updatedAt: -1 })
      .limit(50)
      .select('vegetableName price unit market state updatedAt')
      .catch(() => []);

    const totalPrices = await MarketPrice.countDocuments().catch(() => 0);
    
    // Get unique vegetables
    const uniqueVegetables = await MarketPrice.distinct('vegetableName').catch(() => []);
    
    // Get recent updates (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentUpdates = await MarketPrice.countDocuments({ 
      updatedAt: { $gte: oneDayAgo }
    }).catch(() => 0);

    res.json({
      success: true,
      data: {
        prices,
        totalPrices,
        uniqueVegetables: uniqueVegetables.length,
        recentUpdates,
        lastUpdated: prices.length > 0 ? prices[0].updatedAt : null
      }
    });
  } catch (error) {
    console.error('[ADMIN MARKET STATS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch market statistics',
      data: {
        prices: [],
        totalPrices: 0,
        uniqueVegetables: 0,
        recentUpdates: 0
      }
    });
  }
});

/**
 * @route   POST /api/admin/market-prices/update
 * @desc    Trigger market price update
 * @access  Admin only
 */
router.post('/market-prices/update', verifyMainAdmin, async (req, res) => {
  try {
    console.log('[ADMIN MARKET UPDATE] Triggering manual market price update');

    // Try to call the market price service
    try {
      const marketPriceService = require('../services/marketPrice.service');
      if (marketPriceService && typeof marketPriceService.updateMarketPrices === 'function') {
        await marketPriceService.updateMarketPrices();
        console.log('[ADMIN MARKET UPDATE] Market prices updated successfully');
      } else {
        console.log('[ADMIN MARKET UPDATE] Service not available, skipping');
      }
    } catch (serviceError) {
      console.log('[ADMIN MARKET UPDATE] Service error:', serviceError.message);
    }

    res.json({
      success: true,
      message: 'Market price update initiated'
    });
  } catch (error) {
    console.error('[ADMIN MARKET UPDATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update market prices',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/market-prices
 * @desc    Get all market prices with filters
 * @access  Admin only
 */
router.get('/market-prices', verifyMainAdmin, async (req, res) => {
  try {
    const { category, market, search, limit = 100 } = req.query;
    const MarketPrice = require('../models/marketPrice.model');
    
    const query = { isActive: true };
    
    if (category) query.category = category;
    if (market) query.market = { $regex: market, $options: 'i' };
    if (search) {
      query.$or = [
        { vegetableName: { $regex: search, $options: 'i' } },
        { commodity: { $regex: search, $options: 'i' } }
      ];
    }
    
    const prices = await MarketPrice.find(query)
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .select('vegetableName commodity price unit market category state updatedAt');
    
    res.json({
      success: true,
      count: prices.length,
      prices
    });
  } catch (error) {
    console.error('[ADMIN GET PRICES] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch market prices',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/market-prices
 * @desc    Add new market price
 * @access  Admin only
 */
router.post('/market-prices', verifyMainAdmin, async (req, res) => {
  try {
    const MarketPrice = require('../models/marketPrice.model');
    const { vegetableName, price, unit, market, category, state, district } = req.body;
    
    if (!vegetableName || !price || !market) {
      return res.status(400).json({
        success: false,
        message: 'Vegetable name, price, and market are required'
      });
    }
    
    const newPrice = new MarketPrice({
      vegetableName,
      commodity: vegetableName,
      price: parseFloat(price),
      unit: unit || 'kg',
      market,
      category: category || 'vegetable',
      state: state || 'Karnataka',
      district,
      createdBy: req.admin._id
    });
    
    await newPrice.save();
    
    console.log('[ADMIN ADD PRICE] New price added:', vegetableName, price, market);
    
    res.status(201).json({
      success: true,
      message: 'Market price added successfully',
      price: newPrice
    });
  } catch (error) {
    console.error('[ADMIN ADD PRICE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add market price',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/market-prices/:id
 * @desc    Get single market price
 * @access  Admin only
 */
router.get('/market-prices/:id', verifyMainAdmin, async (req, res) => {
  try {
    const MarketPrice = require('../models/marketPrice.model');
    
    const price = await MarketPrice.findById(req.params.id);
    
    if (!price) {
      return res.status(404).json({
        success: false,
        message: 'Market price not found'
      });
    }
    
    res.json({
      success: true,
      price
    });
  } catch (error) {
    console.error('[ADMIN GET PRICE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch market price',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/market-prices/:id
 * @desc    Update existing market price
 * @access  Admin only
 */
router.put('/market-prices/:id', verifyMainAdmin, async (req, res) => {
  try {
    const MarketPrice = require('../models/marketPrice.model');
    const { vegetableName, price, unit, market, category, state, isActive } = req.body;
    
    const priceDoc = await MarketPrice.findById(req.params.id);
    
    if (!priceDoc) {
      return res.status(404).json({
        success: false,
        message: 'Market price not found'
      });
    }
    
    // Update fields
    if (vegetableName) priceDoc.vegetableName = vegetableName;
    if (price) priceDoc.price = parseFloat(price);
    if (unit) priceDoc.unit = unit;
    if (market) priceDoc.market = market;
    if (category) priceDoc.category = category;
    if (state) priceDoc.state = state;
    if (typeof isActive !== 'undefined') priceDoc.isActive = isActive;
    priceDoc.updatedBy = req.admin._id;
    
    await priceDoc.save();
    
    console.log('[ADMIN UPDATE PRICE] Price updated:', req.params.id);
    
    res.json({
      success: true,
      message: 'Market price updated successfully',
      price: priceDoc
    });
  } catch (error) {
    console.error('[ADMIN UPDATE PRICE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update market price',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/admin/market-prices/:id
 * @desc    Delete market price (soft delete)
 * @access  Admin only
 */
router.delete('/market-prices/:id', verifyMainAdmin, async (req, res) => {
  try {
    const MarketPrice = require('../models/marketPrice.model');
    
    const priceDoc = await MarketPrice.findById(req.params.id);
    
    if (!priceDoc) {
      return res.status(404).json({
        success: false,
        message: 'Market price not found'
      });
    }
    
    // Soft delete
    priceDoc.isActive = false;
    priceDoc.updatedBy = req.admin._id;
    await priceDoc.save();
    
    console.log('[ADMIN DELETE PRICE] Price deleted (soft):', req.params.id);
    
    res.json({
      success: true,
      message: 'Market price deleted successfully'
    });
  } catch (error) {
    console.error('[ADMIN DELETE PRICE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete market price',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/subsidies/stats
 * @desc    Get subsidy statistics
 * @access  Admin only
 */
router.get('/subsidies/stats', verifyMainAdmin, async (req, res) => {
  try {
    console.log('[ADMIN SUBSIDY STATS] Fetching subsidy statistics');

    const totalSubsidies = await Subsidy.countDocuments();
    const activeSubsidies = await Subsidy.countDocuments({ isActive: true });
    
    // Calculate expiring soon (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringSubsidies = await Subsidy.countDocuments({
      isActive: true,
      deadline: { 
        $gte: new Date(),
        $lte: thirtyDaysFromNow
      }
    });

    res.json({
      success: true,
      stats: {
        totalSubsidies,
        activeSubsidies,
        expiringSubsidies
      }
    });
  } catch (error) {
    console.error('[ADMIN SUBSIDY STATS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subsidy statistics',
      stats: {
        totalSubsidies: 0,
        activeSubsidies: 0,
        expiringSubsidies: 0
      }
    });
  }
});

/**
 * @route   POST /api/admin/subsidies
 * @desc    Create new subsidy
 * @access  Admin only
 */
router.post('/subsidies', verifyMainAdmin, async (req, res) => {
  try {
    console.log('[ADMIN CREATE SUBSIDY] Creating new subsidy');

    const subsidy = new Subsidy({
      ...req.body,
      createdBy: req.admin._id || req.admin.id
    });

    await subsidy.save();

    console.log('[ADMIN CREATE SUBSIDY] Subsidy created:', subsidy._id);

    res.status(201).json({
      success: true,
      message: 'Subsidy created successfully',
      subsidy
    });
  } catch (error) {
    console.error('[ADMIN CREATE SUBSIDY] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subsidy',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/subsidies/:id
 * @desc    Update subsidy
 * @access  Admin only
 */
router.put('/subsidies/:id', verifyMainAdmin, async (req, res) => {
  try {
    console.log('[ADMIN UPDATE SUBSIDY] Updating subsidy:', req.params.id);

    const subsidy = await Subsidy.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedBy: req.admin._id || req.admin.id,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!subsidy) {
      return res.status(404).json({
        success: false,
        message: 'Subsidy not found'
      });
    }

    console.log('[ADMIN UPDATE SUBSIDY] Subsidy updated');

    res.json({
      success: true,
      message: 'Subsidy updated successfully',
      subsidy
    });
  } catch (error) {
    console.error('[ADMIN UPDATE SUBSIDY] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subsidy',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/admin/subsidies/:id
 * @desc    Delete subsidy
 * @access  Admin only
 */
router.delete('/subsidies/:id', verifyMainAdmin, async (req, res) => {
  try {
    console.log('[ADMIN DELETE SUBSIDY] Deleting subsidy:', req.params.id);

    const subsidy = await Subsidy.findByIdAndDelete(req.params.id);

    if (!subsidy) {
      return res.status(404).json({
        success: false,
        message: 'Subsidy not found'
      });
    }

    console.log('[ADMIN DELETE SUBSIDY] Subsidy deleted');

    res.json({
      success: true,
      message: 'Subsidy deleted successfully'
    });
  } catch (error) {
    console.error('[ADMIN DELETE SUBSIDY] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete subsidy',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/stats
 * @desc    Get dashboard statistics (real data from database)
 * @access  Admin only
 */
router.get('/stats', verifyMainAdmin, async (req, res) => {
  try {
    const [totalFarmers, pendingApprovals, approvedFarmers, rejectedFarmers] = await Promise.all([
      Farmer.countDocuments(),
      Farmer.countDocuments({ approvalStatus: 'pending' }),
      Farmer.countDocuments({ approvalStatus: 'approved' }),
      Farmer.countDocuments({ approvalStatus: 'rejected' })
    ]);

    // Count market prices
    const MarketPrice = require('../models/marketPrice.model');
    const marketPriceCount = await MarketPrice.countDocuments();

    res.json({
      success: true,
      stats: {
        totalFarmers,
        pendingApprovals,
        approvedFarmers,
        rejectedFarmers,
        marketPriceCount
      }
    });
  } catch (error) {
    console.error('[ADMIN STATS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/market-stats
 * @desc    Get market price statistics with actual price data
 * @access  Admin only
 */
router.get('/market-stats', verifyMainAdmin, async (req, res) => {
  try {
    const MarketPrice = require('../models/marketPrice.model');
    
    // Get up to 50 market prices
    const prices = await MarketPrice.find()
      .sort({ updatedAt: -1 })
      .limit(50)
      .select('vegetableName price unit market updatedAt');

    res.json({
      success: true,
      prices: prices.map(p => ({
        vegetableName: p.vegetableName,
        price: p.price,
        unit: p.unit,
        market: p.market
      }))
    });
  } catch (error) {
    console.error('[ADMIN MARKET STATS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch market stats',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/admin/market-prices/update
 * @desc    Trigger market price update
 * @access  Admin only
 */
router.post('/market-prices/update', verifyMainAdmin, async (req, res) => {
  try {
    const MarketPriceService = require('../services/marketPrice.service');
    
    if (typeof MarketPriceService.updateMarketPrices === 'function') {
      await MarketPriceService.updateMarketPrices();
      res.json({
        success: true,
        message: 'Market prices update triggered successfully'
      });
    } else {
      // If service not available, return success but with note
      res.json({
        success: true,
        message: 'Market price service not fully configured'
      });
    }
  } catch (error) {
    console.error('[ADMIN UPDATE MARKET PRICES] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update market prices',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/admin/subsidies/stats
 * @desc    Get subsidy statistics
 * @access  Admin only
 */
router.get('/subsidies/stats', verifyMainAdmin, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [totalSubsidies, activeSubsidies, expiringSubsidies] = await Promise.all([
      Subsidy.countDocuments(),
      Subsidy.countDocuments({ 
        status: 'active',
        endDate: { $gt: now }
      }),
      Subsidy.countDocuments({
        status: 'active',
        endDate: { $gte: now, $lte: thirtyDaysFromNow }
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalSubsidies,
        activeSubsidies,
        expiringSubsidies
      }
    });
  } catch (error) {
    console.error('[ADMIN SUBSIDY STATS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subsidy stats',
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
