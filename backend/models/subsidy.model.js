const mongoose = require('mongoose');

const subsidySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Subsidy title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Subsidy amount is required'],
    min: [0, 'Amount must be positive']
  },
  eligibility: {
    type: String,
    required: [true, 'Eligibility criteria is required'],
    trim: true,
    maxlength: [1000, 'Eligibility cannot exceed 1000 characters']
  },
  category: {
    type: String,
    enum: ['fertilizer', 'seeds', 'equipment', 'irrigation', 'loan', 'insurance', 'training', 'other'],
    default: 'other'
  },
  state: {
    type: String,
    default: 'Karnataka',
    trim: true
  },
  deadline: {
    type: Date,
    required: [true, 'Application deadline is required']
  },
  applicationLink: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, 'Please enter a valid URL']
  },
  contactInfo: {
    type: String,
    trim: true,
    maxlength: [500, 'Contact info cannot exceed 500 characters']
  },
  documents: [{
    name: String,
    required: Boolean
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
subsidySchema.index({ category: 1, isActive: 1 });
subsidySchema.index({ deadline: 1 });
subsidySchema.index({ createdAt: -1 });
subsidySchema.index({ state: 1, isActive: 1 });

// Virtual for checking if deadline has passed
subsidySchema.virtual('isExpired').get(function() {
  return this.deadline < new Date();
});

// Virtual for days remaining
subsidySchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const deadline = new Date(this.deadline);
  const diff = deadline - now;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
});

// Method to check if subsidy is still valid
subsidySchema.methods.isValid = function() {
  return this.isActive && this.deadline > new Date();
};

// Static method to get active subsidies
subsidySchema.statics.getActive = function() {
  return this.find({ 
    isActive: true,
    deadline: { $gte: new Date() }
  }).sort({ deadline: 1 });
};

// Static method to get expiring soon
subsidySchema.statics.getExpiringSoon = function(days = 30) {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);
  
  return this.find({
    isActive: true,
    deadline: {
      $gte: today,
      $lte: futureDate
    }
  }).sort({ deadline: 1 });
};

// Ensure virtuals are included in JSON
subsidySchema.set('toJSON', { virtuals: true });
subsidySchema.set('toObject', { virtuals: true });

const Subsidy = mongoose.model('Subsidy', subsidySchema);

module.exports = Subsidy;
