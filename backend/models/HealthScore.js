const mongoose = require('mongoose');

const healthScoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'],
    required: true
  },
  metrics: {
    heartRate: Number,
    spo2: Number,
    temperature: Number,
    steps: Number,
    calories: Number,
    medicineAdherence: Number
  },
  insights: [String],
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

// Index for latest score per user
healthScoreSchema.index({ userId: 1, timestamp: -1 });

const HealthScore = mongoose.model('HealthScore', healthScoreSchema);
module.exports = HealthScore;
