const express      = require('express');
const router       = express.Router();
const Review       = require('../models/Review');
const Property     = require('../models/Property');
const Notification = require('../models/Notification');
const { protect }  = require('../middleware/auth');

router.get('/:propertyId', async (req, res) => {
  try {
    const reviews = await Review.find({ property: req.params.propertyId })
      .populate('user','name avatar').sort({ createdAt:-1 });
    res.json({ success:true, reviews });
  } catch (err) { res.status(500).json({ success:false, message:err.message }); }
});

router.post('/:propertyId', protect, async (req, res) => {
  try {
    const { rating, comment, aspects } = req.body;
    const property = await Property.findById(req.params.propertyId);
    if (!property) return res.status(404).json({ success:false, message:'Property not found' });

    const review = await Review.create({ user: req.user.id, property: req.params.propertyId, rating, comment, aspects });

    const all    = await Review.find({ property: req.params.propertyId });
    const avg    = all.reduce((s,r) => s + r.rating, 0) / all.length;
    await Property.findByIdAndUpdate(req.params.propertyId, { rating: Math.round(avg*10)/10, reviewCount: all.length });

    // Notify property owner
    const io = req.app.get('io');
    await Notification.createAndEmit(io, {
      recipient: property.owner,
      type:      'new_review',
      title:     `⭐ New ${rating}-Star Review`,
      message:   `${req.user.name} left a ${rating}★ review on "${property.title}": "${comment.slice(0,60)}${comment.length>60?'...':''}"`,
      link:      `/property/${req.params.propertyId}`,
      meta:      { propertyId: req.params.propertyId },
    });

    await review.populate('user','name avatar');
    res.status(201).json({ success:true, review });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success:false, message:'Already reviewed this property' });
    res.status(400).json({ success:false, message:err.message });
  }
});

module.exports = router;
