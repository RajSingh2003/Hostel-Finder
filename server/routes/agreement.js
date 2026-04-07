const express   = require('express');
const router    = express.Router();
const Agreement = require('../models/Agreement');
const Booking   = require('../models/Booking');
const Payment   = require('../models/Payment');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { generateAgreementPDF } = require('../utils/generateAgreement');
const { sendAgreementEmail }   = require('../utils/email');

// POST /api/agreement/generate/:bookingId
// Called automatically after payment, or manually
router.post('/generate/:bookingId', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('property')
      .populate('user', 'name email phone')
      .populate({ path: 'property', populate: { path: 'owner', select: 'name email phone' } });

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Only tenant or owner can generate
    const isTenant = booking.user._id.toString() === req.user.id;
    const isOwner  = booking.property.owner._id.toString() === req.user.id;
    if (!isTenant && !isOwner)
      return res.status(403).json({ success: false, message: 'Not authorized' });

    if (booking.paymentStatus !== 'paid')
      return res.status(400).json({ success: false, message: 'Agreement can only be generated after payment is confirmed.' });

    // Check if already generated
    const existing = await Agreement.findOne({ booking: booking._id });
    if (existing) {
      return res.json({ success: true, agreementId: existing.agreementId, message: 'Agreement already exists' });
    }

    // Get payment record
    const payment = await Payment.findOne({ booking: booking._id, status: 'paid' });

    // Generate PDF
    const { buffer, agreementId } = await generateAgreementPDF({
      booking,
      property: booking.property,
      tenant:   booking.user,
      owner:    booking.property.owner,
      payment,
    });

    // Save agreement record
    const agreement = await Agreement.create({
      booking:     booking._id,
      property:    booking.property._id,
      tenant:      booking.user._id,
      owner:       booking.property.owner._id,
      payment:     payment?._id || null,
      agreementId,
    });

    // Notify both parties
    const io = req.app.get('io');
    await Promise.all([
      Notification.createAndEmit(io, {
        recipient: booking.user._id,
        type:      'booking_approved',
        title:     '📄 Rental Agreement Ready',
        message:   `Your rental agreement for "${booking.property.title}" is ready. Download it from your dashboard.`,
        link:      '/dashboard',
        meta:      { bookingId: booking._id },
      }),
      Notification.createAndEmit(io, {
        recipient: booking.property.owner._id,
        type:      'payment_received',
        title:     '📄 Agreement Generated',
        message:   `Rental agreement for "${booking.property.title}" with ${booking.user.name} has been generated.`,
        link:      '/dashboard',
        meta:      { bookingId: booking._id },
      }),
    ]);

    // Send PDF via email
    sendAgreementEmail({
      to:            booking.user.email,
      tenantName:    booking.user.name,
      propertyTitle: booking.property.title,
      agreementId,
      pdfBuffer:     buffer,
    }).catch(() => {});

    // Stream PDF back
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="StayFinder_Agreement_${agreementId}.pdf"`,
      'Content-Length':      buffer.length,
    });
    res.send(buffer);
  } catch (err) {
    console.error('Agreement error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/agreement/booking/:bookingId  — check if agreement exists
router.get('/booking/:bookingId', protect, async (req, res) => {
  try {
    const agreement = await Agreement.findOne({ booking: req.params.bookingId });
    res.json({ success: true, exists: !!agreement, agreement });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/agreement/list — my agreements
router.get('/list', protect, async (req, res) => {
  try {
    const agreements = await Agreement.find({
      $or: [{ tenant: req.user.id }, { owner: req.user.id }]
    })
    .populate('booking', 'startDate duration totalAmount')
    .populate('property', 'title location price')
    .sort({ createdAt: -1 });
    res.json({ success: true, agreements });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/agreement/download/:agreementId — re-download
router.get('/download/:agreementId', protect, async (req, res) => {
  try {
    const agreement = await Agreement.findOne({ agreementId: req.params.agreementId })
      .populate('booking')
      .populate('property')
      .populate('tenant', 'name email phone')
      .populate('owner',  'name email phone')
      .populate('payment');

    if (!agreement) return res.status(404).json({ success: false, message: 'Agreement not found' });

    const isTenant = agreement.tenant._id.toString() === req.user.id;
    const isOwner  = agreement.owner._id.toString()  === req.user.id;
    if (!isTenant && !isOwner)
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const payment = await require('../models/Payment').findOne({ booking: agreement.booking._id, status: 'paid' });

    const { buffer } = await generateAgreementPDF({
      booking:  agreement.booking,
      property: agreement.property,
      tenant:   agreement.tenant,
      owner:    agreement.owner,
      payment,
    });

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="StayFinder_Agreement_${agreement.agreementId}.pdf"`,
      'Content-Length':      buffer.length,
    });
    res.send(buffer);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
