const express          = require('express');
const router           = express.Router();
const RoommateProfile  = require('../models/RoommateProfile');
const { protect }      = require('../middleware/auth');

// ── Matching algorithm ────────────────────────────────────────────────────────
// Returns a score 0–100 representing compatibility between two profiles
function compatibilityScore(a, b) {
  let score = 0;
  const MAX = 100;

  // Budget overlap (25 pts)
  const overlapMin = Math.max(a.minBudget, b.minBudget);
  const overlapMax = Math.min(a.maxBudget, b.maxBudget);
  if (overlapMax >= overlapMin) score += 25;
  else {
    const gap = overlapMin - overlapMax;
    const penalty = Math.min(25, Math.round((gap / 2000) * 25));
    score += Math.max(0, 25 - penalty);
  }

  // City (20 pts)
  if (a.city?.toLowerCase() === b.city?.toLowerCase()) score += 20;

  // Lifestyle — cleanliness within 1 level (10 pts)
  if (Math.abs((a.cleanliness || 3) - (b.cleanliness || 3)) <= 1) score += 10;

  // Wake time (8 pts)
  if (a.wakeTime === b.wakeTime) score += 8;
  else if (a.wakeTime === 'Flexible' || b.wakeTime === 'Flexible') score += 4;

  // Sleep time (8 pts)
  if (a.sleepTime === b.sleepTime) score += 8;
  else if (a.sleepTime === 'Flexible' || b.sleepTime === 'Flexible') score += 4;

  // Noise (7 pts)
  if (a.noiseLevel === b.noiseLevel) score += 7;

  // Guest policy (5 pts)
  if (a.guestPolicy === b.guestPolicy) score += 5;

  // Smoking / drinking (matching deal-breakers) (7 pts each)
  if (a.smoking === b.smoking) score += 7;
  if (a.drinking === b.drinking) score += 7;

  // Gender preference (bonus — not penalised)
  if (a.preferSameGender && b.gender && a.gender === b.gender) score += 3;

  return Math.min(MAX, Math.round(score));
}

// POST /api/roommate/profile — create or update profile
router.post('/profile', protect, async (req, res) => {
  try {
    const profile = await RoommateProfile.findOneAndUpdate(
      { user: req.user.id },
      { ...req.body, user: req.user.id },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, profile });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// GET /api/roommate/profile/me
router.get('/profile/me', protect, async (req, res) => {
  try {
    const profile = await RoommateProfile.findOne({ user: req.user.id });
    res.json({ success: true, profile });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/roommate/matches — get top matches for current user
router.get('/matches', protect, async (req, res) => {
  try {
    const myProfile = await RoommateProfile.findOne({ user: req.user.id });
    if (!myProfile) return res.status(400).json({ success: false, message: 'Create your roommate profile first.' });

    // Fetch active profiles excluding current user
    const others = await RoommateProfile.find({
      user:   { $ne: req.user.id },
      active: true,
      city:   new RegExp(myProfile.city, 'i'),
    }).populate('user', 'name phone createdAt');

    // Score and sort
    const scored = others
      .map(p => ({ profile: p, score: compatibilityScore(myProfile, p) }))
      .filter(x => x.score >= 30)  // minimum 30% compatibility
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    res.json({ success: true, matches: scored });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/roommate/profile/:userId — view another user's profile
router.get('/profile/:userId', protect, async (req, res) => {
  try {
    const profile = await RoommateProfile.findOne({ user: req.params.userId, active: true })
      .populate('user', 'name createdAt');
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, profile });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/roommate/profile — deactivate my profile
router.delete('/profile', protect, async (req, res) => {
  try {
    await RoommateProfile.findOneAndUpdate({ user: req.user.id }, { active: false });
    res.json({ success: true, message: 'Profile deactivated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/roommate/connect/:targetUserId
// Called when user clicks "Send Message" on a match — fires notification + email
router.post('/connect/:targetUserId', protect, async (req, res) => {
  try {
    const User     = require('../models/User');
    const Notification = require('../models/Notification');
    const { sendRoommateMatchEmail } = require('../utils/email');

    const [myProfile, theirProfile] = await Promise.all([
      RoommateProfile.findOne({ user: req.user.id }),
      RoommateProfile.findOne({ user: req.params.targetUserId, active: true }),
    ]);

    if (!myProfile)    return res.status(400).json({ success: false, message: 'Create your roommate profile first.' });
    if (!theirProfile) return res.status(404).json({ success: false, message: 'Roommate profile not found.' });

    const score = compatibilityScore(myProfile, theirProfile);

    const [me, them] = await Promise.all([
      User.findById(req.user.id).select('name email'),
      User.findById(req.params.targetUserId).select('name email'),
    ]);

    const io = req.app.get('io');

    // In-app notification to them
    await Notification.createAndEmit(io, {
      recipient: req.params.targetUserId,
      type:      'new_message',
      title:     '🧑‍🤝‍🧑 Roommate Connection Request!',
      message:   `${me.name} (${score}% match) wants to connect as a roommate in ${myProfile.city}. Tap to chat!`,
      link:      `/chat/${req.user.id}`,
      meta:      { senderId: req.user.id },
    });

    // Email notification to them
    const chatLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/chat/${req.user.id}`;
    sendRoommateMatchEmail({
      to:           them.email,
      senderName:   me.name,
      receiverName: them.name,
      score,
      city:         myProfile.city,
      chatLink,
    }).catch(() => {});

    res.json({ success: true, score, message: `Connection request sent to ${them.name}!` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
