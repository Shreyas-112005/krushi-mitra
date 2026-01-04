const Farmer = require('../models/farmer.model');
const Admin = require('../models/admin.model');
const jsonStorage = require('../utils/jsonStorage');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Admin Login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('[ADMIN LOGIN] Received login request for:', email);

    // Check if using JSON storage mode
    const useJsonStorage = process.env.USE_JSON_STORAGE === 'true';
    console.log('[ADMIN LOGIN] Using JSON storage mode:', useJsonStorage);

    let admin;
    let isValidPassword = false;

    if (useJsonStorage) {
      console.log('[ADMIN LOGIN] Using JSON storage mode authentication');
      // Simple admin check for demo mode
      if (email === 'admin@krushimithra.com' && password === 'Admin@12345') {
        admin = {
          _id: 'main_admin_json',
          email: 'admin@krushimithra.com',
          username: 'main_admin',
          role: 'super_admin'
        };
        isValidPassword = true;
        console.log('[ADMIN LOGIN] JSON mode login successful');
      } else {
        console.log('[ADMIN LOGIN] JSON mode credentials mismatch');
      }
    } else {
      console.log('[ADMIN LOGIN] Using MongoDB authentication');
      // Database mode
      admin = await Admin.findOne({ email: email.toLowerCase() });
      console.log('[ADMIN LOGIN] Admin found in database:', admin ? 'Yes' : 'No');
      
      if (admin) {
        console.log('[ADMIN LOGIN] Admin details:', { 
          username: admin.username, 
          email: admin.email, 
          role: admin.role,
          isActive: admin.isActive 
        });
        isValidPassword = await admin.comparePassword(password);
        console.log('[ADMIN LOGIN] Password valid:', isValidPassword);
      } else {
        console.log('[ADMIN LOGIN] No admin found with email:', email);
      }
    }

    if (!admin || !isValidPassword) {
      console.log('[ADMIN LOGIN] ❌ Login failed - Invalid credentials');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if admin is active
    if (admin.isActive === false) {
      console.log('[ADMIN LOGIN] ❌ Login failed - Admin account is inactive');
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: admin._id, 
        email: admin.email, 
        role: admin.role || 'admin',
        type: 'admin'
      },
      process.env.JWT_SECRET || 'krushi_mithra_secret_key_2025_secure_token',
      { expiresIn: '24h' }
    );

    console.log('[ADMIN LOGIN] ✅ Login successful for:', email);

    // Update last login
    if (!useJsonStorage && admin.updateOne) {
      await admin.updateOne({ lastLogin: new Date() });
    }

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        username: admin.username,
        role: admin.role || 'admin'
      }
    });
  } catch (error) {
    console.error('[ADMIN LOGIN] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

/**
 * Get All Farmers (with filtering and pagination) - OPTIMIZED
 */
const getAllFarmers = async (req, res) => {
  try {
    const { status, page = 1, limit = 50, search } = req.query;

    console.log('[ADMIN] Getting all farmers, status filter:', status);

    const useJsonStorage = process.env.USE_JSON_STORAGE === 'true' || !process.env.MONGODB_URI;

    if (useJsonStorage) {
      // JSON storage mode
      let farmers = jsonStorage.getAllFarmers();

      // Apply status filter
      if (status) {
        farmers = farmers.filter(f => f.status === status);
      }

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        farmers = farmers.filter(f => 
          f.fullName.toLowerCase().includes(searchLower) ||
          f.email.toLowerCase().includes(searchLower) ||
          f.mobile.includes(search) ||
          f.location.toLowerCase().includes(searchLower)
        );
      }

      // Sort by registration date (newest first)
      farmers.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

      // Pagination
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const paginatedFarmers = farmers.slice(startIndex, endIndex);

      // Remove passwords
      const safeFarmers = paginatedFarmers.map(({ password, ...farmer }) => farmer);

      return res.json({
        success: true,
        farmers: safeFarmers,
        pagination: {
          total: farmers.length,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(farmers.length / limit)
        },
        stats: {
          total: jsonStorage.getAllFarmers().length,
          pending: jsonStorage.getAllFarmers().filter(f => f.status === 'pending').length,
          approved: jsonStorage.getAllFarmers().filter(f => f.status === 'approved').length,
          rejected: jsonStorage.getAllFarmers().filter(f => f.status === 'rejected').length
        }
      });
    }

    // Database mode - OPTIMIZED with lean() and select only needed fields
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    // Use Promise.all to run queries in parallel
    const [farmers, total, statsResults] = await Promise.all([
      Farmer.find(query)
        .select('-password')
        .sort({ registeredAt: -1 })
        .limit(parseInt(limit))
        .skip((page - 1) * limit)
        .lean(), // Use lean() for better performance
      Farmer.countDocuments(query),
      // Get all stats in one aggregation query
      Farmer.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Process stats
    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };
    
    statsResults.forEach(stat => {
      stats.total += stat.count;
      if (stat._id === 'pending') stats.pending = stat.count;
      else if (stat._id === 'approved') stats.approved = stat.count;
      else if (stat._id === 'rejected') stats.rejected = stat.count;
    });

    res.json({
      success: true,
      farmers: farmers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      stats
    });
  } catch (error) {
    console.error('[ADMIN] Get farmers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching farmers'
    });
  }
};

/**
 * Get Pending Farmers (Awaiting Approval) - OPTIMIZED
 */
const getPendingFarmers = async (req, res) => {
  try {
    console.log('[ADMIN] Getting pending farmers');

    const useJsonStorage = process.env.USE_JSON_STORAGE === 'true' || !process.env.MONGODB_URI;

    if (useJsonStorage) {
      const farmers = jsonStorage.getAllFarmers()
        .filter(f => f.status === 'pending')
        .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

      const safeFarmers = farmers.map(({ password, ...farmer }) => farmer);

      return res.json({
        success: true,
        farmers: safeFarmers,
        count: safeFarmers.length
      });
    }

    // Database mode - Use lean() for better performance
    const farmers = await Farmer.find({ status: 'pending' })
      .select('-password')
      .sort({ registeredAt: -1 })
      .lean();

    res.json({
      success: true,
      farmers: farmers,
      count: farmers.length
    });
  } catch (error) {
    console.error('[ADMIN] Get pending farmers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending farmers'
    });
  }
};
      success: true,
      data: farmers,
      count: farmers.length
    });
  } catch (error) {
    console.error('[ADMIN] Get pending farmers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending farmers'
    });
  }
};

/**
 * Approve Farmer
 */
const approveFarmer = async (req, res) => {
  try {
    const { farmerId } = req.params;

    console.log('[ADMIN] Approving farmer:', farmerId);

    const useJsonStorage = process.env.USE_JSON_STORAGE === 'true' || !process.env.MONGODB_URI;

    if (useJsonStorage) {
      const farmer = jsonStorage.updateFarmer(farmerId, {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: req.user.id
      });

      if (!farmer) {
        return res.status(404).json({
          success: false,
          message: 'Farmer not found'
        });
      }

      return res.json({
        success: true,
        message: 'Farmer approved successfully',
        farmer: { ...farmer, password: undefined }
      });
    }

    // Database mode
    const farmer = await Farmer.findByIdAndUpdate(
      farmerId,
      {
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: req.user.id
      },
      { new: true }
    ).select('-password');

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    res.json({
      success: true,
      message: 'Farmer approved successfully',
      farmer
    });
  } catch (error) {
    console.error('[ADMIN] Approve farmer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving farmer'
    });
  }
};

/**
 * Reject Farmer
 */
const rejectFarmer = async (req, res) => {
  try {
    const { farmerId } = req.params;
    const { reason } = req.body;

    console.log('[ADMIN] Rejecting farmer:', farmerId, 'Reason:', reason);

    const useJsonStorage = process.env.USE_JSON_STORAGE === 'true' || !process.env.MONGODB_URI;

    if (useJsonStorage) {
      const farmer = jsonStorage.updateFarmer(farmerId, {
        status: 'rejected',
        rejectionReason: reason || 'Not specified'
      });

      if (!farmer) {
        return res.status(404).json({
          success: false,
          message: 'Farmer not found'
        });
      }

      return res.json({
        success: true,
        message: 'Farmer rejected',
        farmer: { ...farmer, password: undefined }
      });
    }

    // Database mode
    const farmer = await Farmer.findByIdAndUpdate(
      farmerId,
      {
        status: 'rejected',
        rejectionReason: reason || 'Not specified'
      },
      { new: true }
    ).select('-password');

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    res.json({
      success: true,
      message: 'Farmer rejected',
      farmer
    });
  } catch (error) {
    console.error('[ADMIN] Reject farmer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting farmer'
    });
  }
};

/**
 * Get Farmer Details
 */
const getFarmerDetails = async (req, res) => {
  try {
    const { farmerId } = req.params;

    const useJsonStorage = process.env.USE_JSON_STORAGE === 'true' || !process.env.MONGODB_URI;

    if (useJsonStorage) {
      const farmer = jsonStorage.findFarmerById(farmerId);

      if (!farmer) {
        return res.status(404).json({
          success: false,
          message: 'Farmer not found'
        });
      }

      const { password, ...farmerData } = farmer;

      return res.json({
        success: true,
        data: farmerData
      });
    }

    // Database mode
    const farmer = await Farmer.findById(farmerId)
      .select('-password')
      .populate('approvedBy', 'fullName email');

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    res.json({
      success: true,
      data: farmer
    });
  } catch (error) {
    console.error('[ADMIN] Get farmer details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching farmer details'
    });
  }
};

/**
 * Get Dashboard Statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    const useJsonStorage = process.env.USE_JSON_STORAGE === 'true' || !process.env.MONGODB_URI;

    if (useJsonStorage) {
      const farmers = jsonStorage.getAllFarmers();

      const stats = {
        totalFarmers: farmers.length,
        pendingApprovals: farmers.filter(f => f.status === 'pending').length,
        approvedFarmers: farmers.filter(f => f.status === 'approved').length,
        rejectedFarmers: farmers.filter(f => f.status === 'rejected').length,
        recentRegistrations: farmers
          .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt))
          .slice(0, 5)
          .map(({ password, ...f }) => f)
      };

      return res.json({
        success: true,
        stats
      });
    }

    // Database mode
    const totalFarmers = await Farmer.countDocuments();
    const pendingApprovals = await Farmer.countDocuments({ status: 'pending' });
    const approvedFarmers = await Farmer.countDocuments({ status: 'approved' });
    const rejectedFarmers = await Farmer.countDocuments({ status: 'rejected' });

    const recentRegistrations = await Farmer.find()
      .select('-password')
      .sort({ registeredAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalFarmers,
        pendingApprovals,
        approvedFarmers,
        rejectedFarmers,
        recentRegistrations
      }
    });
  } catch (error) {
    console.error('[ADMIN] Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
};

module.exports = {
  login,
  getAllFarmers,
  getPendingFarmers,
  approveFarmer,
  rejectFarmer,
  getFarmerDetails,
  getDashboardStats
};
