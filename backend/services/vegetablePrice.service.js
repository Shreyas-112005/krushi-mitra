const axios = require('axios');
const cheerio = require('cheerio');
const MarketPrice = require('../models/marketPrice.model');

/**
 * Vegetable Price Scraping Service
 * Fetches daily prices from vegetablemarketprice.com for Karnataka
 */

class VegetablePriceService {
  constructor() {
    this.baseURL = 'https://vegetablemarketprice.com/market/karnataka/today';
    this.lastFetchTime = null;
    this.cacheTimeout = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
  }

  /**
   * Fetch and parse vegetable prices from website
   */
  async fetchPrices() {
    try {
      console.log('[PRICE SERVICE] Fetching vegetable prices from:', this.baseURL);
      
      const response = await axios.get(this.baseURL, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const prices = [];

      // Parse the price table
      $('table tr').each((index, element) => {
        if (index === 0) return; // Skip header row

        const cols = $(element).find('td');
        if (cols.length >= 4) {
          const commodity = $(cols[0]).text().trim();
          const unit = $(cols[1]).text().trim();
          const minPrice = parseFloat($(cols[2]).text().trim().replace(/[^\d.]/g, ''));
          const maxPrice = parseFloat($(cols[3]).text().trim().replace(/[^\d.]/g, ''));

          if (commodity && !isNaN(minPrice) && !isNaN(maxPrice)) {
            const avgPrice = (minPrice + maxPrice) / 2;
            prices.push({
              vegetableName: commodity,
              commodity: commodity,
              price: avgPrice,
              unit: unit.toLowerCase(),
              minPrice,
              maxPrice,
              market: 'Karnataka',
              state: 'Karnataka',
              category: 'vegetable',
              source: 'vegetablemarketprice.com',
              priceDate: new Date(),
              isActive: true
            });
          }
        }
      });

      if (prices.length > 0) {
        console.log(`[PRICE SERVICE] Successfully scraped ${prices.length} prices`);
        return prices;
      } else {
        console.warn('[PRICE SERVICE] No prices found, using fallback data');
        return this.getFallbackPrices();
      }
    } catch (error) {
      console.error('[PRICE SERVICE] Error fetching prices:', error.message);
      return this.getFallbackPrices();
    }
  }

  /**
   * Update database with fetched prices
   */
  async updateDatabasePrices() {
    try {
      const prices = await this.fetchPrices();

      if (prices.length === 0) {
        console.warn('[PRICE SERVICE] No prices to update');
        return { success: false, message: 'No prices fetched' };
      }

      // Delete old prices (older than 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      await MarketPrice.deleteMany({ priceDate: { $lt: weekAgo } });

      // Insert new prices
      const insertedPrices = await MarketPrice.insertMany(prices);

      this.lastFetchTime = new Date();

      console.log(`[PRICE SERVICE] Updated ${insertedPrices.length} prices in database`);

      return {
        success: true,
        count: insertedPrices.length,
        lastUpdate: this.lastFetchTime
      };
    } catch (error) {
      console.error('[PRICE SERVICE] Error updating database:', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Get latest prices from database
   */
  async getLatestPrices(category = 'all', limit = 50) {
    try {
      let query = {};

      // Category filtering
      if (category && category !== 'all') {
        const categoryPatterns = {
          'vegetables': /tomato|onion|potato|carrot|cabbage|cauliflower|brinjal|beans|peas|capsicum|cucumber|spinach|lettuce/i,
          'fruits': /apple|banana|orange|mango|grape|guava|papaya|watermelon|pomegranate/i,
          'grains': /rice|wheat|maize|bajra|jowar|ragi/i
        };

        if (categoryPatterns[category]) {
          query.commodity = categoryPatterns[category];
        }
      }

      const prices = await MarketPrice.find(query)
        .sort({ date: -1 })
        .limit(limit);

      return prices;
    } catch (error) {
      console.error('[PRICE SERVICE] Error getting latest prices:', error.message);
      return this.getFallbackPrices();
    }
  }

  /**
   * Check if cache is still valid
   */
  isCacheValid() {
    if (!this.lastFetchTime) return false;
    const now = new Date();
    return (now - this.lastFetchTime) < this.cacheTimeout;
  }

  /**
   * Fallback prices when scraping fails
   */
  getFallbackPrices() {
    const today = new Date();
    return [
      { vegetableName: 'Tomato', commodity: 'Tomato', unit: 'quintal', price: 2750, minPrice: 2000, maxPrice: 3500, market: 'Karnataka', state: 'Karnataka', category: 'vegetable', source: 'fallback', priceDate: today, isActive: true },
      { vegetableName: 'Onion', commodity: 'Onion', unit: 'quintal', price: 1850, minPrice: 1500, maxPrice: 2200, market: 'Karnataka', state: 'Karnataka', category: 'vegetable', source: 'fallback', priceDate: today, isActive: true },
      { vegetableName: 'Potato', commodity: 'Potato', unit: 'quintal', price: 2100, minPrice: 1800, maxPrice: 2400, market: 'Karnataka', state: 'Karnataka', category: 'vegetable', source: 'fallback', priceDate: today, isActive: true },
      { vegetableName: 'Rice', commodity: 'Rice', unit: 'quintal', price: 3750, minPrice: 3000, maxPrice: 4500, market: 'Karnataka', state: 'Karnataka', category: 'grain', source: 'fallback', priceDate: today, isActive: true },
      { vegetableName: 'Wheat', commodity: 'Wheat', unit: 'quintal', price: 2850, minPrice: 2500, maxPrice: 3200, market: 'Karnataka', state: 'Karnataka', category: 'grain', source: 'fallback', priceDate: today, isActive: true },
      { vegetableName: 'Banana', commodity: 'Banana', unit: 'dozen', price: 45, minPrice: 30, maxPrice: 60, market: 'Karnataka', state: 'Karnataka', category: 'fruit', source: 'fallback', priceDate: today, isActive: true },
      { vegetableName: 'Apple', commodity: 'Apple', unit: 'kg', price: 150, minPrice: 120, maxPrice: 180, market: 'Karnataka', state: 'Karnataka', category: 'fruit', source: 'fallback', priceDate: today, isActive: true },
      { vegetableName: 'Carrot', commodity: 'Carrot', unit: 'quintal', price: 1500, minPrice: 1200, maxPrice: 1800, market: 'Karnataka', state: 'Karnataka', category: 'vegetable', source: 'fallback', priceDate: today, isActive: true },
      { vegetableName: 'Cabbage', commodity: 'Cabbage', unit: 'quintal', price: 1300, minPrice: 1000, maxPrice: 1600, market: 'Karnataka', state: 'Karnataka', category: 'vegetable', source: 'fallback', priceDate: today, isActive: true },
      { vegetableName: 'Beans', commodity: 'Beans', unit: 'quintal', price: 3000, minPrice: 2500, maxPrice: 3500, market: 'Karnataka', state: 'Karnataka', category: 'vegetable', source: 'fallback', priceDate: today, isActive: true }
    ];
  }
}

// Create singleton instance
const vegetablePriceService = new VegetablePriceService();

module.exports = vegetablePriceService;
