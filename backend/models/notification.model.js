const mongoose = require('mongoose');

/**
 * Notification Model
 * For admin-to-farmer notifications
 */

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'alert', 'announcement'],
    default: 'info'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  icon: {
    type: String,
    default: '📢'
  },
  targetAudience: {
    type: String,
    enum: ['all', 'approved', 'pending', 'location', 'crop'],
    default: 'all'
  },
  targetLocations: [{
    type: String
  }],
  targetCrops: [{
    type: String
  }],
  expiryDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  readBy: [{
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Farmer'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for faster queries
notificationSchema.index({ targetAudience: 1, isActive: 1, createdAt: -1 });
notificationSchema.index({ expiryDate: 1 });

// Virtual for checking if notification is expired
notificationSchema.virtual('isExpired').get(function() {
  if (!this.expiryDate) return false;
  return new Date() > this.expiryDate;
});

// Method to check if notification is relevant for a farmer
notificationSchema.methods.isRelevantForFarmer = function(farmer) {
  // Check if expired
  if (this.isExpired) return false;
  if (!this.isActive) return false;

  // Check audience targeting
  switch (this.targetAudience) {
    case 'all':
      return true;
    
    case 'approved':
      return farmer.status === 'approved';
    
    case 'pending':
      return farmer.status === 'pending';
    
    case 'location':
      if (!this.targetLocations || this.targetLocations.length === 0) return true;
      return this.targetLocations.some(loc => 
        farmer.location && farmer.location.toLowerCase().includes(loc.toLowerCase())
      );
    
    case 'crop':
      if (!this.targetCrops || this.targetCrops.length === 0) return true;
      return this.targetCrops.some(crop => 
        farmer.cropType && farmer.cropType.toLowerCase().includes(crop.toLowerCase())
      );
    
    default:
      return false;
  }
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
