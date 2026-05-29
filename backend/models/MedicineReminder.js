const mongoose = require('mongoose');

// Medicine Reminder Schema
const reminderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  medicineName: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true,
    minlength: [2, 'Medicine name must be at least 2 characters']
  },
  dosage: {
    type: String,
    required: [true, 'Dosage is required'],
    trim: true,
    match: [/^[\d\.]+\s*(mg|g|ml|tablet|capsule|pill)$/i, 'Please enter valid dosage (e.g., 500mg, 1 tablet)']
  },
  frequency: {
    type: String,
    required: [true, 'Frequency is required'],
    enum: {
      values: ['Once Daily', 'Twice Daily', 'Three Times Daily', 'Four Times Daily', 'Weekly', 'As Needed'],
      message: 'Frequency must be one of: Once Daily, Twice Daily, Three Times Daily, Four Times Daily, Weekly, As Needed'
    }
  },
  time: [{
    type: String,
    required: true
  }],
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    default: Date.now
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    default: ''
  },
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Suspended'],
    default: 'Active'
  },
  lastNotified: {
    type: Date
  },
  nextNotification: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient querying of upcoming reminders
reminderSchema.index({ user: 1, status: 1, nextNotification: 1 });

// Virtual: Calculate if reminder is overdue
reminderSchema.virtual('isOverdue').get(function() {
  if (!this.nextNotification) return false;
  return new Date() > this.nextNotification && this.status === 'Active';
});

// Method: Check if reminder should fire now
reminderSchema.methods.shouldNotify = function() {
  if (this.status !== 'Active') return false;
  if (!this.nextNotification) return true; // First notification

  const now = new Date();
  return now >= this.nextNotification;
};

// Method: Calculate next notification time based on frequency
reminderSchema.methods.calculateNextNotification = function() {
  const now = new Date();
  let next = new Date(this.lastNotified || now);

  switch (this.frequency) {
    case 'Once Daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'Twice Daily':
      next.setDate(next.getDate() + 0.5); // 12 hours
      next.setHours(next.getHours() + 12);
      break;
    case 'Three Times Daily':
      next.setDate(next.getDate() + 0.33); // ~8 hours
      next.setHours(next.getHours() + 8);
      break;
    case 'Four Times Daily':
      next.setDate(next.getDate() + 0.25); // ~6 hours
      next.setHours(next.getHours() + 6);
      break;
    case 'Weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'As Needed':
      next = null; // No automatic scheduling
      break;
    default:
      next.setDate(next.getDate() + 1);
  }

  // If specific times are set, adjust to the next occurrence
  if (this.time && this.time.length > 0 && next) {
    const today = now.getDay();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    // Find next valid time from the schedule
    let found = false;
    for (const timeStr of this.time) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const reminderTime = new Date(next);
      reminderTime.setHours(hours, minutes, 0, 0);

      if (reminderTime > now) {
        next = reminderTime;
        found = true;
        break;
      }
    }

    if (!found) {
      // All times passed today, schedule for tomorrow
      next.setDate(next.getDate() + 1);
      const firstTime = this.time[0].split(':').map(Number);
      next.setHours(firstTime[0], firstTime[1], 0, 0);
    }
  }

  this.nextNotification = next;
  return next;
};

const MedicineReminder = mongoose.model('MedicineReminder', reminderSchema);

module.exports = MedicineReminder;
