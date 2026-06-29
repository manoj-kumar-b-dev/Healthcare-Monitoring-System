const mongoose = require('mongoose');

const vitalSignSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Index for efficient querying by user
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true // Index for optimal time-series filtering
  },
  heartRate: {
    type: Number,
    required: [true, 'Heart rate is required (bpm)'],
    min: 0
  },
  spo2: {
    type: Number,
    required: [true, 'SpO2 is required (%)'],
    min: 0,
    max: 100
  },
  temperature: {
    type: Number,
    required: [true, 'Temperature is required'],
    min: 20, // Arbitrary sensible min limit (Celsius)
    max: 45  // Arbitrary sensible max limit (Celsius)
  },
  bloodPressureSystolic: {
    type: Number,
    min: 0
  },
  bloodPressureDiastolic: {
    type: Number,
    min: 0
  },
  bloodGlucose: {
    type: Number,
    min: 0
  },
  anomalyFlags: {
    heartRateAnomaly: {   type: Boolean, default: false },
    spo2Anomaly: { type: Boolean, default: false },
    temperatureAnomaly: { type: Boolean, default: false },
    bloodPressureAnomaly: { type: Boolean, default: false },
    bloodGlucoseAnomaly: { type: Boolean, default: false }
  }
});

// Compound index combining userId and timestamp 
// Commonly used for retrieving latest vitals or history per user
vitalSignSchema.index({ userId: 1, timestamp: -1 });

const VitalSign = mongoose.model('VitalSign', vitalSignSchema);
module.exports = VitalSign;
