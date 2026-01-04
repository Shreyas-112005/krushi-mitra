const express = require('express');
const router = express.Router();
const farmerController = require('../controllers/farmer.controller');
const { verifyToken } = require('../middleware/auth.middleware');

/**
 * FARMER AUTHENTICATION ROUTES
 * Clean and secure authentication flow
 */

// ============================================================
// REGISTRATION ROUTES (WITH OTP VERIFICATION)
// ============================================================

/**
 * @route   POST /api/farmers/register/request-otp
 * @desc    Request OTP for email verification during registration (Step 1)
 * @access  Public
 */
router.post('/register/request-otp', farmerController.requestRegistrationOTP);

/**
 * @route   POST /api/farmers/register/verify-otp
 * @desc    Verify OTP and complete registration (Step 2)
 * @access  Public
 */
router.post('/register/verify-otp', farmerController.verifyOTPAndRegister);

// ============================================================
// LOGIN ROUTE (EMAIL + PASSWORD)
// ============================================================

/**
 * @route   POST /api/farmers/login
 * @desc    Farmer login with email and password (NO OTP)
 * @access  Public
 */
router.post('/login', farmerController.login);

// ============================================================
// PROTECTED ROUTES (REQUIRE AUTHENTICATION)
// ============================================================

/**
 * @route   GET /api/farmers/profile
 * @desc    Get farmer profile
 * @access  Private (Farmer only)
 */
router.get('/profile', verifyToken, farmerController.getProfile);

/**
 * @route   PUT /api/farmers/profile
 * @desc    Update farmer profile
 * @access  Private (Farmer only)
 */
router.put('/profile', verifyToken, farmerController.updateProfile);

module.exports = router;
