const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const farmerSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [3, 'Name must be at least 3 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  cropType: {
    type: String,
    required: [true, 'Primary crop type is required'],
    enum: ['rice', 'wheat', 'vegetables', 'fruits', 'pulses', 'sugarcane', 'cotton', 'other']
  },
  language: {
    type: String,
    default: 'english',
    enum: ['english', 'kannada', 'hindi']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  approvedAt: {
    type: Date
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  rejectionReason: {
    type: String
  },
  lastLogin: {
    type: Date
  },
  loginHistory: [{
    timestamp: Date,
    ipAddress: String,
    userAgent: String
  }],
  subsidyApplications: [{
    subsidyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subsidy'
    },
    appliedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  profileUpdates: [{
    field: String,
    oldValue: String,
    newValue: String,
    updatedAt: Date
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
farmerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
farmerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to update last login
farmerSchema.methods.updateLastLogin = async function(ipAddress, userAgent) {
  this.lastLogin = new Date();
  if (this.loginHistory) {
    this.loginHistory.push({
      timestamp: new Date(),
      ipAddress,
      userAgent
    });
    // Keep only last 10 login records
    if (this.loginHistory.length > 10) {
      this.loginHistory = this.loginHistory.slice(-10);
    }
  }
  await this.save();
};

// Virtual for full address
farmerSchema.virtual('fullAddress').get(function() {
  return `${this.location}, Karnataka, India`;
});

// Index for faster queries
farmerSchema.index({ email: 1 });
farmerSchema.index({ mobile: 1 });
farmerSchema.index({ status: 1 });
farmerSchema.index({ registeredAt: -1 });

const Farmer = mongoose.model('Farmer', farmerSchema);

module.exports = Farmer;
