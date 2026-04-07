/**
 * seed.js — Populate database with demo data for testing
 * Run: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const User     = require('./models/User');
const Property = require('./models/Property');
const Review   = require('./models/Review');
const Notification = require('./models/Notification');

const CITIES = ['Pune','Mumbai','Bengaluru','Delhi','Hyderabad'];
const TYPES  = ['PG','Hostel','Studio','1BHK','Shared Room'];
const AMENITIES_POOL = ['WiFi','AC','Attached Bath','Meals Included','Gym','Laundry','Parking','CCTV','Hot Water','Furnished'];

const PROP_DATA = [
  { title:'Sunrise Boys PG',        city:'Pune',      area:'Koregaon Park',  type:'PG',     price:7500,  size:110, gender:'Male',   amenities:['WiFi','AC','Meals Included','Laundry'] },
  { title:'Green Nest Hostel',       city:'Mumbai',    area:'Bandra West',    type:'Hostel', price:12000, size:90,  gender:'Any',    amenities:['WiFi','AC','Parking','Gym'] },
  { title:'Lotus Studio Apartment',  city:'Bengaluru', area:'Indiranagar',    type:'Studio', price:14000, size:200, gender:'Any',    amenities:['WiFi','AC','Attached Bath','Gym','Laundry','Furnished'] },
  { title:'City View PG for Ladies', city:'Delhi',     area:'Connaught Place',type:'PG',     price:8000,  size:100, gender:'Female', amenities:['WiFi','Meals Included','CCTV'] },
  { title:'Elite Boys Hostel',       city:'Pune',      area:'Hinjewadi',      type:'Hostel', price:5500,  size:80,  gender:'Male',   amenities:['WiFi','Hot Water','Laundry'] },
  { title:'Kohinoor 1BHK',           city:'Pune',      area:'Baner',          type:'1BHK',   price:18000, size:350, gender:'Any',    amenities:['WiFi','AC','Parking','Attached Bath'] },
  { title:'Pearl PG for Ladies',     city:'Mumbai',    area:'Andheri East',   type:'PG',     price:11000, size:110, gender:'Female', amenities:['WiFi','AC','Meals Included','Gym','Laundry'] },
  { title:'Skyline Shared Room',     city:'Bengaluru', area:'Whitefield',     type:'Shared Room',price:6000,size:70,gender:'Any',   amenities:['WiFi','AC','CCTV'] },
  { title:'Metro PG',                city:'Delhi',     area:'Lajpat Nagar',   type:'PG',     price:9000,  size:95,  gender:'Male',   amenities:['WiFi','AC','Parking'] },
  { title:'Comfort Zone Hostel',     city:'Hyderabad', area:'Banjara Hills',  type:'Hostel', price:7000,  size:85,  gender:'Any',    amenities:['WiFi','AC','Hot Water','Laundry'] },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Clear existing seed data
  await Promise.all([
    User.deleteMany({ email: { $regex: '@seed.stayfinder' } }),
  ]);

  // ── Create Users ───────────────────────────────────────────────────────
  const hashedPwd = await bcrypt.hash('password123', 12);

  const admin = await User.create({
    name:'Admin User', email:'admin@seed.stayfinder', password:hashedPwd, role:'admin', isVerified:true
  });

  const owners = await User.insertMany([
    { name:'Ramesh Sharma',  email:'owner1@seed.stayfinder', password:hashedPwd, phone:'9876543210', role:'owner', isVerified:true },
    { name:'Priya Mehta',    email:'owner2@seed.stayfinder', password:hashedPwd, phone:'9876543211', role:'owner', isVerified:true },
    { name:'Anil Patil',     email:'owner3@seed.stayfinder', password:hashedPwd, phone:'9876543212', role:'owner', isVerified:true },
  ]);

  const tenants = await User.insertMany([
    { name:'Arjun Singh',    email:'tenant1@seed.stayfinder', password:hashedPwd, phone:'9876543220', role:'tenant', isVerified:true },
    { name:'Sneha Kulkarni', email:'tenant2@seed.stayfinder', password:hashedPwd, phone:'9876543221', role:'tenant', isVerified:true },
    { name:'Rahul Joshi',    email:'tenant3@seed.stayfinder', password:hashedPwd, phone:'9876543222', role:'tenant', isVerified:true },
  ]);

  console.log(`✅ Created ${owners.length + tenants.length + 1} users`);

  // ── Create Properties ──────────────────────────────────────────────────
  const AI_PRICES = [7200, 9500, 15200, 8100, 5200, 16500, 10800, 6400, 8700, 6800];
  const STATUSES  = ['fair','overpriced','deal','fair','fair','overpriced','fair','deal','fair','fair'];

  const properties = await Promise.all(PROP_DATA.map((p, i) => {
    const owner = owners[i % owners.length];
    return Property.create({
      title:       p.title,
      description: `${p.title} is a well-maintained ${p.type.toLowerCase()} in ${p.area}, ${p.city}. Ideal for ${p.gender === 'Any' ? 'anyone' : p.gender + 's'}. Easy access to public transport, markets and tech parks.`,
      type:        p.type,
      gender:      p.gender,
      location: {
        address: p.area,
        city:    p.city,
        state:   'Maharashtra',
        coordinates: { lat: 18.5 + (i * 0.05), lng: 73.8 + (i * 0.05) }
      },
      price:            p.price,
      aiPredictedPrice: AI_PRICES[i],
      priceStatus:      STATUSES[i],
      size:             p.size,
      floor:            ['Ground','1st','2nd','3rd'][i % 4],
      totalRooms:       Math.floor(Math.random() * 8) + 2,
      availableRooms:   Math.floor(Math.random() * 4) + 1,
      amenities:        p.amenities,
      securityDeposit:  p.price * 2,
      owner:            owner._id,
      rating:           3.8 + Math.random() * 1.2,
      reviewCount:      Math.floor(Math.random() * 40) + 5,
      isApproved:       true,
      isAvailable:      true,
    });
  }));

  console.log(`✅ Created ${properties.length} properties`);

  // ── Create Reviews ─────────────────────────────────────────────────────
  const REVIEW_TEXTS = [
    'Excellent place, very clean and well-maintained. Owner is responsive.',
    'Good location and amenities. WiFi speed could be better but overall satisfied.',
    'Best PG I have lived in. AI pricing saved me money vs nearby options.',
    'Comfortable stay. Food quality is good. Recommend for working professionals.',
    'Decent place for the price. Location is very convenient near metro station.',
  ];

  const reviews = [];
  for (let i = 0; i < Math.min(properties.length, 5); i++) {
    const tenant = tenants[i % tenants.length];
    try {
      const r = await Review.create({
        user:     tenant._id,
        property: properties[i]._id,
        rating:   Math.floor(Math.random() * 2) + 4,
        comment:  REVIEW_TEXTS[i],
        aspects:  { cleanliness:4, location:4, value:4, amenities:4 },
      });
      reviews.push(r);
    } catch {}
  }
  console.log(`✅ Created ${reviews.length} reviews`);

  // ── Welcome Notifications ──────────────────────────────────────────────
  await Notification.insertMany([
    ...tenants.map(t => ({
      recipient: t._id, type:'welcome',
      title:'🎉 Welcome to StayFinder!',
      message:'Your account is ready. Browse verified rooms with AI-powered fair pricing!',
      link:'/search',
    })),
    ...owners.map(o => ({
      recipient: o._id, type:'welcome',
      title:'🎉 Welcome to StayFinder!',
      message:'Your owner account is ready. Your properties have been listed!',
      link:'/dashboard',
    })),
  ]);

  console.log('\n🌱 Seed complete! Test accounts:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Admin  →  admin@seed.stayfinder   / password123');
  console.log('  Owner  →  owner1@seed.stayfinder  / password123');
  console.log('  Tenant →  tenant1@seed.stayfinder / password123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
