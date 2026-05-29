const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  format: {
    type: String,
    enum: ['pdf', 'csv'],
    required: true
  },
  dateRange: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  }
}, { timestamps: true });

const Report = mongoose.model('Report', reportSchema);
module.exports = Report;
