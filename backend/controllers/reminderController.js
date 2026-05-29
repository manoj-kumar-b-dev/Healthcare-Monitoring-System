const MedicineReminder = require('../models/MedicineReminder');

// @desc    Create a new medicine reminder
// @route   POST /api/reminders
// @access  Private
const createReminder = async (req, res, next) => {
  try {
    const {
      medicineName,
      dosage,
      frequency,
      time,
      startDate,
      endDate,
      notes,
      status = 'Active'
    } = req.body;

    // Validate required fields
    if (!medicineName || !dosage || !frequency || !time || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        fields: {
          medicineName: !medicineName,
          dosage: !dosage,
          frequency: !frequency,
          time: !time,
          startDate: !startDate,
          endDate: !endDate
        }
      });
    }

    // Ensure time is an array
    const timeArray = Array.isArray(time) ? time : [time];
    if (timeArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one time must be specified'
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Create the reminder
    const reminder = await MedicineReminder.create({
      user: req.user._id,
      medicineName,
      dosage,
      frequency,
      time: timeArray,
      startDate: start,
      endDate: end,
      notes: notes || '',
      status,
      lastNotified: null,
      nextNotification: start // First notification at start date
    });

    // Calculate initial next notification
    reminder.calculateNextNotification();
    await reminder.save();

    res.status(201).json({
      success: true,
      data: reminder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reminders for logged-in user
// @route   GET /api/reminders
// @access  Private
const getReminders = async (req, res, next) => {
  try {
    const { status, limit = 50, page = 1, sortBy = 'nextNotification' } = req.query;

    // Build query
    let query = { user: req.user._id };

    if (status && ['Active', 'Completed', 'Suspended'].includes(status)) {
      query.status = status;
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const reminders = await MedicineReminder.find(query)
      .sort({ [sortBy]: 1, 'nextNotification': 1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const total = await MedicineReminder.countDocuments(query);

    res.status(200).json({
      success: true,
      count: reminders.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: reminders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single reminder by ID
// @route   GET /api/reminders/:id
// @access  Private
const getReminderById = async (req, res, next) => {
  try {
    const reminder = await MedicineReminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    // Check ownership
    if (reminder.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this reminder'
      });
    }

    res.status(200).json({
      success: true,
      data: reminder
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reminder ID'
      });
    }
    next(error);
  }
};

// @desc    Update reminder
// @route   PUT /api/reminders/:id
// @access  Private
const updateReminder = async (req, res, next) => {
  try {
    const {
      medicineName,
      dosage,
      frequency,
      time,
      startDate,
      endDate,
      notes,
      status
    } = req.body;

    const reminder = await MedicineReminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    // Check ownership
    if (reminder.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this reminder'
      });
    }

    // Update fields
    if (medicineName !== undefined) reminder.medicineName = medicineName;
    if (dosage !== undefined) reminder.dosage = dosage;
    if (frequency !== undefined) reminder.frequency = frequency;
    if (time !== undefined) reminder.time = Array.isArray(time) ? time : [time];
    if (startDate !== undefined) reminder.startDate = new Date(startDate);
    if (endDate !== undefined) reminder.endDate = new Date(endDate);
    if (notes !== undefined) reminder.notes = notes;
    if (status !== undefined) reminder.status = status;

    // Validate dates if both exist
    if (reminder.endDate <= reminder.startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Recalculate next notification time
    reminder.calculateNextNotification();
    await reminder.save();

    res.status(200).json({
      success: true,
      data: reminder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete reminder
// @route   DELETE /api/reminders/:id
// @access  Private
const deleteReminder = async (req, res, next) => {
  try {
    const reminder = await MedicineReminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    // Check ownership
    if (reminder.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this reminder'
      });
    }

    await reminder.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Reminder deleted successfully'
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reminder ID'
      });
    }
    next(error);
  }
};

// @desc    Update reminder status (mark as completed/suspended)
// @route   PATCH /api/reminders/:id/status
// @access  Private
const updateReminderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !['Active', 'Completed', 'Suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required: Active, Completed, or Suspended'
      });
    }

    const reminder = await MedicineReminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }

    // Check ownership
    if (reminder.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this reminder'
      });
    }

    reminder.status = status;
    reminder.lastNotified = new Date();

    // If marking as completed, suspend automatic notifications
    if (status === 'Completed') {
      reminder.nextNotification = null;
    }

    await reminder.save();

    res.status(200).json({
      success: true,
      data: reminder
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reminder ID'
      });
    }
    next(error);
  }
};

// @desc    Get today's reminders
// @route   GET /api/reminders/today
// @access  Private
const getTodaysReminders = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reminders = await MedicineReminder.find({
      user: req.user._id,
      status: 'Active',
      startDate: { $lte: tomorrow },
      endDate: { $gte: today }
    }).sort({ 'nextNotification': 1 });

    res.status(200).json({
      success: true,
      count: reminders.length,
      data: reminders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reminder statistics
// @route   GET /api/reminders/stats
// @access  Private
const getReminderStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const total = await MedicineReminder.countDocuments({ user: userId });
    const active = await MedicineReminder.countDocuments({ user: userId, status: 'Active' });
    const completed = await MedicineReminder.countDocuments({ user: userId, status: 'Completed' });
    const suspended = await MedicineReminder.countDocuments({ user: userId, status: 'Suspended' });

    // Overdue reminders
    const now = new Date();
    const overdue = await MedicineReminder.countDocuments({
      user: userId,
      status: 'Active',
      nextNotification: { $lt: now }
    });

    // Due today
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const dueToday = await MedicineReminder.countDocuments({
      user: userId,
      status: 'Active',
      nextNotification: {
        $gte: todayStart,
        $lte: todayEnd
      }
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        active,
        completed,
        suspended,
        overdue,
        dueToday
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReminder,
  getReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  updateReminderStatus,
  getTodaysReminders,
  getReminderStats
};
