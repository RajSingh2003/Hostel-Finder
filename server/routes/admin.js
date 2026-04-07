const express  = require('express');
const router   = express.Router();
const User     = require('../models/User');
const Property = require('../models/Property');
const Booking  = require('../models/Booking');
const Review   = require('../models/Review');
const Payment  = require('../models/Payment');
const { protect, authorize } = require('../middleware/auth');

// All admin routes require admin role
router.use(protect, authorize('admin'));

// GET /api/admin/stats  — platform overview
router.get('/stats', async (req, res) => {
  try {
    const [users, properties, bookings, payments, pendingProps] = await Promise.all([
      User.countDocuments(),
      Property.countDocuments({ isApproved: true }),
      Booking.countDocuments(),
      Payment.find({ status: 'paid' }),
      Property.countDocuments({ isApproved: false }),
    ]);

    const revenue  = payments.reduce((s, p) => s + p.amount / 100, 0);
    const tenants  = await User.countDocuments({ role: 'tenant' });
    const owners   = await User.countDocuments({ role: 'owner' });

    // Monthly bookings (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlyBookings = await Booking.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { '_id': 1 } },
    ]);

    res.json({
      success: true,
      stats: { users, tenants, owners, properties, pendingProps, bookings, revenue: Math.round(revenue) },
      monthlyBookings,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    const query = {};
    if (role)   query.role = role;
    if (search) query.$or = [{ name: new RegExp(search,'i') }, { email: new RegExp(search,'i') }];
    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)),
      User.countDocuments(query),
    ]);
    res.json({ success: true, users, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select('-password');
    res.json({ success: true, user });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/admin/properties
router.get('/properties', async (req, res) => {
  try {
    const { approved, page = 1, limit = 20 } = req.query;
    const query = {};
    if (approved !== undefined) query.isApproved = approved === 'true';
    const [properties, total] = await Promise.all([
      Property.find(query).populate('owner','name email').sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)),
      Property.countDocuments(query),
    ]);
    res.json({ success: true, properties, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/admin/properties/:id/approve
router.put('/properties/:id/approve', async (req, res) => {
  try {
    const Notification = require('../models/Notification');
    const approved = req.body.approved !== false;
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { isApproved: approved },
      { new: true }
    );
    const io = req.app.get('io');
    await Notification.createAndEmit(io, {
      recipient: property.owner,
      type:      approved ? 'property_approved' : 'property_rejected',
      title:     approved ? '✅ Property Approved!' : '❌ Property Rejected',
      message:   approved
        ? `Your listing "${property.title}" is now live and visible to tenants.`
        : `Your listing "${property.title}" was not approved. Please review and resubmit.`,
      link:      '/dashboard',
      meta:      { propertyId: property._id },
    });
    res.json({ success: true, property });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// DELETE /api/admin/properties/:id
router.delete('/properties/:id', async (req, res) => {
  try {
    await Property.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Property deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/admin/bookings
router.get('/bookings', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};
    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('user','name email')
        .populate('property','title location price')
        .sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit)),
      Booking.countDocuments(query),
    ]);
    res.json({ success: true, bookings, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/admin/reviews
router.get('/reviews', async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user','name')
      .populate('property','title')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, reviews });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/admin/reviews/:id
router.delete('/reviews/:id', async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
