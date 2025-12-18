const express = require('express');
const router = express.Router();
const { authenticateAdmin, authenticateFarmer, authenticate } = require('../middleware/auth.middleware');
const { body, validationResult } = require('express-validator');

// Import Subsidy model (assuming it exists)
const Subsidy = require('../models/subsidy.model');

// Validation middleware for subsidy creation
const validateSubsidy = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('category').isIn(['seeds', 'equipment', 'fertilizer', 'insurance', 'credit', 'irrigation', 'other']).withMessage('Invalid category'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('eligibility').trim().notEmpty().withMessage('Eligibility criteria is required'),
  body('applicationDeadline').isISO8601().withMessage('Valid application deadline is required')
];

// ==================== ADMIN ROUTES (Protected) ====================

// POST /subsidies - Admin adds a new subsidy
router.post('/', authenticateAdmin, validateSubsidy, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      category,
      amount,
      eligibility,
      applicationDeadline,
      benefits,
      requiredDocuments,
      contactInfo,
      state
    } = req.body;

    const subsidy = new Subsidy({
      title,
      description,
      category,
      amount,
      eligibility,
      applicationDeadline,
      benefits: benefits || [],
      requiredDocuments: requiredDocuments || [],
      contactInfo: contactInfo || {},
      state: state || 'All India',
      isActive: true
    });

    await subsidy.save();

    res.status(201).json({
      success: true,
      message: 'Subsidy added successfully',
      data: subsidy
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add subsidy',
      error: error.message
    });
  }
});

// PUT /subsidies/:id - Admin updates a subsidy
router.put('/:id', authenticateAdmin, validateSubsidy, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const subsidy = await Subsidy.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
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
      data: subsidy
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update subsidy',
      error: error.message
    });
  }
});

// DELETE /subsidies/:id - Admin deletes a subsidy
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const subsidy = await Subsidy.findByIdAndDelete(id);

    if (!subsidy) {
      return res.status(404).json({
        success: false,
        message: 'Subsidy not found'
      });
    }

    res.json({
      success: true,
      message: 'Subsidy deleted successfully',
      data: {
        id: subsidy._id,
        title: subsidy.title
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete subsidy',
      error: error.message
    });
  }
});

// PATCH /subsidies/:id/toggle - Admin toggles subsidy active status
router.patch('/:id/toggle', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const subsidy = await Subsidy.findById(id);

    if (!subsidy) {
      return res.status(404).json({
        success: false,
        message: 'Subsidy not found'
      });
    }

    subsidy.isActive = !subsidy.isActive;
    subsidy.updatedAt = new Date();
    await subsidy.save();

    res.json({
      success: true,
      message: `Subsidy ${subsidy.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: subsidy._id,
        title: subsidy.title,
        isActive: subsidy.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to toggle subsidy status',
      error: error.message
    });
  }
});

// ==================== PUBLIC/FARMER ROUTES ====================

// GET /subsidies - View all approved (active) subsidies
router.get('/', async (req, res) => {
  try {
    const { category, state, page = 1, limit = 10 } = req.query;

    // Build query
    const query = { isActive: true };
    
    if (category) {
      query.category = category;
    }
    
    if (state) {
      query.$or = [
        { state: state },
        { state: 'All India' }
      ];
    }

    // Filter out expired subsidies
    query.applicationDeadline = { $gte: new Date() };

    const skip = (page - 1) * limit;

    const subsidies = await Subsidy.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Subsidy.countDocuments(query);

    res.json({
      success: true,
      data: {
        subsidies,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalSubsidies: total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subsidies',
      error: error.message
    });
  }
});

// GET /subsidies/:id - View single subsidy details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const subsidy = await Subsidy.findById(id);

    if (!subsidy) {
      return res.status(404).json({
        success: false,
        message: 'Subsidy not found'
      });
    }

    // Only show active subsidies to non-admin users
    if (!subsidy.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Subsidy not available'
      });
    }

    res.json({
      success: true,
      data: subsidy
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subsidy details',
      error: error.message
    });
  }
});

// GET /subsidies/category/:category - Get subsidies by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const query = {
      category,
      isActive: true,
      applicationDeadline: { $gte: new Date() }
    };

    const skip = (page - 1) * limit;

    const subsidies = await Subsidy.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Subsidy.countDocuments(query);

    res.json({
      success: true,
      data: {
        category,
        subsidies,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalSubsidies: total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subsidies by category',
      error: error.message
    });
  }
});

module.exports = router;
