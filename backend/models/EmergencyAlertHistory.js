const mongoose = require('mongoose');

// ─── Delivery Log Sub-Schema ─────────────────────────────────────────────────
const deliveryLogSchema = new mongoose.Schema({
  contactName:    { type: String, required: true },
  contactMethod:  { type: String, enum: ['email', 'sms'], required: true },
  contactAddress: { type: String, required: true },
  status:         { type: String, enum: ['success', 'failed', 'pending'], default: 'pending' },
  error:          { type: String },
}, { _id: false }); // _id: false — sub-docs don't need their own ObjectId

// ─── Emergency Alert History Schema ─────────────────────────────────────────
const emergencyAlertHistorySchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    // Index: makes userId-based history queries fast (O(log n) vs O(n) collection scan)
    index:    true,
  },

  emergencyType: {
    type:    String,
    default: 'General Medical Emergency',
  },

  // Top-level document status — tracks whether background dispatch has completed.
  // 'pending'    → history doc created, notifications not yet sent
  // 'completed'  → all notifications delivered successfully
  // 'partial'    → at least one notification delivered, some failed
  // 'failed'     → all notification attempts failed
  status: {
    type:    String,
    enum:    ['pending', 'completed', 'partial', 'failed'],
    default: 'pending',
    index:   true, // useful for admin dashboards filtering by status
  },

  vitalsSnapshot: {
    heartRate:   { type: Number },
    spo2:        { type: Number },
    temperature: { type: Number },
    healthScore: { type: Number },
    bloodPressureSystolic: { type: Number },
    bloodPressureDiastolic: { type: Number },
    bloodGlucose: { type: Number },
  },

  locationSnapshot: {
    latitude:  { type: Number },
    longitude: { type: Number },
  },

  deliveryLogs: [deliveryLogSchema],

}, { timestamps: true });

// ─── Compound Index ──────────────────────────────────────────────────────────
// Optimizes the most common query: "fetch all alerts for user X, newest first"
emergencyAlertHistorySchema.index({ userId: 1, createdAt: -1 });

const EmergencyAlertHistory = mongoose.model('EmergencyAlertHistory', emergencyAlertHistorySchema);
module.exports = EmergencyAlertHistory;
