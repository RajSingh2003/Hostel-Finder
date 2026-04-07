# 🏠 StayFinder v4.0 — Smart Hostel & Room Finder

**Full-stack MERN + Python AI** · Real-time Chat · PDF Agreements · Roommate Finder · Smart Notifications

---

## 🗂️ Project Structure

```
stayfinder/
├── client/                        # React 18 + Vite (PWA)
│   └── src/
│       ├── components/
│       │   ├── Navbar.jsx          # Hamburger menu + notification bell
│       │   ├── BottomNav.jsx       # Mobile nav with unread badge
│       │   ├── NotificationBell.jsx# Live bell + slide-in drawer
│       │   ├── PropertyCard.jsx    # AI price badge + wishlist
│       │   ├── AIPricePredictor.jsx# ML rent predictor widget
│       │   └── PropertyMap.jsx     # Google Maps / OpenStreetMap fallback
│       ├── context/
│       │   ├── AuthContext.jsx     # JWT auth + wishlist state
│       │   ├── SocketContext.jsx   # Per-room Socket.io listeners
│       │   └── NotificationContext.jsx # Real-time notification state
│       ├── pages/
│       │   ├── Home.jsx            # Hero + AI predictor + featured
│       │   ├── Search.jsx          # Filters + collapsible mobile
│       │   ├── PropertyDetail.jsx  # Gallery + AI analysis + booking
│       │   ├── Dashboard.jsx       # Bookings / Alerts / Agreements tabs
│       │   ├── AddProperty.jsx     # 3-step wizard form
│       │   ├── Auth.jsx            # Login / Register with role cards
│       │   ├── Chat.jsx            # True 1-to-1 real-time chat
│       │   ├── Payment.jsx         # Razorpay + auto PDF agreement
│       │   ├── RoommateFinder.jsx  # Match + Profile + Smart Alerts
│       │   └── AdminDashboard.jsx  # Platform management
│       └── utils/api.js            # All 40+ API calls
├── server/                        # Node.js + Express + Socket.io
│   ├── models/
│   │   ├── User.js                 # Auth, roles, wishlist
│   │   ├── Property.js             # Listing with AI price fields
│   │   ├── Booking.js              # Full lifecycle
│   │   ├── Review.js               # Star + aspect ratings
│   │   ├── Message.js              # 1-to-1 chat messages
│   │   ├── Notification.js         # 12 notification types
│   │   ├── Payment.js              # Razorpay records
│   │   ├── Agreement.js            # PDF agreement metadata
│   │   ├── PriceAlert.js           # Smart price/room alerts
│   │   └── RoommateProfile.js      # 25+ lifestyle preference fields
│   ├── routes/
│   │   ├── auth.js                 # Register/login/me/wishlist/user
│   │   ├── properties.js           # CRUD + Cloudinary + AI auto-price
│   │   ├── bookings.js             # Create/approve/reject + notifications
│   │   ├── reviews.js              # Add/get + auto rating update
│   │   ├── chat.js                 # History/conversations/read/unread
│   │   ├── payment.js              # Razorpay + mock mode + auto agreement
│   │   ├── agreement.js            # Generate/download/list PDF agreements
│   │   ├── notifications.js        # CRUD + mark read + clear all
│   │   ├── priceAlerts.js          # CRUD + checkAndFireAlerts()
│   │   ├── roommate.js             # Profile + matching algorithm
│   │   └── admin.js                # Platform management APIs
│   ├── utils/
│   │   ├── email.js                # 6 HTML email templates
│   │   ├── cloudinary.js           # Upload + local disk fallback
│   │   └── generateAgreement.js    # PDFKit agreement generator
│   ├── middleware/auth.js           # JWT protect + role authorize
│   ├── index.js                    # Express + Socket.io server
│   └── seed.js                     # Demo data seeder
└── ai-model/                      # Python FastAPI
    ├── train_model.py              # Random Forest training
    ├── main.py                     # /predict + /check-fraud
    └── requirements.txt
```

---

## ✅ Features Checklist

| Feature | Status |
|---|---|
| JWT Auth (register/login/logout) | ✅ |
| Role-based access (tenant/owner/admin) | ✅ |
| Property CRUD + Cloudinary images | ✅ |
| Advanced search + filters + pagination | ✅ |
| AI rent prediction (Random Forest + fallback) | ✅ |
| Overpriced / Fair / Deal badges | ✅ |
| Full booking lifecycle | ✅ |
| **True 1-to-1 real-time chat (Socket.io)** | ✅ |
| **Digital PDF rental agreement (PDFKit + QR)** | ✅ |
| **Auto-generate agreement after payment** | ✅ |
| **Smart price-drop + new-room notifications** | ✅ |
| **Roommate finder with compatibility algorithm** | ✅ |
| Razorpay payment (real + mock mode) | ✅ |
| Email notifications (6 HTML templates) | ✅ |
| In-app notification bell + drawer | ✅ |
| 10 notification event types via Socket.io | ✅ |
| Star reviews + auto rating update | ✅ |
| Wishlist management | ✅ |
| Owner analytics dashboard | ✅ |
| Admin platform management | ✅ |
| Google Maps + OpenStreetMap fallback | ✅ |
| PWA (manifest + service worker) | ✅ |
| Mobile responsive (3 breakpoints) | ✅ |
| Dark mode ready (CSS variables) | ✅ |
| Database seed script | ✅ |

---

## 🚀 Setup & Run

### Step 1 — Install dependencies
```bash
npm run install:all
```

### Step 2 — Configure environment
Edit `server/.env` (all keys have fallbacks — app works without them):
```env
MONGO_URI=mongodb://localhost:27017/hostel_finder
JWT_SECRET=your_secret_key

# Optional — has fallbacks if not set:
CLOUDINARY_CLOUD_NAME=...    # fallback: local disk
RAZORPAY_KEY_ID=...          # fallback: mock/demo mode
EMAIL_USER=...               # fallback: emails skipped silently
VITE_GOOGLE_MAPS_KEY=...     # fallback: OpenStreetMap
```

### Step 3 — Start MongoDB
```bash
mongod --dbpath /data/db
```

### Step 4 — Seed demo data (optional)
```bash
npm run seed
```
Creates 10 properties, 7 users, reviews, and notifications.
```
Admin  → admin@seed.stayfinder  / password123
Owner  → owner1@seed.stayfinder / password123
Tenant → tenant1@seed.stayfinder / password123
```

### Step 5 — Start AI model
```bash
cd ai-model
pip install -r requirements.txt
python train_model.py       # run once to create model.pkl
uvicorn main:app --reload --port 8000
```

### Step 6 — Run frontend + backend
```bash
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend + Socket.io | http://localhost:5000 |
| AI Model | http://localhost:8000 |
| AI Docs (Swagger) | http://localhost:8000/docs |

---

## 🔌 Complete API Reference

### Auth `/api/auth`
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Register + welcome email + notification |
| POST | `/login` | ❌ | Login |
| GET | `/me` | ✅ | Current user with wishlist |
| PUT | `/profile` | ✅ | Update name/phone |
| PUT | `/wishlist/:id` | ✅ | Toggle wishlist |
| GET | `/user/:id` | ❌ | Public profile (used by chat) |

### Properties `/api/properties`
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/` | ❌ | List with filters + pagination |
| GET | `/:id` | ❌ | Single property |
| POST | `/` | Owner | Create + Cloudinary + auto AI price |
| PUT | `/:id` | Owner | Update + fire price-drop alerts |
| DELETE | `/:id` | Owner | Delete + Cloudinary cleanup |
| GET | `/owner/my-listings` | Owner | My properties |

### Bookings `/api/bookings`
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/` | Tenant | Create + notify owner + notify tenant |
| GET | `/my` | Tenant | My bookings |
| GET | `/owner` | Owner | Incoming bookings |
| PUT | `/:id/status` | Both | Approve/reject/cancel + email + notify |
| GET | `/:id` | ✅ | Single booking |

### Chat `/api/chat`
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/history/:userId` | ✅ | Message history (generates roomId) |
| GET | `/conversations` | ✅ | All conversations with unread counts |
| PUT | `/read/:roomId` | ✅ | Mark room as read |
| GET | `/unread-count` | ✅ | Total unread messages |

### Agreement `/api/agreement`
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/generate/:bookingId` | ✅ | Generate PDF + email + notify (payment required) |
| GET | `/download/:agreementId` | ✅ | Re-download PDF |
| GET | `/booking/:bookingId` | ✅ | Check if agreement exists |
| GET | `/list` | ✅ | My agreements |

### Payment `/api/payment`
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/create-order` | ✅ | Create Razorpay order (or mock) |
| POST | `/verify` | ✅ | Verify + update booking + auto-generate agreement |
| GET | `/history` | ✅ | Payment history |
| GET | `/razorpay-key` | ❌ | Get public key |

### Notifications `/api/notifications`
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/` | ✅ | Get all (paginated) |
| GET | `/unread-count` | ✅ | Unread count |
| PUT | `/:id/read` | ✅ | Mark single as read |
| PUT | `/read-all` | ✅ | Mark all as read |
| DELETE | `/:id` | ✅ | Delete single |
| DELETE | `/clear-all` | ✅ | Clear all |

### Price Alerts `/api/price-alerts`
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/` | ✅ | Create alert |
| GET | `/` | ✅ | My alerts |
| DELETE | `/:id` | ✅ | Remove alert |
| PUT | `/:id/toggle` | ✅ | Pause/resume |

### Roommate `/api/roommate`
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/profile` | ✅ | Create/update profile |
| GET | `/profile/me` | ✅ | My profile |
| GET | `/matches` | ✅ | Top compatibility matches |
| GET | `/profile/:userId` | ✅ | View another profile |
| DELETE | `/profile` | ✅ | Deactivate profile |

### AI `/api/ai`
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/predict-price` | ❌ | Predict fair rent |
| POST | `/check-price` | ❌ | Fair/overpriced/deal check |
| GET | `/recommendations` | ✅ | Smart recommendations |

### Admin `/api/admin` (admin role only)
| Method | Route | Description |
|---|---|---|
| GET | `/stats` | Platform stats |
| GET | `/users` | All users |
| PUT | `/users/:id/role` | Change role |
| DELETE | `/users/:id` | Delete user |
| GET | `/properties` | All properties |
| PUT | `/properties/:id/approve` | Approve/suspend + notify owner |
| DELETE | `/properties/:id` | Delete |
| GET | `/bookings` | All bookings |
| GET | `/reviews` | All reviews |
| DELETE | `/reviews/:id` | Delete review |

---

## 🔌 Socket.io Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `user_online` | `userId` | Register as online |
| `join_room` | `roomId` | Join chat room |
| `leave_room` | `roomId` | Leave room |
| `send_message` | `{ senderId, receiverId, roomId, text }` | Send message |
| `typing` | `{ roomId, userId }` | Start typing |
| `stop_typing` | `{ roomId, userId }` | Stop typing |
| `subscribe_property` | `propertyId` | Watch for price changes |

### Server → Client
| Event | Description |
|---|---|
| `receive_message` | New message in room |
| `online_users` | Updated online user list |
| `user_typing` | Someone typing in room |
| `user_stop_typing` | Stopped typing |
| `new_notification` | Real-time notification push |

---

## 🤖 AI Model

**Algorithm:** Random Forest Regressor (200 trees, max_depth 12)  
**Trained on:** 3,000 synthetic samples (replace with real market data)  
**Features:** City, Room Type, Floor, Size(sqft), WiFi, AC, Meals, Gym, Laundry, Parking, Attached Bath, Furnished  
**Performance:** MAE ~₹650 · R² ~0.94  
**Fallback:** Node.js local regression when FastAPI is offline

---

## 🧑‍🤝‍🧑 Roommate Matching Algorithm

Compatibility score 0–100 across 9 weighted dimensions:

| Dimension | Points |
|---|---|
| Budget overlap | 25 |
| Same city | 20 |
| Cleanliness (within 1 level) | 10 |
| Wake time match | 8 |
| Sleep time match | 8 |
| Noise level | 7 |
| Smoking match | 7 |
| Drinking match | 7 |
| Guest policy | 5 |
| Gender preference bonus | 3 |

Minimum 30% score to appear in results. Results sorted descending.

---

## 📄 PDF Agreement

Generated with **PDFKit**. Contents:
- Dark header with StayFinder branding + QR code (verification URL)
- Two-column party boxes (owner / tenant)
- Property details, tenancy terms, cost breakdown
- Green "Total Paid" highlight band
- Amenities grid (3 columns)
- 10 standard T&C clauses
- Signature boxes for both parties
- Footer with unique Agreement ID

**Auto-triggered** when:
1. Payment is verified (`POST /api/payment/verify`)
2. PDF is emailed to tenant as attachment
3. Both parties get in-app notification

---

## 🎨 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 4, React Router v6 |
| Real-time | Socket.io (client + server) |
| Styling | Custom CSS design system (900+ lines) |
| Backend | Node.js, Express 4 |
| Database | MongoDB 6 + Mongoose |
| Auth | JWT + bcryptjs |
| AI/ML | Python, FastAPI, scikit-learn (Random Forest) |
| Images | Cloudinary (local disk fallback) |
| Payments | Razorpay (mock mode fallback) |
| Email | Nodemailer + Gmail SMTP |
| PDF | PDFKit + QRCode |
| Maps | Google Maps API (OpenStreetMap fallback) |
| PWA | Web App Manifest + Service Worker |
