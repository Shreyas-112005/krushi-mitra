const mongoose = require('mongoose');

const marketPriceSchema = new mongoose.Schema({
  vegetableName: {
    type: String,
    required: true,
    trim: true
  },
  commodity: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    default: 'kg',
    enum: ['kg', 'quintal', 'ton', 'piece', 'dozen', 'liter']
  },
  market: {
    type: String,
    required: true,
    trim: true
  },
  state: {
    type: String,
    default: 'Karnataka',
    trim: true
  },
  district: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['vegetable', 'fruit', 'grain', 'spice', 'other'],
    default: 'vegetable'
  },
  variety: {
    type: String,
    trim: true
  },
  minPrice: {
    type: Number,
    min: 0
  },
  maxPrice: {
    type: Number,
    min: 0
  },
  modalPrice: {
    type: Number,
    min: 0
  },
  arrival: {
    type: Number,
    min: 0
  },
  priceDate: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    default: 'AGMARKNET'
  },
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

// Indexes for faster queries
marketPriceSchema.index({ vegetableName: 1, market: 1, priceDate: -1 });
marketPriceSchema.index({ category: 1, isActive: 1 });
marketPriceSchema.index({ updatedAt: -1 });

// Virtual for display name
marketPriceSchema.virtual('displayName').get(function() {
  return this.commodity || this.vegetableName;
});

const MarketPrice = mongoose.model('MarketPrice', marketPriceSchema);

module.exports = MarketPrice;