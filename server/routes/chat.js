const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');
const Message  = require('../models/Message');
const { protect } = require('../middleware/auth');

// Generate consistent room ID for two users
function getRoomId(a, b) {
  return [a.toString(), b.toString()].sort().join('_');
}

// GET /api/chat/history/:otherUserId
router.get('/history/:otherUserId', protect, async (req, res) => {
  try {
    const roomId   = getRoomId(req.user.id, req.params.otherUserId);
    const messages = await Message.find({ room: roomId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 })
      .limit(100);
    res.json({ success: true, messages, roomId });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/chat/conversations — list unique conversations for current user
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = mongoose.Types.ObjectId.isValid(req.user.id) ? new mongoose.Types.ObjectId(req.user.id) : null;
    if (!userId) return res.status(400).json({ success: false, message: 'Invalid user ID' });

    const convs = await Message.aggregate([
      { $match: { $or: [{ sender: userId }, { receiver: userId }] } },
      { $sort:  { createdAt: -1 } },
      { $group: { _id: '$room', lastMessage: { $first: '$$ROOT' }, unread: {
        $sum: { $cond: [{ $and: [{ $eq: ['$receiver', userId] }, { $eq: ['$read', false] }] }, 1, 0] }
      }}},
      { $sort: { 'lastMessage.createdAt': -1 } },
      { $limit: 30 },
    ]);

    // Populate sender info
    const populated = await Message.populate(convs, {
      path: 'lastMessage.sender', select: 'name avatar'
    });

    res.json({ success: true, conversations: populated });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// PUT /api/chat/read/:roomId — mark all messages in room as read
router.put('/read/:roomId', protect, async (req, res) => {
  try {
    await Message.updateMany(
      { room: req.params.roomId, receiver: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/chat/unread-count
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Message.countDocuments({ receiver: req.user.id, read: false });
    res.json({ success: true, count });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
