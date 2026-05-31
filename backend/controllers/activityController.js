const Activity = require('../models/Activity');
const User = require('../models/User');
const ActivitySession = require('../models/ActivitySession');

// Helper to calculate total calories based on personal profile specs
const calculateCalories = (steps, userProfile) => {
  // Use fallbacks for safety if certain elements of profile are missing 
  const { weight = 70, age = 30, gender = 'male' } = userProfile || {};
  let calories = steps * weight * 0.00045;
  
  // Gender adjustment
  if (gender === 'female') calories *= 0.9;
  
  // Age adjustment (1% reduction per year over 25)
  if (age > 25) calories *= (1 - ((age - 25) * 0.01));
  
  // Ensure we don't output a negative bound and keep it cleanly rounded
  if (calories < 0) calories = 0;
  return Math.round(calories);
};

// Helper to normalize the date strictly to the Start of the Day (UTC)
// Ensures "One specific day = One strict unique document" functionality matches the Schema Index mapping
const getStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// @desc    Get today's activity data
// @route   GET /api/activities/today
// @access  Private
const getTodayActivity = async (req, res, next) => {
  try {
    const today = getStartOfDay();
    let activity = await Activity.findOne({ userId: req.user._id, date: today });
    
    if (!activity) {
      activity = await Activity.create({ 
        userId: req.user._id, 
        date: today, 
        steps: 0, 
        distance: 0, 
        caloriesBurned: 0 
      });
    }
    
    res.status(200).json(activity);
  } catch (error) {
     next(error);
  }
};

// @desc    Add steps to today's count
// @route   POST /api/activities/steps
// @access  Private
const addSteps = async (req, res, next) => {
  try {
    const { steps: stepsToAdd, source = 'sensor', timestamp, deviceId } = req.body;
    
    if (stepsToAdd === undefined || typeof stepsToAdd !== 'number' || Number.isNaN(stepsToAdd) || stepsToAdd < 0) {
      return res.status(400).json({ message: 'Valid positive steps amount is required' });
    }
    
    const today = getStartOfDay();
    let activity = await Activity.findOne({ userId: req.user._id, date: today });
    
    if (!activity) {
      activity = new Activity({ 
        userId: req.user._id, 
        date: today, 
        steps: 0, 
        distance: 0, 
        caloriesBurned: 0 
      });
    }
    
    const user = await User.findById(req.user._id);

    // Apply absolute step logic to prevent double counting
    activity.steps = Math.max(activity.steps, stepsToAdd);
    
    // Sync metadata from request
    activity.source = source;
    if (timestamp) activity.mobileTimestamp = new Date(timestamp);
    if (deviceId) activity.deviceId = deviceId;
    activity.syncStatus = 'synced';
    
    // Calculate Distance (Average Stride: 0.000762 km per step)
    activity.distance = parseFloat((activity.steps * 0.000762).toFixed(3));
    
    // Process comprehensive Calorie Estimation model
    activity.caloriesBurned = calculateCalories(activity.steps, user);
    
    await activity.save();
    
    res.status(200).json(activity);
  } catch (error) {
    next(error);
  }
};

// @desc    Get last 7 days activity summary
// @route   GET /api/activities/weekly
// @access  Private
const getWeeklyActivity = async (req, res, next) => {
  try {
    const today = getStartOfDay();
    const sevenDaysAgo = getStartOfDay(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));
    
    const activities = await Activity.find({
      userId: req.user._id,
      date: { $gte: sevenDaysAgo, $lte: today }
    }).sort({ date: 1 });
    
    // Fill any missing days out of the 7-day trailing span with baseline zero values
    const result = [];
    for (let i = 0; i < 7; i++) {
        const targetDate = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
        const existingRecord = activities.find(a => a.date.getTime() === targetDate.getTime());
        
        if (existingRecord) {
            result.push(existingRecord);
        } else {
            result.push({
               date: targetDate,
               steps: 0,
               distance: 0,
               caloriesBurned: 0
            });
        }
    }
    
    res.status(200).json(result);
  } catch (err) {
     next(err);
  }
};

// @desc    Get activity statistics summary
// @route   GET /api/activities/stats
// @access  Private
const getActivityStats = async (req, res, next) => {
   try {
    const user = await User.findById(req.user._id);
    const dailyStepGoal = user.settings?.dailyStepGoal || 10000;
       
    const today = getStartOfDay();
    const sevenDaysAgo = getStartOfDay(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000));
    
    const activities = await Activity.find({
      userId: req.user._id,
      date: { $gte: sevenDaysAgo, $lte: today }
    });
    
    let totalSteps = 0;
    let totalDistance = 0;
    let totalCalories = 0;
    
    activities.forEach(a => {
        totalSteps += a.steps;
        totalDistance += a.distance;
        totalCalories += a.caloriesBurned;
    });
    
    const averageDailySteps = Math.round(totalSteps / 7);
    
    // Ascertain today's specific metrics safely
    const todayActivity = activities.find(a => a.date.getTime() === today.getTime());
    const todaySteps = todayActivity ? todayActivity.steps : 0;
    
    // Calculate progress as % capping at 100
    const progressPercent = Math.min(100, Math.round((todaySteps / dailyStepGoal) * 100));

    res.status(200).json({
       totalStepsThisWeek: totalSteps,
       averageDailySteps,
       totalDistanceThisWeek: parseFloat(totalDistance.toFixed(3)),
       totalCaloriesBurnedThisWeek: totalCalories,
       progressTowardDailyGoalPercent: progressPercent,
       dailyGoal: dailyStepGoal
    });
   } catch(err) {
      next(err);
   }
};

// @desc    Bulk sync activity records (for offline recovery)
// @route   POST /api/activities/sync
// @access  Private
// @body    { records: [{ date, steps, source?, timestamp?, deviceId? }, ...] }
const sync = async (req, res, next) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'records array is required and must not be empty'
      });
    }

    if (records.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Cannot sync more than 500 records at once'
      });
    }

    const results = [];
    let skipped = 0;
    const user = await User.findById(req.user._id);

    for (const record of records) {
      try {
        const { date, steps, source = 'sensor', timestamp, deviceId } = record;

        // Validate required fields
        if (!date) {
          skipped++;
          continue;
        }

        if (typeof steps !== 'number' || steps < 0 || steps > 100000) {
          skipped++;
          continue;
        }

        // Normalize date to start of day (UTC)
        const startOfDay = getStartOfDay(new Date(date));

        // Find or create activity record for this day
        let activity = await Activity.findOne({
          userId: req.user._id,
          date: startOfDay
        });

        if (!activity) {
          activity = new Activity({
            userId: req.user._id,
            date: startOfDay,
            steps: 0,
            distance: 0,
            caloriesBurned: 0
          });
        }

        // Use Math.max to prevent double-counting on re-sync
        // (Take the higher value to prevent step loss or duplication)
        activity.steps = Math.max(activity.steps, steps);

        // Add source tracking fields if not already present
        activity.source = source;
        if (timestamp) activity.mobileTimestamp = new Date(timestamp);
        if (deviceId) activity.deviceId = deviceId;
        activity.syncStatus = 'synced';

        // Recalculate derived fields
        activity.distance = parseFloat((activity.steps * 0.000762).toFixed(3));
        activity.caloriesBurned = calculateCalories(activity.steps, user);

        await activity.save();
        results.push(activity);
      } catch (recordError) {
        console.error('[ActivityController] Sync record error:', recordError.message);
        skipped++;
      }
    }

    console.log(`[ActivityController] Sync completed: ${results.length} synced, ${skipped} skipped`);

    res.status(200).json({
      success: true,
      message: `Synced ${results.length} activity records`,
      synced: results.length,
      skipped: skipped,
      data: results
    });
  } catch (error) {
    console.error('[ActivityController] Sync error:', error);
    next(error);
  }
};

// @desc    Submit browser step session
// @route   POST /api/activities/session
// @access  Private
const submitSession = async (req, res, next) => {
  try {
    const { stepCount, sessionDuration, confidenceScore, timestamps = [], idempotencyKey, date } = req.body;

    // 1. Idempotency protection
    const existingSession = await ActivitySession.findOne({ idempotencyKey });
    if (existingSession) {
      console.log(`[ActivityController] Duplicate session detected (idempotency key: ${idempotencyKey}). Returning existing record.`);
      
      // Fetch current today activity to return along with it for frontend state sync
      const startOfDay = getStartOfDay(new Date(date));
      const activity = await Activity.findOne({ userId: req.user._id, date: startOfDay });

      return res.status(200).json({
        success: true,
        isDuplicate: true,
        session: existingSession,
        activity
      });
    }

    // 2. Plausible rate validation (Max physical cadence: 3.0 steps/sec = 180 steps/min)
    if (sessionDuration > 0) {
      const stepRate = stepCount / sessionDuration;
      if (stepRate > 3.0) {
        console.warn(`[ActivityController] Rejected session with anomalous step rate: ${stepRate.toFixed(2)} steps/sec`);
        return res.status(400).json({
          success: false,
          message: `Session rejected due to anomalous step rate (${(stepRate * 60).toFixed(0)} steps/min exceeds physical limit of 180)`
        });
      }
    }

    // 3. Save the high-fidelity session document
    const startOfDay = getStartOfDay(new Date(date));
    const session = new ActivitySession({
      userId: req.user._id,
      date: startOfDay,
      stepCount,
      sessionDuration,
      confidenceScore,
      timestamps,
      idempotencyKey
    });
    await session.save();

    // 4. Aggregate session steps into the daily Activity document
    let activity = await Activity.findOne({ userId: req.user._id, date: startOfDay });
    if (!activity) {
      activity = new Activity({
        userId: req.user._id,
        date: startOfDay,
        steps: 0,
        distance: 0,
        caloriesBurned: 0,
        source: 'sensor',
        syncStatus: 'synced'
      });
    }

    // Add session steps to daily accumulated steps
    activity.steps += stepCount;
    activity.source = 'sensor';
    activity.mobileTimestamp = new Date();
    activity.syncStatus = 'synced';

    // Recalculate derived fields
    activity.distance = parseFloat((activity.steps * 0.000762).toFixed(3));
    
    const user = await User.findById(req.user._id);
    activity.caloriesBurned = calculateCalories(activity.steps, user);

    await activity.save();

    console.log(`[ActivityController] Session submitted successfully. User: ${req.user._id}, steps added: ${stepCount}, total today: ${activity.steps}`);

    res.status(200).json({
      success: true,
      isDuplicate: false,
      session,
      activity
    });
  } catch (error) {
    console.error('[ActivityController] Error submitting session:', error);
    next(error);
  }
};

module.exports = {
  getTodayActivity,
  addSteps,
  getWeeklyActivity,
  getActivityStats,
  sync,
  submitSession
};

