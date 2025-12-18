// Custom Error Classes
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 400);
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500, false);
    this.name = 'DatabaseError';
  }
}

// Async Error Handler Wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global Error Handler Middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error details
  console.error('Error:', {
    name: err.name,
    message: err.message,
    statusCode: error.statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });

  // Mongoose Bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid ID format';
    error = new ValidationError(message);
  }

  // Mongoose Duplicate Key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = new ConflictError(message);
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    error = new ValidationError('Validation failed', errors);
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token expired. Please login again');
  }

  // Send Error Response
  const response = {
    success: false,
    message: error.message || 'Internal server error',
    statusCode: error.statusCode
  };

  // Include additional error details in development
  if (process.env.NODE_ENV === 'development') {
    response.error = err.name;
    response.stack = err.stack;
  }

  // Include validation errors if present
  if (error.errors) {
    response.errors = error.errors;
  }

  res.status(error.statusCode).json(response);
};

// 404 Not Found Handler
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};

// Unhandled Rejection Handler
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // In production, you might want to gracefully shut down
    // process.exit(1);
  });
};

// Uncaught Exception Handler
const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Gracefully shut down
    process.exit(1);
  });
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  handleUnhandledRejection,
  handleUncaughtException
};
