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

    console.log('[ADMIN] Login attempt:', email);

    // Check if using JSON storage mode
    const useJsonStorage = process.env.USE_JSON_STORAGE === 'true' || !process.env.MONGODB_URI;

    let admin;
    let isValidPassword = false;

    if (useJsonStorage) {
      // Simple admin check for demo mode
      if (email === 'admin@krushimithra.com' && password === 'Admin@123') {
        admin = {
          _id: 'admin-1',
          email: 'admin@krushimithra.com',
          fullName: 'Super Admin',
          role: 'superadmin'
        };
        isValidPassword = true;
      }
    } else {
      // Database mode
      admin = await Admin.findOne({ email: email.toLowerCase() });
      if (admin) {
        isValidPassword = await admin.comparePassword(password);
      }
    }

    if (!admin || !isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: admin._id, 
        email: admin.email, 
        role: admin.role || 'admin'
      },
      process.env.JWT_SECRET || 'default-secret-key',
      { expiresIn: '24h' }
    );

    console.log('[ADMIN] ✅ Login successful:', email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role || 'admin'
      }
    });
  } catch (error) {
    console.error('[ADMIN] Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

/**
 * Get All Farmers (with filtering and pagination)
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
        data: safeFarmers,
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

    // Database mode
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

    const farmers = await Farmer.find(query)
      .select('-password')
      .sort({ registeredAt: -1 })
      .limit(parseInt(limit))
      .skip((page - 1) * limit);

    const total = await Farmer.countDocuments(query);

    // Get stats
    const stats = {
      total: await Farmer.countDocuments(),
      pending: await Farmer.countDocuments({ status: 'pending' }),
      approved: await Farmer.countDocuments({ status: 'approved' }),
      rejected: await Farmer.countDocuments({ status: 'rejected' })
    };

    res.json({
      success: true,
      data: farmers,
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
 * Get Pending Farmers (Awaiting Approval)
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
        data: safeFarmers,
        count: safeFarmers.length
      });
    }

    // Database mode
    const farmers = await Farmer.find({ status: 'pending' })
      .select('-password')
      .sort({ registeredAt: -1 });

    res.json({
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
