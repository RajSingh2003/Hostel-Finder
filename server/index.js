const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const mongoose   = require('mongoose');
const cors       = require('cors');
const dotenv     = require('dotenv');
const path       = require('path');

dotenv.config();

const app    = express();
const server = http.createServer(app);

// ✅ Allowed origins (FIXED)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173'
];

// ✅ Socket.IO CORS FIX
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.set('io', io);

// ✅ Express CORS FIX
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ─────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/properties',    require('./routes/properties'));
app.use('/api/bookings',      require('./routes/bookings'));
app.use('/api/reviews',       require('./routes/reviews'));
app.use('/api/ai',            require('./routes/ai'));
app.use('/api/chat',          require('./routes/chat'));
app.use('/api/payment',       require('./routes/payment'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/agreement',     require('./routes/agreement'));
app.use('/api/roommate',      require('./routes/roommate'));
app.use('/api/price-alerts',  require('./routes/priceAlerts'));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/', (_req, res) => res.json({ message: 'StayFinder API v5' }));

// ── Models ─────────────────────────────────────────
const Message      = require('./models/Message');
const Notification = require('./models/Notification');
const jwt          = require('jsonwebtoken');

// Track online users
const onlineUsers = new Map();

// ── Socket auth ────────────────────────────────────
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (token) {
      const d = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = d.id.toString();
    }
  } catch (_) {}
  next();
});

// ── Socket events ─────────────────────────────────
io.on('connection', (socket) => {

  if (socket.userId) {
    socket.join('user_' + socket.userId);
    onlineUsers.set(socket.userId, socket.id);
    io.emit('online_users', [...onlineUsers.keys()]);
  }

  socket.on('user_online', (uid) => {
    if (!uid) return;
    const id = uid.toString();
    socket.userId = id;
    socket.join('user_' + id);
    onlineUsers.set(id, socket.id);
    io.emit('online_users', [...onlineUsers.keys()]);
  });

  socket.on('join_room', (roomId) => {
    if (roomId) socket.join(roomId);
  });

  socket.on('send_message', async ({ senderId, receiverId, roomId, text }) => {
    if (!senderId || !receiverId || !roomId || !text?.trim()) {
      socket.emit('msg_error', 'Missing fields');
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
      socket.emit('msg_error', 'Invalid IDs');
      return;
    }

    try {
      const saved = await Message.create({
        sender: senderId,
        receiver: receiverId,
        room: roomId,
        text: text.trim(),
      });

      await saved.populate('sender', 'name');

      const msg = {
        _id: saved._id.toString(),
        sender: { _id: senderId, name: saved.sender.name },
        receiver: receiverId,
        room: roomId,
        text: saved.text,
        read: false,
        createdAt: saved.createdAt,
      };

      io.to(roomId).emit('new_message', msg);

      await Notification.createAndEmit(io, {
        recipient: receiverId,
        type: 'new_message',
        title: '💬 New Message',
        message: `${saved.sender.name}: ${text.slice(0, 60)}`,
        link: '/chat/' + senderId,
        meta: { senderId },
      });

    } catch (err) {
      console.error(err);
      socket.emit('msg_error', 'Server error');
    }
  });

  socket.on('typing', (roomId) => socket.to(roomId).emit('typing', roomId));
  socket.on('stop_typing', (roomId) => socket.to(roomId).emit('stop_typing', roomId));

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit('online_users', [...onlineUsers.keys()]);
    }
  });
});

// ── Start ─────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(process.env.PORT || 5000, () =>
      console.log('🚀 Server running on port', process.env.PORT || 5000)
    );
  })
  .catch(err => {
    console.error('❌ MongoDB error:', err.message);
    process.exit(1);
  });