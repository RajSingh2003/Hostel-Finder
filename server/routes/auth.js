const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../utils/email');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    const user  = await User.create({ name, email, password, phone, role: role || 'tenant' });
    const token = signToken(user._id);

    // Send welcome email (non-blocking)
    sendWelcomeEmail({ to: email, name, role: user.role }).catch(() => {});

    // Welcome notification
    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        recipient: user._id,
        type:      'welcome',
        title:     '🎉 Welcome to StayFinder!',
        message:   role === 'owner'
          ? 'Your owner account is ready. List your first property and let AI price it for you!'
          : 'Your account is ready. Start browsing verified rooms with AI-powered fair pricing!',
        link:      role === 'owner' ? '/add-property' : '/search',
      });
    } catch(ne) {}

    res.status(201).json({
      success: true, message: 'Registration successful', token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const token = signToken(user._id);
    res.json({ success: true, message: 'Login successful', token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('wishlist','title price location');
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, { name, phone }, { new: true });
    res.json({ success: true, user });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// PUT /api/auth/wishlist/:propertyId
router.put('/wishlist/:propertyId', protect, async (req, res) => {
  try {
    const user  = await User.findById(req.user.id);
    const propId = req.params.propertyId;
    const idx   = user.wishlist.findIndex(w => w.toString() === propId);
    if (idx === -1) user.wishlist.push(propId);
    else            user.wishlist.splice(idx, 1);
    await user.save();
    res.json({ success: true, wishlist: user.wishlist });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/auth/user/:id  — get public profile (used by Chat header)
router.get('/user/:id', async (req, res) => {
  try {
    const user = await require('../models/User').findById(req.params.id).select('name phone role createdAt');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
