const cron = require('node-cron');
const MarketPriceService = require('../services/marketPrice.service');

// Schedule market price updates
function initializeScheduledJobs() {
  console.log('Initializing scheduled jobs...');

  // Update market prices daily at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    console.log('Running scheduled market price update...');
    try {
      await MarketPriceService.updateMarketPrices();
      console.log('Market prices updated successfully');
    } catch (error) {
      console.error('Error in scheduled price update:', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // Optional: Update prices multiple times a day
  // Update at 8 AM, 12 PM, and 4 PM
  cron.schedule('0 8,12,16 * * *', async () => {
    console.log('Running scheduled market price update...');
    try {
      await MarketPriceService.updateMarketPrices();
      console.log('Market prices updated successfully');
    } catch (error) {
      console.error('Error in scheduled price update:', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('Scheduled jobs initialized successfully');
  console.log('- Market prices will update daily at 8:00 AM, 12:00 PM, and 4:00 PM IST');
}

// Manual trigger for testing or admin use
async function triggerManualUpdate() {
  console.log('Triggering manual market price update...');
  try {
    const result = await MarketPriceService.updateMarketPrices();
    console.log('Manual update completed:', result);
    return result;
  } catch (error) {
    console.error('Error in manual update:', error);
    throw error;
  }
}

module.exports = {
  initializeScheduledJobs,
  triggerManualUpdate
};
