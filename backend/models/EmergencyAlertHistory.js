const mongoose = require('mongoose');

const deliveryLogSchema = new mongoose.Schema({
  contactName: { type: String, required: true },
  contactMethod: { type: String, enum: ['email', 'sms'], required: true },
  contactAddress: { type: String, required: true }, // email or phone number
  status: { type: String, enum: ['success', 'failed', 'pending'], default: 'pending' },
  error: { type: String }, // To log reason if failed
});

const emergencyAlertHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  emergencyType: { type: String, default: 'General Medical Emergency' },
  vitalsSnapshot: {
    heartRate: { type: Number },
    spo2: { type: Number },
    temperature: { type: Number },
    healthScore: { type: Number },
  },
  locationSnapshot: {
    latitude: { type: Number },
    longitude: { type: Number },
  },
  deliveryLogs: [deliveryLogSchema],
}, { timestamps: true });

const EmergencyAlertHistory = mongoose.model('EmergencyAlertHistory', emergencyAlertHistorySchema);
module.exports = EmergencyAlertHistory;
