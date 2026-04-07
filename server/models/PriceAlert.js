const mongoose = require('mongoose');

const priceAlertSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  property:   { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
  city:       { type: String, default: null },
  type:       { type: String, enum: ['price_drop','new_room','any_alert'], default: 'any_alert' },
  maxBudget:  { type: Number, default: null },      // for new room alerts
  targetPrice:{ type: Number, default: null },      // for price-drop: alert if drops below this
  roomType:   { type: String, default: null },
  active:     { type: Boolean, default: true },
  lastTriggered: { type: Date, default: null },
}, { timestamps: true });

priceAlertSchema.index({ user:1, property:1 }, { unique: false });

module.exports = mongoose.model('PriceAlert', priceAlertSchema);
