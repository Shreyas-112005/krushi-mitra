const express = require('express');
const router = express.Router();
const marketPriceService = require('../services/marketPrice.service');

// GET /market-prices - Get all market prices
router.get('/', async (req, res) => {
  try {
    const { category, market, state } = req.query;
    const allPrices = await marketPriceService.getLatestPrices();
    
    let vegetables = allPrices.vegetables || [];
    let fruits = allPrices.fruits || [];
    let grains = allPrices.grains || [];
    
    // Filter by category
    if (category === 'vegetables') {
      fruits = [];
      grains = [];
    } else if (category === 'fruits') {
      vegetables = [];
      grains = [];
    } else if (category === 'grains') {
      vegetables = [];
      fruits = [];
    }
    
    // Filter by market
    if (market) {
      vegetables = vegetables.filter(item => item.market.toLowerCase().includes(market.toLowerCase()));
      fruits = fruits.filter(item => item.market.toLowerCase().includes(market.toLowerCase()));
      grains = grains.filter(item => item.market.toLowerCase().includes(market.toLowerCase()));
    }
    
    // Filter by state
    if (state) {
      vegetables = vegetables.filter(item => item.state.toLowerCase() === state.toLowerCase());
      fruits = fruits.filter(item => item.state.toLowerCase() === state.toLowerCase());
      grains = grains.filter(item => item.state.toLowerCase() === state.toLowerCase());
    }
    
    res.json({
      success: true,
      data: {
        lastUpdated: new Date().toISOString(),
        dateRecorded: new Date().toISOString().split('T')[0],
        source: 'Indian Government Market Data APIs',
        vegetables,
        fruits,
        grains,
        totalItems: vegetables.length + fruits.length + grains.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch market prices',
      error: error.message
    });
  }
});

// GET /market-prices/vegetables - Get vegetable prices only
router.get('/vegetables', async (req, res) => {
  try {
    const allPrices = await marketPriceService.getLatestPrices();
    const { market, state, sort } = req.query;
    
    let vegetables = allPrices.vegetables || [];
    
    // Filter by market
    if (market) {
      vegetables = vegetables.filter(item => item.market.toLowerCase().includes(market.toLowerCase()));
    }
    
    // Filter by state
    if (state) {
      vegetables = vegetables.filter(item => item.state.toLowerCase() === state.toLowerCase());
    }
    
    // Sort options
    if (sort === 'price-asc') {
      vegetables.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      vegetables.sort((a, b) => b.price - a.price);
    } else if (sort === 'name') {
      vegetables.sort((a, b) => a.commodity.localeCompare(b.commodity));
    }
    
    res.json({
      success: true,
      data: {
        category: 'vegetables',
        lastUpdated: new Date().toISOString(),
        dateRecorded: new Date().toISOString().split('T')[0],
        source: 'Indian Government Market Data APIs',
        items: vegetables,
        totalItems: vegetables.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vegetable prices',
      error: error.message
    });
  }
});

// GET /market-prices/fruits - Get fruit prices only
router.get('/fruits', async (req, res) => {
  try {
    const data = getDailyPrices();
    const { market, state, sort } = req.query;
    
    let fruits = data.fruits;
    
    // Filter by market
    if (market) {
      fruits = fruits.filter(item => item.market.toLowerCase().includes(market.toLowerCase()));
    }
    
    // Filter by state
    if (state) {
      fruits = fruits.filter(item => item.state.toLowerCase() === state.toLowerCase());
    }
    
    // Sort options
    if (sort === 'price-asc') {
      fruits.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      fruits.sort((a, b) => b.price - a.price);
    } else if (sort === 'name') {
      fruits.sort((a, b) => a.commodity.localeCompare(b.commodity));
    }
    
    res.json({
      success: true,
      data: {
        category: 'fruits',
        lastUpdated: data.lastUpdated,
        dateRecorded: data.dateRecorded,
        source: data.source,
        items: fruits,
        totalItems: fruits.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fruit prices',
      error: error.message
    });
  }
});

// GET /market-prices/commodity/:name - Get specific commodity price
router.get('/commodity/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const data = getDailyPrices();
    
    const allItems = [...data.vegetables, ...data.fruits];
    const commodity = allItems.find(item => 
      item.commodity.toLowerCase() === name.toLowerCase()
    );
    
    if (!commodity) {
      return res.status(404).json({
        success: false,
        message: `Commodity '${name}' not found`
      });
    }
    
    res.json({
      success: true,
      data: {
        lastUpdated: data.lastUpdated,
        dateRecorded: data.dateRecorded,
        source: data.source,
        commodity
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch commodity price',
      error: error.message
    });
  }
});

// GET /market-prices/trending - Get trending commodities (biggest price changes)
router.get('/trending', async (req, res) => {
  try {
    const data = getDailyPrices();
    const allItems = [...data.vegetables, ...data.fruits];
    
    // Sort by absolute price change
    const trending = allItems
      .map(item => ({
        ...item,
        absoluteChange: Math.abs(item.priceChange)
      }))
      .sort((a, b) => b.absoluteChange - a.absoluteChange)
      .slice(0, 10);
    
    res.json({
      success: true,
      data: {
        lastUpdated: data.lastUpdated,
        dateRecorded: data.dateRecorded,
        source: data.source,
        trending
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending commodities',
      error: error.message
    });
  }
});

// GET /market-prices/markets - Get list of available markets
router.get('/markets', async (req, res) => {
  try {
    const data = marketPriceData;
    const allItems = [...data.vegetables, ...data.fruits];
    
    const markets = [...new Set(allItems.map(item => ({
      market: item.market,
      state: item.state,
      district: item.district
    })))];
    
    // Remove duplicates based on market name
    const uniqueMarkets = markets.filter((market, index, self) =>
      index === self.findIndex((m) => m.market === market.market)
    );
    
    res.json({
      success: true,
      data: {
        markets: uniqueMarkets,
        totalMarkets: uniqueMarkets.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch markets',
      error: error.message
    });
  }
});

// GET /market-prices/statistics - Get price statistics
router.get('/statistics', async (req, res) => {
  try {
    const data = getDailyPrices();
    const allItems = [...data.vegetables, ...data.fruits];
    
    const statistics = {
      totalCommodities: allItems.length,
      totalVegetables: data.vegetables.length,
      totalFruits: data.fruits.length,
      averageVegetablePrice: Math.round(
        data.vegetables.reduce((sum, item) => sum + item.price, 0) / data.vegetables.length
      ),
      averageFruitPrice: Math.round(
        data.fruits.reduce((sum, item) => sum + item.price, 0) / data.fruits.length
      ),
      pricesUp: allItems.filter(item => item.trend === 'up').length,
      pricesDown: allItems.filter(item => item.trend === 'down').length,
      pricesStable: allItems.filter(item => item.trend === 'stable').length,
      highestPrice: allItems.reduce((max, item) => item.price > max.price ? item : max),
      lowestPrice: allItems.reduce((min, item) => item.price < min.price ? item : min)
    };
    
    res.json({
      success: true,
      data: {
        lastUpdated: data.lastUpdated,
        statistics
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

module.exports = router;
