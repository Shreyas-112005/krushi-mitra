const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

// Security Headers using Helmet
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
  referrerPolicy: { policy: 'same-origin' }
});

// Rate Limiting - General API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate Limiting - Authentication (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Rate Limiting - Registration
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registrations per hour
  message: {
    success: false,
    message: 'Too many registration attempts from this IP, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// MongoDB Query Sanitization
const sanitizeMongoQueries = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`Attempted NoSQL injection blocked on key: ${key}`);
  },
});

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Request Logger Middleware
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);
  
  // Log response time
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${timestamp}] ${method} ${url} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

// Security Audit Logger
const securityAuditLogger = (event, data) => {
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY AUDIT] [${timestamp}] ${event}:`, JSON.stringify(data));
  
  // In production, send to security monitoring service
  // e.g., sendToSecurityService({ timestamp, event, data });
};

// Prevent Parameter Pollution
const preventParameterPollution = (req, res, next) => {
  // Ensure query parameters are not arrays (prevent HPP attacks)
  for (const key in req.query) {
    if (Array.isArray(req.query[key])) {
      req.query[key] = req.query[key][0];
    }
  }
  next();
};

// Body Size Limiter
const bodySizeLimiter = (limit = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('content-length'));
    const limitBytes = parseSize(limit);
    
    if (contentLength > limitBytes) {
      return res.status(413).json({
        success: false,
        message: `Request body too large. Maximum size is ${limit}`
      });
    }
    
    next();
  };
};

// Helper function to parse size strings
const parseSize = (sizeStr) => {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = sizeStr.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
  
  if (!match) return 10 * 1024 * 1024; // Default 10MB
  
  return parseInt(match[1]) * units[match[2]];
};

// Trusted Proxy Configuration
const trustProxy = (app) => {
  // Trust first proxy
  app.set('trust proxy', 1);
};

// API Key Validation (for external integrations)
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API key is required'
    });
  }
  
  if (!validApiKeys.includes(apiKey)) {
    securityAuditLogger('INVALID_API_KEY_ATTEMPT', {
      ip: req.ip,
      apiKey: apiKey.substring(0, 8) + '...' // Log partial key only
    });
    
    return res.status(403).json({
      success: false,
      message: 'Invalid API key'
    });
  }
  
  next();
};

// SQL Injection Prevention (for SQL databases if used)
const preventSqlInjection = (req, res, next) => {
  const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi;
  
  const checkForSql = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string' && sqlPattern.test(obj[key])) {
        return true;
      } else if (typeof obj[key] === 'object') {
        if (checkForSql(obj[key])) return true;
      }
    }
    return false;
  };
  
  if (checkForSql(req.body) || checkForSql(req.query) || checkForSql(req.params)) {
    securityAuditLogger('SQL_INJECTION_ATTEMPT', {
      ip: req.ip,
      url: req.url,
      body: req.body,
      query: req.query
    });
    
    return res.status(400).json({
      success: false,
      message: 'Invalid input detected'
    });
  }
  
  next();
};

module.exports = {
  securityHeaders,
  generalLimiter,
  authLimiter,
  registrationLimiter,
  sanitizeMongoQueries,
  corsOptions,
  requestLogger,
  securityAuditLogger,
  preventParameterPollution,
  bodySizeLimiter,
  trustProxy,
  validateApiKey,
  preventSqlInjection
};
