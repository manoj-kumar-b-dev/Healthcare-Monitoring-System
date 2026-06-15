const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  relationship: { type: String }
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: 3
  },
  name: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false // Avoid returning the password in queries by default
  },
  age: { type: Number, min: 0 },
  weight: { type: Number, min: 0 },
  height: { type: Number, min: 0 },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  dateOfBirth: { type: Date },
  emergencyContacts: [emergencyContactSchema],
  settings: {
    soundAlerts: { type: Boolean, default: true },
    dailyStepGoal: { type: Number, default: 10000, min: 0 },
    unit: { type: String, enum: ['metric', 'imperial'], default: 'metric' }
  },
  // ─── NEW: Timezone Support ────────────────────────────────────────────
  timezone: {
    type: String,
    default: 'UTC',
    description: 'IANA timezone (e.g., "America/New_York", "Asia/Kolkata")',
    example: 'Asia/Kolkata'
  }
}, { timestamps: true });


userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;
