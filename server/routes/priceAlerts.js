const express     = require('express');
const router      = express.Router();
const PriceAlert  = require('../models/PriceAlert');
const Property    = require('../models/Property');
const Notification= require('../models/Notification');
const { protect } = require('../middleware/auth');

// POST /api/price-alerts — create a new alert
router.post('/', protect, async (req, res) => {
  try {
    const { propertyId, city, type, maxBudget, targetPrice, roomType } = req.body;
    const alert = await PriceAlert.create({
      user:        req.user.id,
      property:    propertyId || null,
      city:        city || null,
      type:        type || 'any_alert',
      maxBudget:   maxBudget   ? Number(maxBudget)   : null,
      targetPrice: targetPrice ? Number(targetPrice) : null,
      roomType:    roomType    || null,
    });
    res.status(201).json({ success: true, alert });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// GET /api/price-alerts — get my alerts
router.get('/', protect, async (req, res) => {
  try {
    const alerts = await PriceAlert.find({ user: req.user.id })
      .populate('property', 'title price location')
      .sort({ createdAt: -1 });
    res.json({ success: true, alerts });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/price-alerts/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await PriceAlert.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/price-alerts/:id/toggle
router.put('/:id/toggle', protect, async (req, res) => {
  try {
    const alert = await PriceAlert.findOne({ _id: req.params.id, user: req.user.id });
    if (!alert) return res.status(404).json({ success: false, message: 'Not found' });
    alert.active = !alert.active;
    await alert.save();
    res.json({ success: true, alert });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Internal: called when a property price changes (from properties route)
// or when a new property is added
async function checkAndFireAlerts(io, eventType, property) {
  try {
    const query = { active: true };
    if (eventType === 'price_drop')  query.type = { $in: ['price_drop', 'any_alert'] };
    if (eventType === 'new_room')    query.type = { $in: ['new_room',   'any_alert'] };

    const alerts = await PriceAlert.find(query).populate('user', '_id name');

    for (const alert of alerts) {
      let shouldFire = false;
      let title      = '';
      let message    = '';
      let link       = `/property/${property._id}`;

      if (eventType === 'price_drop') {
        // Match city and price threshold
        const cityMatch  = !alert.city     || alert.city.toLowerCase() === property.location?.city?.toLowerCase();
        const typeMatch  = !alert.roomType || alert.roomType === property.type;
        const priceMatch = !alert.targetPrice || property.price <= alert.targetPrice;
        const propMatch  = !alert.property  || alert.property.toString() === property._id.toString();

        if ((propMatch || cityMatch) && typeMatch && priceMatch) {
          shouldFire = true;
          title      = '📉 Price Drop Alert!';
          message    = `"${property.title}" in ${property.location?.city} dropped to ₹${property.price?.toLocaleString()}/month. Check it out!`;
        }
      }

      if (eventType === 'new_room') {
        const cityMatch   = !alert.city      || alert.city.toLowerCase() === property.location?.city?.toLowerCase();
        const budgetMatch = !alert.maxBudget || property.price <= alert.maxBudget;
        const typeMatch   = !alert.roomType  || alert.roomType === property.type;

        if (cityMatch && budgetMatch && typeMatch) {
          shouldFire = true;
          title      = '🏠 New Room Available!';
          message    = `New ${property.type} in ${property.location?.city} — "${property.title}" at ₹${property.price?.toLocaleString()}/mo matches your alert.`;
        }
      }

      if (shouldFire) {
        // Throttle: don't fire same alert more than once per 12 hours
        const last = alert.lastTriggered;
        if (last && (Date.now() - new Date(last).getTime()) < 12 * 3600 * 1000) continue;

        await Notification.createAndEmit(io, {
          recipient: alert.user._id,
          type:      'price_alert',
          title,
          message,
          link,
          meta: { propertyId: property._id },
        });

        alert.lastTriggered = new Date();
        await alert.save();
      }
    }
  } catch (e) {
    console.warn('Alert check error:', e.message);
  }
}

module.exports = router;
module.exports.checkAndFireAlerts = checkAndFireAlerts;
