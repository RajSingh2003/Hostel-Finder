const mongoose = require('mongoose');

const roommateProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },

  // Basic preferences
  city:          { type: String, required: true },
  area:          { type: String, default: '' },
  minBudget:     { type: Number, required: true },
  maxBudget:     { type: Number, required: true },
  roomType:      { type: String, enum: ['PG','Hostel','Studio','1BHK','2BHK','Shared Room'], default: 'Shared Room' },
  moveInDate:    { type: Date },
  gender:        { type: String, enum: ['Male','Female','Any'], default: 'Any' },

  // Lifestyle
  wakeTime:      { type: String, enum: ['Early bird (5-8am)','Morning (8-10am)','Flexible','Night owl (after 11pm)'], default: 'Flexible' },
  sleepTime:     { type: String, enum: ['Early (9-10pm)','Normal (10-12am)','Late (after 12am)','Flexible'], default: 'Flexible' },
  workSchedule:  { type: String, enum: ['Work from home','Office 9-5','Night shifts','Student','Flexible'], default: 'Office 9-5' },
  cleanliness:   { type: Number, min:1, max:5, default:3 },  // 1=messy, 5=very clean
  noiseLevel:    { type: String, enum: ['Quiet','Moderate','Lively'], default: 'Moderate' },
  guestPolicy:   { type: String, enum: ['No guests','Occasional','Frequent'], default: 'Occasional' },
  smoking:       { type: Boolean, default: false },
  drinking:      { type: Boolean, default: false },
  pets:          { type: Boolean, default: false },
  cooking:       { type: String, enum: ['I cook daily','Occasionally','Rarely/Order out'], default: 'Occasionally' },
  sharingCommon: { type: Boolean, default: true },  // ok sharing kitchen/bathroom

  // Preferences for roommate
  preferSameGender: { type: Boolean, default: false },
  preferStudent:    { type: Boolean, default: false },
  preferWorking:    { type: Boolean, default: false },
  ageRange:         { min: { type: Number, default: 18 }, max: { type: Number, default: 40 } },

  // Profile
  bio:           { type: String, maxlength: 500, default: '' },
  occupation:    { type: String, default: '' },
  age:           { type: Number, min: 18, max: 80 },
  active:        { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('RoommateProfile', roommateProfileSchema);
