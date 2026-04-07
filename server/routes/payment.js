const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const Razorpay = require('razorpay');
const Payment  = require('../models/Payment');
const Booking  = require('../models/Booking');
const { protect } = require('../middleware/auth');
const { sendPaymentSuccessEmail } = require('../utils/email');

// Initialize Razorpay (graceful if keys missing)
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'rzp_test_your_key_id') {
  razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('✅ Razorpay initialized');
} else {
  console.warn('⚠️  Razorpay not configured — using mock mode');
}

// POST /api/payment/create-order
router.post('/create-order', protect, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId).populate('property','title securityDeposit');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.user.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not authorized' });

    const amountINR  = (booking.securityDeposit || 0) + 500;   // deposit + service fee
    const amountPaise = amountINR * 100;

    let order;

    if (razorpay) {
      order = await razorpay.orders.create({
        amount:   amountPaise,
        currency: 'INR',
        receipt:  `sf_${bookingId}`,
        notes:    { bookingId, propertyTitle: booking.property?.title },
      });
    } else {
      // Mock order for demo/testing when keys not set
      order = {
        id:       `mock_order_${Date.now()}`,
        amount:   amountPaise,
        currency: 'INR',
        status:   'created',
      };
    }

    // Save payment record
    await Payment.create({
      booking:         bookingId,
      user:            req.user.id,
      razorpayOrderId: order.id,
      amount:          amountPaise,
    });

    res.json({
      success:  true,
      order,
      key:      process.env.RAZORPAY_KEY_ID || 'rzp_test_demo',
      amount:   amountINR,
      isMock:   !razorpay,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/payment/verify
router.post('/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    // Mock verify if Razorpay not configured
    if (!razorpay) {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        { razorpayPaymentId: razorpay_payment_id, status: 'paid' }
      );
      await Booking.findByIdAndUpdate(bookingId, { paymentStatus: 'paid' });
      return res.json({ success: true, message: 'Mock payment verified', isMock: true });
    }

    // Real signature verification
    const body      = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected  = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                            .update(body).digest('hex');

    if (expected !== razorpay_signature)
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });

    const payment = await Payment.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature, status: 'paid' },
      { new: true }
    ).populate('user','name email');

    await Booking.findByIdAndUpdate(bookingId, { paymentStatus: 'paid' });

    // Notification
    try {
      const Notification = require('../models/Notification');
      const io = require('../index') || null; // access via app if needed
      const bookingDoc = await Booking.findById(bookingId).populate('property','title owner');
      const io2 = null; // socket emit handled by index.js room
      if (bookingDoc) {
        await Notification.createAndEmit(null, {
          recipient: payment.user._id || payment.user,
          type:      'payment_success',
          title:     '💰 Payment Successful',
          message:   `Payment of Rs.${(payment.amount/100).toLocaleString()} confirmed for "${bookingDoc.property?.title}". You're all set!`,
          link:      '/dashboard',
          meta:      { bookingId, propertyId: bookingDoc.property?._id },
        });
        // Notify owner too
        if (bookingDoc.property?.owner) {
          await Notification.createAndEmit(null, {
            recipient: bookingDoc.property.owner,
            type:      'payment_received',
            title:     '💵 Payment Received',
            message:   `Security deposit received for "${bookingDoc.property?.title}". Booking is now confirmed.`,
            link:      '/dashboard',
            meta:      { bookingId },
          });
        }
      }
    } catch(ne) { console.warn('Notif error:', ne.message); }

    // Send success email
    const booking = await Booking.findById(bookingId).populate('property','title');
    sendPaymentSuccessEmail({
      to:            payment.user.email,
      name:          payment.user.name,
      propertyTitle: booking?.property?.title,
      amount:        payment.amount / 100,
      paymentId:     razorpay_payment_id,
    }).catch(() => {});

    // ── AUTO-GENERATE AGREEMENT AFTER PAYMENT ──────────────────────────
    try {
      const { generateAgreementPDF } = require('../utils/generateAgreement');
      const { sendAgreementEmail }   = require('../utils/email');
      const Agreement = require('../models/Agreement');
      const fullBooking = await Booking.findById(bookingId)
        .populate('property')
        .populate('user', 'name email phone')
        .populate({ path: 'property', populate: { path: 'owner', select: 'name email phone' } });

      if (fullBooking && !await Agreement.findOne({ booking: bookingId })) {
        const pmt = await Payment.findOne({ booking: bookingId, status: 'paid' });
        const { buffer, agreementId } = await generateAgreementPDF({
          booking:  fullBooking,
          property: fullBooking.property,
          tenant:   fullBooking.user,
          owner:    fullBooking.property?.owner,
          payment:  pmt,
        });
        await Agreement.create({
          booking:     bookingId,
          property:    fullBooking.property._id,
          tenant:      fullBooking.user._id,
          owner:       fullBooking.property.owner._id,
          payment:     pmt?._id || null,
          agreementId,
        });
        sendAgreementEmail({
          to:            fullBooking.user.email,
          tenantName:    fullBooking.user.name,
          propertyTitle: fullBooking.property.title,
          agreementId,
          pdfBuffer:     buffer,
        }).catch(() => {});
      }
    } catch (agErr) { console.warn('Auto-agreement error:', agErr.message); }

    res.json({ success: true, message: 'Payment verified successfully' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/payment/history
router.get('/history', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .populate('booking','totalAmount status duration')
      .sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/payment/razorpay-key
router.get('/razorpay-key', (req, res) => {
  res.json({ key: process.env.RAZORPAY_KEY_ID || 'rzp_test_demo', configured: !!razorpay });
});

module.exports = router;
