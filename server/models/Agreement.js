const mongoose = require('mongoose');

const agreementSchema = new mongoose.Schema({
  booking:     { type: mongoose.Schema.Types.ObjectId, ref: 'Booking',  required: true },
  property:    { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  tenant:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  payment:     { type: mongoose.Schema.Types.ObjectId, ref: 'Payment',  default: null },
  agreementId: { type: String, unique: true, required: true },
  pdfUrl:      { type: String, default: null },   // Cloudinary URL or local path
  status:      { type: String, enum: ['generated','sent','signed'], default: 'generated' },
}, { timestamps: true });

module.exports = mongoose.model('Agreement', agreementSchema);
