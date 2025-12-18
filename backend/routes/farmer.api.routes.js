const express = require('express');
const router = express.Router();
const farmerApiController = require('../controllers/farmer.api.controller');
const notificationController = require('../controllers/notification.controller');
const { verifyFarmerToken } = require('../middleware/auth.farmer');
const {
  validateProfileUpdate,
  validateSubsidyApplication,
  validateLanguageUpdate,
  validateObjectId
} = require('../middleware/validation.middleware');
const { requireFarmer } = require('../middleware/rbac.middleware');

// All routes are protected with farmer JWT authentication
router.use(verifyFarmerToken);
router.use(requireFarmer);

// ==================== PROFILE ROUTES ====================
router.get('/profile', farmerApiController.getProfile);
router.put('/profile', validateProfileUpdate, farmerApiController.updateProfile);
router.put('/update-language', validateLanguageUpdate, farmerApiController.updateLanguage);

// ==================== SUBSIDY ROUTES ====================
router.get('/subsidies', farmerApiController.getAvailableSubsidies);
router.get('/subsidies/my-applications', farmerApiController.getMySubsidies);
router.post('/subsidies/apply', validateSubsidyApplication, farmerApiController.applyForSubsidy);

// ==================== NOTIFICATION ROUTES ====================
router.get('/notifications', notificationController.getFarmerNotifications);
router.put('/notifications/:id/read', validateObjectId('id'), notificationController.markAsRead);

// ==================== MARKET PRICES ROUTES ====================
router.get('/market-prices', farmerApiController.getMarketPrices);
router.get('/market-prices/history', farmerApiController.getPriceHistory);
router.get('/market-prices/trending', farmerApiController.getTrendingPrices);

// ==================== WEATHER ROUTES ====================
router.get('/weather', farmerApiController.getWeather);

module.exports = router;
