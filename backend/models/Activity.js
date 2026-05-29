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
  }
}, { timestamps: true });


activitySchema.index({ userId: 1, date: 1 }, { unique: true });// to avoid duplicate data

const Activity = mongoose.model('Activity', activitySchema);
module.exports = Activity;
