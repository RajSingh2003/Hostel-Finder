const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'booking_request',    // owner gets this when tenant books
      'booking_approved',   // tenant gets this when owner approves
      'booking_rejected',   // tenant gets this when owner rejects
      'booking_cancelled',  // owner gets this when tenant cancels
      'payment_received',   // owner gets this after payment
      'payment_success',    // tenant gets this after payment confirmed
      'new_message',        // user gets this on new chat message
      'new_review',         // owner gets this when property reviewed
      'price_alert',        // tenant gets this if saved property price changes
      'welcome',            // tenant/owner gets this on registration
      'property_approved',  // owner gets this when admin approves listing
      'property_rejected',  // owner gets this when admin rejects listing
    ],
    required: true
  },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  link:    { type: String, default: '/dashboard' },  // frontend route to navigate
  read:    { type: Boolean, default: false, index: true },
  meta: {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
    bookingId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Booking',  default: null },
    senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',     default: null },
  }
}, { timestamps: true });

// Static helper to create & emit via socket
notificationSchema.statics.createAndEmit = async function(io, { recipient, type, title, message, link, meta }) {
  const notif = await this.create({ recipient, type, title, message, link: link || '/dashboard', meta: meta || {} });
  if (io) {
    io.to(`user_${recipient}`).emit('new_notification', notif);
  }
  return notif;
};

module.exports = mongoose.model('Notification', notificationSchema);
