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
    required: true,
    validate: {
      validator: (v) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(v),
      message: (props) => `"${props.value}" is not a valid time. Use HH:MM in 24-hour format (e.g. 08:02, 13:17, 22:45)`
    }
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
// Iterates all reminder times for today first; only advances to tomorrow
// (or the next frequency interval) when every time for today has already passed.
reminderSchema.methods.calculateNextNotification = function() {
  const now = new Date();

  // 'As Needed' never schedules automatically
  if (this.frequency === 'As Needed' || !this.time || this.time.length === 0) {
    this.nextNotification = null;
    return null;
  }

  // Sort times ascending so we always find the earliest next slot
  const sortedTimes = [...this.time].sort();

  // ── Step 1: Look for a time still remaining today ──────────────────────────
  for (const timeStr of sortedTimes) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const candidate = new Date(now);
    candidate.setHours(hours, minutes, 0, 0);
    if (candidate > now) {
      this.nextNotification = candidate;
      return candidate;
    }
  }

  // ── Step 2: All today's times have passed — advance by frequency interval ──
  let daysToAdd = 1; // default: tomorrow
  switch (this.frequency) {
    case 'Weekly':          daysToAdd = 7;  break;
    case 'Once Daily':      daysToAdd = 1;  break;
    case 'Twice Daily':     daysToAdd = 1;  break;
    case 'Three Times Daily': daysToAdd = 1; break;
    case 'Four Times Daily':  daysToAdd = 1; break;
    default:                daysToAdd = 1;  break;
  }

  const firstTime = sortedTimes[0].split(':').map(Number);
  const next = new Date(now);
  next.setDate(next.getDate() + daysToAdd);
  next.setHours(firstTime[0], firstTime[1], 0, 0);

  this.nextNotification = next;
  return next;
};

const MedicineReminder = mongoose.model('MedicineReminder', reminderSchema);

module.exports = MedicineReminder;
