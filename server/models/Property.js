const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: 5,
    maxlength: 100
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['PG', 'Hostel', 'Studio', '1BHK', '2BHK', 'Shared Room'],
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Any'],
    default: 'Any'
  },
  location: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    pincode: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    }
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 500
  },
  aiPredictedPrice: {
    type: Number,
    default: null
  },
  priceStatus: {
    type: String,
    enum: ['fair', 'overpriced', 'deal'],
    default: 'fair'
  },
  size: {
    type: Number,  // in sq ft
    required: true
  },
  floor: {
    type: String,
    enum: ['Ground', '1st', '2nd', '3rd', '4th+'],
    default: 'Ground'
  },
  totalRooms: {
    type: Number,
    default: 1
  },
  availableRooms: {
    type: Number,
    default: 1
  },
  amenities: [{
    type: String,
    enum: ['WiFi', 'AC', 'Attached Bath', 'Meals Included', 'Gym', 'Laundry',
           'Parking', 'CCTV', 'Lift', 'Hot Water', 'Furnished', 'Power Backup']
  }],
  images: [{ type: String }],
  securityDeposit: {
    type: Number,
    default: 0
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Index for search
propertySchema.index({ 'location.city': 1, price: 1, type: 1 });
propertySchema.index({ title: 'text', 'location.address': 'text' });

module.exports = mongoose.model('Property', propertySchema);
