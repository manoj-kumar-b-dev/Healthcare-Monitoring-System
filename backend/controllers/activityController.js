const Activity = require('../models/Activity');
const User = require('../models/User');

// Helper to calculate total calories based on personal profile specs
const calculateCalories = (steps, userProfile) => {
  // Use fallbacks for safety if certain elements of profile are missing 
  const { weight = 70, age = 30, gender = 'male' } = userProfile;
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
    const { steps: stepsToAdd } = req.body;
    
    if (stepsToAdd === undefined || typeof stepsToAdd !== 'number' || stepsToAdd < 0) {
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

    // Apply incremental step logic
    activity.steps += stepsToAdd;
    
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
       progressTowardDailyGoalPercent: progressPercent
    });
   } catch(err) {
      next(err);
   }
};

module.exports = {
  getTodayActivity,
  addSteps,
  getWeeklyActivity,
  getActivityStats
};
