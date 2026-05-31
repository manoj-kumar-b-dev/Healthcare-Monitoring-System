const mongoose = require('mongoose');

const activitySessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  stepCount: {
    type: Number,
    required: true,
    min: 0
  },
  sessionDuration: {
    type: Number,
    required: true,
    min: 0,
    description: 'Duration of the session in seconds'
  },
  confidenceScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    description: 'Average step detection confidence score'
  },
  timestamps: {
    type: [Date],
    default: [],
    description: 'Array of high-precision timestamps for each detected step'
  },
  idempotencyKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  }
}, { timestamps: true });

// Compound index for querying a user's sessions by date
activitySessionSchema.index({ userId: 1, date: 1 });

const ActivitySession = mongoose.model('ActivitySession', activitySessionSchema);
module.exports = ActivitySession;
