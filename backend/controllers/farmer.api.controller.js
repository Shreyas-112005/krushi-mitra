const jsonStorage = require('../utils/jsonStorage');

/**
 * Get Farmer Profile
 */
const getProfile = async (req, res) => {
  try {
    const farmer = req.farmer || await jsonStorage.findFarmerById(req.user.id);
    
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer profile not found'
      });
    }

    // Remove sensitive data
    const { password, ...farmerData } = farmer;

    res.json({
      success: true,
      data: farmerData
    });
  } catch (error) {
    console.error('[FARMER API] Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

/**
 * Update Farmer Profile
 */
const updateProfile = async (req, res) => {
  try {
    const { fullName, mobile, location, cropType, language } = req.body;
    
    const updatedFarmer = await jsonStorage.updateFarmer(req.user.id, {
      fullName,
      mobile,
      location,
      cropType,
      language,
      updatedAt: new Date()
    });

    if (!updatedFarmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer not found'
      });
    }

    const { password, ...farmerData } = updatedFarmer;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: farmerData
    });
  } catch (error) {
    console.error('[FARMER API] Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

/**
 * Update Language Preference
 */
const updateLanguage = async (req, res) => {
  try {
    const { language } = req.body;
    
    const updatedFarmer = await jsonStorage.updateFarmer(req.user.id, {
      language,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Language updated successfully',
      language
    });
  } catch (error) {
    console.error('[FARMER API] Update language error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating language'
    });
  }
};

/**
 * Get Available Subsidies
 */
const getAvailableSubsidies = async (req, res) => {
  try {
    // Government subsidies from various schemes
    const subsidies = [
      {
        _id: '1',
        title: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
        description: 'Direct income support of ₹6,000 per year in three equal installments to all landholding farmers',
        amount: 6000,
        category: 'income support',
        eligibility: 'All landholding farmers with cultivable land',
        state: 'All India',
        contactInfo: { website: 'https://pmkisan.gov.in' },
        applicationDeadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        active: true
      },
      {
        _id: '2',
        title: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
        description: 'Comprehensive crop insurance scheme protecting farmers against crop loss due to natural calamities, pests & diseases',
        amount: 200000,
        category: 'insurance',
        eligibility: 'All farmers growing notified crops',
        state: 'All India',
        contactInfo: { website: 'https://pmfby.gov.in' },
        applicationDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        active: true
      },
      {
        _id: '3',
        title: 'Kisan Credit Card (KCC)',
        description: 'Short-term credit support for farmers to meet crop cultivation expenses with subsidized interest rates',
        amount: 300000,
        category: 'credit',
        eligibility: 'Farmers with land ownership or valid lease documents',
        state: 'All India',
        contactInfo: { website: 'https://www.india.gov.in/spotlight/kisan-credit-card-kcc' },
        applicationDeadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        active: true
      },
      {
        _id: '4',
        title: 'Soil Health Card Scheme',
        description: 'Free soil testing and customized fertilizer recommendations to improve soil health and crop productivity',
        amount: 0,
        category: 'other',
        eligibility: 'All farmers across India',
        state: 'All India',
        contactInfo: { website: 'https://soilhealth.dac.gov.in' },
        applicationDeadline: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
        active: true
      },
      {
        _id: '5',
        title: 'PM Kisan Maandhan Yojana',
        description: 'Pension scheme providing ₹3,000 monthly pension to small and marginal farmers after 60 years of age',
        amount: 36000,
        category: 'pension',
        eligibility: 'Small and marginal farmers aged 18-40 years',
        state: 'All India',
        contactInfo: { website: 'https://maandhan.in' },
        applicationDeadline: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
        active: true
      },
      {
        _id: '6',
        title: 'National Agriculture Market (e-NAM)',
        description: 'Online trading platform for agricultural commodities to ensure better price discovery and transparent auction',
        amount: 0,
        category: 'market',
        eligibility: 'All farmers registered on e-NAM portal',
        state: 'All India',
        contactInfo: { website: 'https://www.enam.gov.in' },
        applicationDeadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        active: true
      },
      {
        _id: '7',
        title: 'Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)',
        description: 'Irrigation support to expand cultivable area and improve water use efficiency - Per Drop More Crop',
        amount: 50000,
        category: 'irrigation',
        eligibility: 'All farmers with access to water sources',
        state: 'All India',
        contactInfo: { website: 'https://pmksy.gov.in' },
        applicationDeadline: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
        active: true
      },
      {
        _id: '8',
        title: 'Paramparagat Krishi Vikas Yojana (PKVY)',
        description: 'Promotes organic farming through cluster approach and certification support for organic produce',
        amount: 50000,
        category: 'organic',
        eligibility: 'Farmers interested in organic farming',
        state: 'All India',
        contactInfo: { website: 'https://pgsindia-ncof.gov.in' },
        applicationDeadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        active: true
      }
    ];

    res.json({
      success: true,
      data: subsidies
    });
  } catch (error) {
    console.error('[FARMER API] Get subsidies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subsidies'
    });
  }
};

/**
 * Get Farmer's Subsidy Applications
 */
const getMySubsidies = async (req, res) => {
  try {
    // Return empty for now
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('[FARMER API] Get my subsidies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications'
    });
  }
};

/**
 * Apply for Subsidy
 */
const applyForSubsidy = async (req, res) => {
  try {
    const { subsidyId, documents } = req.body;

    res.json({
      success: true,
      message: 'Subsidy application submitted successfully',
      data: {
        applicationId: 'APP' + Date.now(),
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('[FARMER API] Apply subsidy error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting application'
    });
  }
};

/**
 * Get Market Prices
 */
const getMarketPrices = async (req, res) => {
  try {
    const { category = 'all' } = req.query;

    // Demo market prices
    const prices = [
      {
        _id: '1',
        commodity: 'Rice',
        category: 'grains',
        price: 2500,
        unit: 'quintal',
        market: 'Mysore APMC',
        change: '+4%',
        trend: 'up',
        date: new Date()
      },
      {
        _id: '2',
        commodity: 'Wheat',
        category: 'grains',
        price: 2200,
        unit: 'quintal',
        market: 'Bangalore APMC',
        change: '+2%',
        trend: 'up',
        date: new Date()
      },
      {
        _id: '3',
        commodity: 'Tomato',
        category: 'vegetables',
        price: 40,
        unit: 'kg',
        market: 'Mysore APMC',
        change: '+5%',
        trend: 'up',
        date: new Date()
      },
      {
        _id: '4',
        commodity: 'Onion',
        category: 'vegetables',
        price: 35,
        unit: 'kg',
        market: 'Mysore APMC',
        change: '-3%',
        trend: 'down',
        date: new Date()
      },
      {
        _id: '5',
        commodity: 'Potato',
        category: 'vegetables',
        price: 25,
        unit: 'kg',
        market: 'Bangalore APMC',
        change: '+2%',
        trend: 'up',
        date: new Date()
      },
      {
        _id: '6',
        commodity: 'Banana',
        category: 'fruits',
        price: 50,
        unit: 'dozen',
        market: 'Mysore APMC',
        change: '+3%',
        trend: 'up',
        date: new Date()
      }
    ];

    res.json({
      success: true,
      data: category === 'all' ? prices : prices.filter(p => p.category === category)
    });
  } catch (error) {
    console.error('[FARMER API] Get market prices error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching market prices'
    });
  }
};

/**
 * Get Price History
 */
const getPriceHistory = async (req, res) => {
  try {
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('[FARMER API] Get price history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching price history'
    });
  }
};

/**
 * Get Trending Prices
 */
const getTrendingPrices = async (req, res) => {
  try {
    res.json({
      success: true,
      data: []
    });
  } catch (error) {
    console.error('[FARMER API] Get trending prices error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trending prices'
    });
  }
};

/**
 * Get Weather Information
 */
const getWeather = async (req, res) => {
  try {
    const farmer = req.farmer;
    const weatherService = require('../services/weather.service');
    
    // Use farmer's location for weather data
    const location = farmer?.location || 'Bangalore';
    
    console.log(`[WEATHER API] Fetching weather for location: ${location}`);
    
    // Get real weather data from weather service
    const weatherData = await weatherService.getWeatherByLocation(location);
    
    res.json(weatherData);
  } catch (error) {
    console.error('[FARMER API] Get weather error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching weather'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  updateLanguage,
  getAvailableSubsidies,
  getMySubsidies,
  applyForSubsidy,
  getMarketPrices,
  getPriceHistory,
  getTrendingPrices,
  getWeather
};
