const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Import Security Middleware
const {
  securityHeaders,
  generalLimiter,
  sanitizeMongoQueries,
  corsOptions,
  requestLogger,
  preventParameterPollution,
  bodySizeLimiter,
  trustProxy,
  preventSqlInjection
} = require('./middleware/security.middleware');

const {
  errorHandler,
  notFoundHandler,
  handleUnhandledRejection,
  handleUncaughtException
} = require('./middleware/error.middleware');

const app = express();

// Handle uncaught exceptions and unhandled rejections
handleUncaughtException();
handleUnhandledRejection();

// Trust proxy (for rate limiting behind reverse proxy)
trustProxy(app);

// Security Headers
app.use(securityHeaders);

// CORS with specific configuration
app.use(cors(corsOptions));

// Request Logger (for monitoring)
if (process.env.NODE_ENV !== 'production') {
  app.use(requestLogger);
}

// Body Parser with size limit
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB Query Sanitization
app.use(sanitizeMongoQueries);

// Prevent Parameter Pollution
app.use(preventParameterPollution);

// SQL Injection Prevention
app.use(preventSqlInjection);

// Body Size Limiter
app.use(bodySizeLimiter('10mb'));

// General Rate Limiting
app.use('/api/', generalLimiter);

// Static Files - Serve frontend folder
const path = require('path');
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));
app.use(express.static(path.join(__dirname, '../frontend'))); // Also serve from root for backward compatibility

// Database Connection (non-blocking)
const dbConfig = require('./config/database');
let isDbConnected = false;

// Only connect to MongoDB if MONGODB_URI is set
if (process.env.MONGODB_URI) {
  mongoose.connect(dbConfig.url, {
    serverSelectionTimeoutMS: 5000 // Fail fast if MongoDB is not available
  })
  .then(() => {
    console.log('✅ Successfully connected to MongoDB');
    isDbConnected = true;
    
    // Initialize MAIN_ADMIN on successful DB connection
    setTimeout(async () => {
      try {
        const { initializeMainAdmin } = require('./utils/initAdmin');
        await initializeMainAdmin();
      } catch (error) {
        console.error('⚠️  Failed to initialize admin:', error.message);
      }
    }, 1000);
  })
  .catch((err) => {
    console.warn('⚠️  MongoDB connection failed - Running in JSON storage mode');
    console.warn('   All data will be stored in JSON files');
    console.warn('   Error:', err.message);
    isDbConnected = false;
  });
} else {
  console.log('💾 Running in JSON file storage mode - No MongoDB connection');
  console.log('   All data will be stored in data/ folder');
}

// Export DB status for controllers
app.locals.isDbConnected = () => isDbConnected;

// Routes
app.get('/', (req, res) => {
  res.redirect('/frontend/html/index.html');
});

// Import routes
const farmerRoutes = require('./routes/farmer.routes');
const farmerApiRoutes = require('./routes/farmer.api.routes');
const adminRoutes = require('./routes/admin.routes');

app.use('/api/farmers', farmerRoutes);
app.use('/api/farmer', farmerApiRoutes);
app.use('/api/admin', adminRoutes);

// 404 Handler - Must be after all routes
app.use(notFoundHandler);

// Global Error Handler - Must be last
app.use(errorHandler);

// Initialize scheduled jobs
const { initializeScheduledJobs, triggerManualUpdate } = require('./config/scheduler');

// Start server immediately - don't wait for DB
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🌾 KRUSHI MITHRA Server Started`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📡 Server URL: http://localhost:${PORT}`);
  console.log(`🌐 Frontend:   http://localhost:${PORT}/frontend/html/index.html`);
  console.log(`👨‍🌾 Farmer:     http://localhost:${PORT}/frontend/html/register.html`);
  console.log(`👨‍💼 Admin:      http://localhost:${PORT}/frontend/html/admin-login.html`);
  console.log(`${'='.repeat(60)}\n`);
});

// Initialize scheduled jobs
try {
  const { initializeScheduledJobs } = require('./config/scheduler');
  initializeScheduledJobs();
} catch (error) {
  console.warn('⚠️  Scheduler initialization skipped:', error.message);
}

// Wait for DB connection then load prices
setTimeout(async () => {
  if (isDbConnected) {
    try {
      const { triggerManualUpdate } = require('./config/scheduler');
      console.log('📊 Loading initial market prices...');
      await triggerManualUpdate();
      console.log('✅ Market prices loaded successfully\n');
    } catch (error) {
      console.warn('⚠️  Could not load market prices:', error.message);
    }
  } else {
    console.log('💡 Running in DEMO MODE - Using simulated data');
    console.log('   All APIs will work with demo data');
    console.log('   To enable database: Start MongoDB on localhost:27017\n');
  }
}, 6000); // Wait 6 seconds for DB connection attempt

module.exports = server;
