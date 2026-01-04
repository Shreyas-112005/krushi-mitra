const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'moderator'],
    default: 'admin'
  },
  permissions: [{
    type: String,
    enum: ['all', 'view_farmers', 'approve_farmers', 'manage_subsidies', 'manage_prices', 'send_notifications']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update the updatedAt timestamp before each save
adminSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to compare password
adminSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Error comparing password:', error);
    return false;
  }
};

// Static method to check if main admin exists
adminSchema.statics.mainAdminExists = async function() {
  const count = await this.countDocuments({ role: 'super_admin' });
  return count > 0;
};

// Static method to create main admin
adminSchema.statics.createMainAdmin = async function(username, email, password) {
  const admin = new this({
    username,
    email,
    password,
    role: 'super_admin',
    permissions: ['all'],
    isActive: true
  });
  return await admin.save();
};

module.exports = mongoose.model('Admin', adminSchema);
