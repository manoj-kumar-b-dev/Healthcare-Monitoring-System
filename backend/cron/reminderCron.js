const cron = require('node-cron');
const MedicineReminder = require('../models/MedicineReminder');
const User = require('../models/User');

// Optional: Integrate with socket.io for real-time notifications
let io = null;

// Set socket.io instance for real-time notifications
const setSocketIO = (socketInstance) => {
  io = socketInstance;
};

/**
 * Core reminder checker - runs every minute
 * Finds active reminders that match current time
 * Logs notifications and can send real-time alerts
 */
const startReminderCron = () => {
  console.log('[Cron] Medicine reminder scheduler started');

  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday

      // Format current time for matching (HH:MM)
      const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

      console.log(`[Cron] Checking reminders at ${now.toISOString()}`);

      // Find all active reminders that should trigger now
      // For weekly reminders, also check if today matches
      const reminders = await MedicineReminder.find({
        status: 'Active',
        startDate: { $lte: now },
        endDate: { $gte: now },
        nextNotification: {
          $lte: now
        }
      }).populate('user', 'username email');

      if (reminders.length === 0) {
        return;
      }

      console.log(`[Cron] Found ${reminders.length} reminder(s) to notify`);

      for (const reminder of reminders) {
        try {
          // For weekly frequency, check if today matches
          if (reminder.frequency === 'Weekly') {
            // Optional: Could store specific days in the reminder
            // For now, we'll notify every day if time matches
          }

          // Check if current time matches any of the reminder times
          const timeMatches = reminder.time.some(timeStr => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours === currentHour && minutes === currentMinute;
          });

          if (!timeMatches) {
            continue;
          }

          // Log the reminder notification
          console.log(`\n========================================`);
          console.log(`MEDICINE REMINDER`);
          console.log(`----------------------------------------`);
          console.log(`Medicine: ${reminder.medicineName}`);
          console.log(`Dosage: ${reminder.dosage}`);
          console.log(`User: ${reminder.user?.username || 'Unknown'}`);
          console.log(`Email: ${reminder.user?.email || 'N/A'}`);
          console.log(`Time: ${currentTimeStr}`);
          console.log(`Frequency: ${reminder.frequency}`);
          if (reminder.notes) {
            console.log(`Notes: ${reminder.notes}`);
          }
          console.log(`========================================\n`);

          // Update last notified time
          reminder.lastNotified = now;
          reminder.calculateNextNotification();
          await reminder.save();

          // Real-time notification via Socket.IO (if available)
          if (io && reminder.user) {
            const userRoom = `user_${reminder.user._id}`;
            io.to(userRoom).emit('reminder:triggered', {
              reminderId: reminder._id,
              medicineName: reminder.medicineName,
              dosage: reminder.dosage,
              time: currentTimeStr,
              message: `Time to take ${reminder.medicineName} (${reminder.dosage})`,
              timestamp: now
            });

            console.log(`[Socket] Sent real-time reminder to user ${reminder.user._id} in room ${userRoom}`);
          }

          // TODO: Add email notification here
          // TODO: Add push notification here

        } catch (err) {
          console.error(`[Cron] Error processing reminder ${reminder._id}:`, err.message);
        }
      }
    } catch (error) {
      console.error('[Cron] Scheduler error:', error);
    }
  });
};

/**
 * Sync all active reminders' nextNotification times
 * Call this on server startup to ensure all reminders have correct schedule
 */
const syncReminderSchedule = async () => {
  try {
    console.log('[Cron] Syncing reminder schedules...');
    const activeReminders = await MedicineReminder.find({ status: 'Active' });

    let updated = 0;
    for (const reminder of activeReminders) {
      const oldNext = reminder.nextNotification;
      reminder.calculateNextNotification();
      if (reminder.nextNotification && reminder.nextNotification.getTime() !== oldNext?.getTime()) {
        await reminder.save();
        updated++;
      }
    }

    console.log(`[Cron] Schedule sync complete. Updated ${updated} reminder(s)`);
  } catch (error) {
    console.error('[Cron] Sync error:', error);
  }
};

/**
 * Reset reminders that missed their notification time
 * Ensures no reminders get stuck if server was down
 */
const resetMissedNotifications = async () => {
  try {
    const now = new Date();
    const missedReminders = await MedicineReminder.find({
      status: 'Active',
      startDate: { $lte: now },
      endDate: { $gte: now },
      nextNotification: { $lt: now }
    });

    if (missedReminders.length > 0) {
      console.log(`[Cron] Resetting ${missedReminders.length} missed reminder(s)`);

      for (const reminder of missedReminders) {
        // Reset nextNotification to current time to trigger immediate notification on next cycle
        reminder.nextNotification = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0);
        await reminder.save();
      }
    }
  } catch (error) {
    console.error('[Cron] Reset error:', error);
  }
};

module.exports = {
  startReminderCron,
  syncReminderSchedule,
  resetMissedNotifications,
  setSocketIO
};
