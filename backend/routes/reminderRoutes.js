const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createReminder,
  getReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  updateReminderStatus,
  getTodaysReminders,
  getReminderStats
} = require('../controllers/reminderController');

// All reminder routes require authentication
router.use(protect);

// CRUD routes
router.route('/')
  .post(createReminder)
  .get(getReminders);

// Get today's reminders
router.get('/today', getTodaysReminders);

// Get reminder statistics
router.get('/stats', getReminderStats);

// Single reminder operations
router.route('/:id')
  .get(getReminderById)
  .put(updateReminder)
  .delete(deleteReminder);

// Update status (mark as completed/suspended)
router.patch('/:id/status', updateReminderStatus);

module.exports = router;
