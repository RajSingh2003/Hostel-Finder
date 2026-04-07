const express      = require('express');
const router       = express.Router();
const Booking      = require('../models/Booking');
const Property     = require('../models/Property');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');
const { sendBookingConfirmation, sendBookingStatusEmail, sendNewBookingOwnerEmail } = require('../utils/email');

// POST /api/bookings
router.post('/', protect, async (req, res) => {
  try {
    const { propertyId, startDate, duration, notes } = req.body;
    const property = await Property.findById(propertyId).populate('owner','name email _id');
    if (!property) return res.status(404).json({ success:false, message:'Property not found' });
    if (!property.isAvailable) return res.status(400).json({ success:false, message:'Not available' });

    const end = new Date(startDate);
    end.setMonth(end.getMonth() + parseInt(duration));

    const booking = await Booking.create({
      user: req.user.id, property: propertyId,
      startDate, endDate: end, duration,
      totalAmount: property.price * duration,
      securityDeposit: property.securityDeposit, notes,
    });

    const io      = req.app.get('io');
    const dateStr = new Date(startDate).toLocaleDateString('en-IN');

    // Notify OWNER
    await Notification.createAndEmit(io, {
      recipient: property.owner._id,
      type:      'booking_request',
      title:     '🔔 New Booking Request',
      message:   `${req.user.name} wants to book "${property.title}" from ${dateStr} for ${duration} month(s).`,
      link:      '/dashboard',
      meta:      { bookingId: booking._id, propertyId },
    });

    // Notify TENANT (confirmation)
    await Notification.createAndEmit(io, {
      recipient: req.user.id,
      type:      'booking_request',
      title:     '📋 Booking Request Sent',
      message:   `Your request for "${property.title}" has been sent. The owner will respond soon.`,
      link:      '/dashboard',
      meta:      { bookingId: booking._id, propertyId },
    });

    // Emails (non-blocking)
    sendBookingConfirmation({ to: req.user.email, tenantName: req.user.name, propertyTitle: property.title, city: property.location?.city, startDate: dateStr, duration, amount: property.securityDeposit + 500 }).catch(()=>{});
    sendNewBookingOwnerEmail({ to: property.owner.email, ownerName: property.owner.name, tenantName: req.user.name, propertyTitle: property.title, startDate: dateStr, duration }).catch(()=>{});

    await booking.populate(['user','property']);
    res.status(201).json({ success:true, booking });
  } catch (err) { res.status(400).json({ success:false, message:err.message }); }
});

// GET /api/bookings/my
router.get('/my', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('property','title location price images aiPredictedPrice securityDeposit')
      .sort({ createdAt: -1 });
    res.json({ success:true, bookings });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// GET /api/bookings/owner
router.get('/owner', protect, authorize('owner','admin'), async (req, res) => {
  try {
    const props    = await Property.find({ owner: req.user.id }).select('_id');
    const bookings = await Booking.find({ property: { $in: props.map(p=>p._id) } })
      .populate('user','name email phone')
      .populate('property','title location price')
      .sort({ createdAt: -1 });
    res.json({ success:true, bookings });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// PUT /api/bookings/:id/status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate('property','title owner _id')
      .populate('user','name email _id');
    if (!booking) return res.status(404).json({ success:false, message:'Not found' });

    const isOwner  = booking.property.owner.toString() === req.user.id;
    const isTenant = booking.user._id.toString() === req.user.id;
    if (['approved','rejected'].includes(status) && !isOwner)
      return res.status(403).json({ success:false, message:'Only owner can approve/reject' });
    if (status === 'cancelled' && !isTenant && !isOwner)
      return res.status(403).json({ success:false, message:'Not authorized' });

    booking.status = status;
    await booking.save();

    const io = req.app.get('io');

    if (status === 'approved') {
      await Notification.createAndEmit(io, {
        recipient: booking.user._id,
        type:      'booking_approved',
        title:     '✅ Booking Approved!',
        message:   `Great news! Your booking for "${booking.property.title}" has been approved. Complete payment to confirm.`,
        link:      `/payment/${booking._id}`,
        meta:      { bookingId: booking._id, propertyId: booking.property._id },
      });
    } else if (status === 'rejected') {
      await Notification.createAndEmit(io, {
        recipient: booking.user._id,
        type:      'booking_rejected',
        title:     '❌ Booking Rejected',
        message:   `Your booking request for "${booking.property.title}" was not accepted. Browse other rooms.`,
        link:      '/search',
        meta:      { bookingId: booking._id },
      });
    } else if (status === 'cancelled') {
      await Notification.createAndEmit(io, {
        recipient: booking.property.owner,
        type:      'booking_cancelled',
        title:     '🚫 Booking Cancelled',
        message:   `${booking.user.name} cancelled their booking for "${booking.property.title}".`,
        link:      '/dashboard',
        meta:      { bookingId: booking._id },
      });
    }

    // Emails
    if (['approved','rejected'].includes(status)) {
      sendBookingStatusEmail({ to: booking.user.email, tenantName: booking.user.name, propertyTitle: booking.property.title, status }).catch(()=>{});
    }

    res.json({ success:true, booking });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

// GET /api/bookings/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user','name email phone')
      .populate('property');
    if (!booking) return res.status(404).json({ success:false, message:'Not found' });
    res.json({ success:true, booking });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

module.exports = router;
