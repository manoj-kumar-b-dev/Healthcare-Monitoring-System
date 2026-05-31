const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  steps: {
    type: Number,
    default: 0,
    min: 0
  },
  distance: {
    type: Number,
    min: 0
  },
  caloriesBurned: {
    type: Number,
    min: 0
  },
  // ─── NEW: Source Tracking ──────────────────────────────────────────────
  source: {
    type: String,
    enum: ['sensor', 'manual', 'api_sync', 'import', 'health_connect'],
    default: 'api_sync',
    index: true
  },
  // Original timestamp from device (for offline sync scenarios)
  mobileTimestamp: {
    type: Date,
    description: 'Original timestamp when data was recorded on device'
  },
  // Unique device identifier (for tracking which phone submitted data)
  deviceId: {
    type: String,
    description: 'Android device ID or phone identifier'
  },
  // Sync status for offline recovery tracking
  syncStatus: {
    type: String,
    enum: ['pending', 'synced', 'failed'],
    default: 'synced'
  }
}, { timestamps: true });


// Unique compound index — ensures one record per user per day
activitySchema.index({ userId: 1, date: 1 }, { unique: true });

// Index for filtering by source (analytics, debugging)
activitySchema.index({ userId: 1, source: 1 });

// Index for sync operations (offline recovery queries)
activitySchema.index({ userId: 1, createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);
module.exports = Activity;
