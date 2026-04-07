const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');

// City base prices (fallback when AI model is offline)
const CITY_BASE = {
  Mumbai: 12000, Delhi: 9000, Pune: 8000, Bengaluru: 10000,
  Hyderabad: 9500, Chennai: 8500, Kolkata: 7000, Nashik: 6000,
  Nagpur: 5500, Ahmedabad: 7000
};
const TYPE_MULTI = {
  'PG': 0.65, 'Hostel': 0.6, 'Studio': 1.3, '1BHK': 1.5,
  '2BHK': 2.2, 'Shared Room': 0.55
};
const FLOOR_BONUS = { Ground: 0, '1st': 200, '2nd': 350, '3rd': 500, '4th+': 600 };
const AMENITY_BONUS = {
  WiFi: 300, AC: 800, 'Attached Bath': 500, 'Meals Included': 1200,
  Gym: 400, Laundry: 200, Parking: 300, CCTV: 150, Lift: 200,
  'Hot Water': 150, Furnished: 1000, 'Power Backup': 250
};

// Fallback local prediction
function localPredict(data) {
  const { city, type, size, floor, amenities = [] } = data;
  const base = (CITY_BASE[city] || 8000) * (TYPE_MULTI[type] || 0.8);
  const sizePremium = size * 8;
  const floorPremium = FLOOR_BONUS[floor] || 0;
  const amenityPremium = amenities.reduce((sum, a) => sum + (AMENITY_BONUS[a] || 0), 0);
  const predicted = Math.round((base + sizePremium + floorPremium + amenityPremium) / 100) * 100;
  return {
    predicted,
    range: { low: Math.round(predicted * 0.88 / 100) * 100, high: Math.round(predicted * 1.15 / 100) * 100 },
    breakdown: { base: Math.round(base), sizePremium, floorPremium, amenityPremium },
    source: 'local-model'
  };
}

// @route  POST /api/ai/predict-price
router.post('/predict-price', async (req, res) => {
  try {
    const { city, type, size, floor, amenities } = req.body;
    if (!city || !type || !size) {
      return res.status(400).json({ success: false, message: 'city, type, and size are required' });
    }

    try {
      // Try FastAPI model first
      const aiRes = await axios.post(`${process.env.AI_MODEL_URL}/predict`, req.body, { timeout: 3000 });
      return res.json({ success: true, data: aiRes.data });
    } catch {
      // Fallback to local regression
      const result = localPredict({ city, type, size: Number(size), floor, amenities });
      return res.json({ success: true, data: result });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route  POST /api/ai/check-price
router.post('/check-price', async (req, res) => {
  try {
    const { listed, predicted } = req.body;
    const diff = ((listed - predicted) / predicted) * 100;
    let status = 'fair';
    let message = '';

    if (diff > 20) {
      status = 'overpriced';
      message = `Listed price is ${diff.toFixed(1)}% above the AI predicted fair value. Consider negotiating.`;
    } else if (diff < -10) {
      status = 'deal';
      message = `Great deal! Listed price is ${Math.abs(diff).toFixed(1)}% below the AI fair price.`;
    } else {
      message = 'This is a fairly priced listing according to our AI model.';
    }

    res.json({ success: true, data: { status, diff: diff.toFixed(1), message } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route  GET /api/ai/recommendations
router.get('/recommendations', protect, async (req, res) => {
  try {
    const Property = require('../models/Property');
    const { city, maxBudget, type } = req.query;
    const query = { isApproved: true, isAvailable: true };
    if (city) query['location.city'] = new RegExp(city, 'i');
    if (maxBudget) query.price = { $lte: Number(maxBudget) };
    if (type) query.type = type;

    const recs = await Property.find(query)
      .sort({ rating: -1, priceStatus: 1 })
      .limit(6)
      .populate('owner', 'name');

    res.json({ success: true, recommendations: recs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
