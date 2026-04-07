const express  = require('express');
const router   = express.Router();
const Property = require('../models/Property');
const { protect, authorize } = require('../middleware/auth');
const { upload, getImageUrl, deleteImage } = require('../utils/cloudinary');

// GET /api/properties
router.get('/', async (req, res) => {
  try {
    const { city, type, minPrice, maxPrice, gender, amenities, sort, page = 1, limit = 12 } = req.query;
    const query = { isApproved: true, isAvailable: true };

    if (city)     query['location.city'] = new RegExp(city, 'i');
    if (type)     query.type = type;
    if (gender)   query.gender = gender;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (amenities) query.amenities = { $all: amenities.split(',') };

    const sortMap = {
      'price-asc':  { price: 1 },
      'price-desc': { price: -1 },
      'rating':     { rating: -1 },
      'newest':     { createdAt: -1 },
      'ai-fair':    { priceStatus: 1 },
    };
    const skip = (Number(page) - 1) * Number(limit);
    const [properties, total] = await Promise.all([
      Property.find(query).sort(sortMap[sort] || { rating: -1 }).skip(skip).limit(Number(limit)).populate('owner','name phone'),
      Property.countDocuments(query),
    ]);
    res.json({ success: true, properties, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/properties/owner/my-listings  ← MUST be before /:id
router.get('/owner/my-listings', protect, authorize('owner','admin'), async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, properties });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/properties/:id
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate('owner','name email phone');
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    res.json({ success: true, property });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/properties
router.post('/', protect, authorize('owner','admin'), upload.array('images', 8), async (req, res) => {
  try {
    const body   = { ...req.body };
    const images = req.files ? req.files.map(getImageUrl) : [];

    // Parse JSON fields sent as strings in FormData
    if (typeof body.amenities === 'string') {
      try { body.amenities = JSON.parse(body.amenities); } catch { body.amenities = []; }
    }
    if (typeof body.location === 'string') {
      try { body.location = JSON.parse(body.location); } catch {}
    }

    const property = await Property.create({ ...body, owner: req.user.id, images });

    // Auto AI price check
    try {
      const axios = require('axios');
      const { data } = await axios.post(`${process.env.AI_MODEL_URL}/predict`, {
        city: property.location?.city, type: property.type,
        size: property.size, floor: property.floor, amenities: property.amenities,
      }, { timeout: 3000 });
      const predicted = data.predicted;
      const diff = ((property.price - predicted) / predicted) * 100;
      property.aiPredictedPrice = predicted;
      property.priceStatus = diff > 20 ? 'overpriced' : diff < -10 ? 'deal' : 'fair';
      await property.save();
    } catch {}

    // Fire new-room alerts
    try {
      const { checkAndFireAlerts } = require('./priceAlerts');
      const io = req.app.get('io');
      checkAndFireAlerts(io, 'new_room', property).catch(() => {});
    } catch {}

    res.status(201).json({ success: true, property });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// PUT /api/properties/:id
router.put('/:id', protect, authorize('owner','admin'), async (req, res) => {
  try {
    const property = await Property.findOne({ _id: req.params.id, owner: req.user.id });
    if (!property) return res.status(404).json({ success: false, message: 'Not found or unauthorized' });
    const updated = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    // If price dropped, fire alerts
    if (req.body.price && Number(req.body.price) < property.price) {
      try {
        const { checkAndFireAlerts } = require('./priceAlerts');
        const io = req.app.get('io');
        checkAndFireAlerts(io, 'price_drop', updated).catch(() => {});
      } catch {}
    }

    res.json({ success: true, property: updated });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// DELETE /api/properties/:id
router.delete('/:id', protect, authorize('owner','admin'), async (req, res) => {
  try {
    const property = await Property.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!property) return res.status(404).json({ success: false, message: 'Not found or unauthorized' });
    // Delete images from Cloudinary
    for (const img of property.images || []) { await deleteImage(img); }
    res.json({ success: true, message: 'Property deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
