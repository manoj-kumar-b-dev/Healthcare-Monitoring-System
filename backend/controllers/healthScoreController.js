const HealthScore = require('../models/HealthScore');
const VitalSign = require('../models/VitalSign');
const Activity = require('../models/Activity');
const MedicineReminder = require('../models/MedicineReminder');
const Alert = require('../models/Alert');

// ─── Status helpers ──────────────────────────────────────────────────────────

const getStatus = (score) => {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Poor';
  return 'Critical';
};

/**
 * Generates achievement badges based on recent score history and metrics.
 * @param {Array} recentScores - Array of recent HealthScore documents (newest first)
 * @param {object} metrics - Current score metrics
 * @returns {Array<{id, label, icon, earned}>}
 */
const computeBadges = (recentScores, metrics) => {
  const badges = [];

  // Streak badges — check consecutive days of a given status
  const last7 = recentScores.slice(0, 7);
  const last3 = recentScores.slice(0, 3);

  const allExcellent3 = last3.length === 3 && last3.every(s => s.score >= 90);
  const allGoodPlus3  = last3.length === 3 && last3.every(s => s.score >= 75);
  const allGoodPlus7  = last7.length === 7 && last7.every(s => s.score >= 75);

  badges.push({
    id: 'three_day_excellent',
    label: '3-Day Excellent Streak',
    description: 'Maintained an Excellent score for 3 consecutive days',
    icon: 'star',
    earned: allExcellent3,
  });

  badges.push({
    id: 'three_day_good',
    label: '3-Day Good+ Streak',
    description: 'Maintained a Good or better score for 3 consecutive days',
    icon: 'trending-up',
    earned: allGoodPlus3,
  });

  badges.push({
    id: 'week_warrior',
    label: 'Week Warrior',
    description: 'Maintained a Good or better score for 7 consecutive days',
    icon: 'award',
    earned: allGoodPlus7,
  });

  // Activity badges
  const stepGoal = 10000;
  badges.push({
    id: 'step_goal',
    label: 'Step Goal Achieved',
    description: 'Reached 10,000 steps today',
    icon: 'footprints',
    earned: (metrics?.steps || 0) >= stepGoal,
  });

  // Vitals badges
  badges.push({
    id: 'perfect_spo2',
    label: 'Perfect SpO₂',
    description: 'SpO₂ level at 98% or above',
    icon: 'heart-pulse',
    earned: (metrics?.spo2 || 0) >= 98,
  });

  badges.push({
    id: 'medicine_hero',
    label: 'Medicine Hero',
    description: 'Perfect medicine adherence',
    icon: 'pill',
    earned: (metrics?.medicineAdherence || 0) === 100,
  });

  return badges;
};

/**
 * Determines score trend based on recent history.
 * @param {Array} recentScores - Last ~14 scores, newest first
 * @returns {'up'|'down'|'stable'}
 */
const computeTrend = (recentScores) => {
  if (recentScores.length < 2) return 'stable';
  const newest = recentScores[0].score;
  const oldest = recentScores[recentScores.length - 1].score;
  const delta = newest - oldest;
  if (delta >= 5) return 'up';
  if (delta <= -5) return 'down';
  return 'stable';
};

// ─── Core calculation logic ───────────────────────────────────────────────────

/**
 * Calculates a weighted health score based on vitals, activity, and medicine adherence.
 * @param {string} userId
 * @returns {Promise<object>} The calculated health score details
 */
const calculateScore = async (userId) => {
  try {
    // 1. Fetch latest data
    const latestVitals = await VitalSign.findOne({ userId }).sort({ timestamp: -1 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activityToday = await Activity.findOne({ userId, date: { $gte: today } });
    const reminders = await MedicineReminder.find({ user: userId, status: 'Active' });

    // 2. Initial component scores
    let hrScore   = 50; // Default for missing data (partial credit)
    let spo2Score = 50;
    let tempScore = 50;
    let activityScore = 0;
    let medScore  = 100;

    const insights = [];
    const metrics = {
      heartRate:        latestVitals?.heartRate    || 0,
      spo2:             latestVitals?.spo2          || 0,
      temperature:      latestVitals?.temperature   || 0,
      steps:            activityToday?.steps        || 0,
      calories:         activityToday?.caloriesBurned || 0,
      medicineAdherence: 100,
    };

    let dataAvailable = false;

    // 3. Heart Rate (25%) — Normal: 60–100 bpm
    if (latestVitals && typeof latestVitals.heartRate === 'number') {
      dataAvailable = true;
      const hr = Math.max(0, latestVitals.heartRate);
      if (hr >= 60 && hr <= 100) {
        hrScore = 100;
        insights.push('Heart rate is in the excellent range.');
      } else if (hr < 60) {
        hrScore = Math.max(0, 100 - (60 - hr) * 5);
        insights.push(`Heart rate is lower than normal (${hr} bpm). Consider light cardio.`);
      } else {
        // hr > 100
        hrScore = Math.max(0, 100 - (hr - 100) * 2);
        insights.push(`Heart rate has been above normal (${hr} bpm). Monitor and rest if needed.`);
      }
    } else {
      hrScore = 0;
      insights.push('Missing heart rate data. Please log your vitals.');
    }

    // 4. SpO₂ (25%) — Normal: 95–100%
    if (latestVitals && typeof latestVitals.spo2 === 'number') {
      dataAvailable = true;
      const spo2 = Math.min(100, Math.max(0, latestVitals.spo2));
      if (spo2 >= 95) {
        spo2Score = 100;
        insights.push('SpO₂ levels are excellent — great oxygenation!');
      } else if (spo2 >= 90) {
        spo2Score = Math.max(0, 100 - (95 - spo2) * 15);
        insights.push(`SpO₂ is slightly below normal (${spo2}%). Try slow, deep breathing.`);
      } else {
        spo2Score = Math.max(0, 100 - (95 - spo2) * 20);
        insights.push(`SpO₂ is critically low (${spo2}%). Seek medical attention immediately.`);
      }
    } else {
      spo2Score = 0;
      insights.push('Missing SpO₂ data. Please log your vitals.');
    }

    // 5. Temperature (15%) — Normal: 36.1–37.2°C
    if (latestVitals && typeof latestVitals.temperature === 'number') {
      dataAvailable = true;
      const temp = latestVitals.temperature;
      if (temp >= 36.1 && temp <= 37.2) {
        tempScore = 100;
        insights.push('Body temperature is normal.');
      } else if (temp > 37.2 && temp <= 37.5) {
        tempScore = 80;
        insights.push(`Body temperature is slightly elevated (${temp}°C). Stay hydrated.`);
      } else if (temp > 37.5) {
        tempScore = Math.max(0, 100 - (temp - 37.5) * 20);
        insights.push(`Body temperature is high (${temp}°C). This may indicate a fever.`);
      } else if (temp < 36.1 && temp >= 35.0) {
        tempScore = 70;
        insights.push(`Body temperature is slightly low (${temp}°C). Keep warm.`);
      } else {
        tempScore = Math.max(0, 100 - (36.0 - temp) * 20);
        insights.push(`Body temperature is critically low (${temp}°C). Seek medical attention.`);
      }
    } else {
      tempScore = 0;
      insights.push('Missing temperature data. Please log your vitals.');
    }

    // 6. Activity (20%) — Steps (goal: 10,000) & Calories (goal: 2,000 kcal)
    const stepGoal = 10000;
    const calGoal  = 2000;
    const steps    = activityToday?.steps          || 0;
    const calories = activityToday?.caloriesBurned || 0;

    const stepScore = Math.min(100, (steps / stepGoal) * 100);
    const calScore  = Math.min(100, (calories / calGoal) * 100);
    activityScore   = (stepScore * 0.6) + (calScore * 0.4); // Steps weighted more

    if (steps === 0 && calories === 0) {
      insights.push('No activity recorded today. Try to get moving!');
    } else if (steps < stepGoal * 0.5) {
      insights.push(`Daily steps (${steps.toLocaleString()}) are below half your goal. Keep going!`);
    } else if (steps < stepGoal) {
      insights.push(`You're ${(stepGoal - steps).toLocaleString()} steps away from your daily goal.`);
    } else {
      insights.push(`Step goal achieved! ${steps.toLocaleString()} steps today — excellent activity!`);
    }

    // 7. Medicine Adherence (15%)
    if (reminders.length > 0) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const missedAlerts = await Alert.countDocuments({
        userId,
        message: /missed|medicine/i,
        createdAt: { $gte: oneDayAgo },
      });

      if (missedAlerts > 0) {
        medScore = Math.max(0, 100 - missedAlerts * 20);
        insights.push(`You missed ${missedAlerts} medicine reminder${missedAlerts > 1 ? 's' : ''} recently. Stay on track!`);
      } else {
        medScore = 100;
        insights.push('Medicine adherence is on track. Well done!');
      }
    } else {
      medScore = 100;
      insights.push('No active medicine reminders set.');
    }
    metrics.medicineAdherence = medScore;

    // 8. Weighted final score
    const finalScore = Math.round(
      (hrScore   * 0.25) +
      (spo2Score * 0.25) +
      (tempScore * 0.15) +
      (activityScore * 0.20) +
      (medScore  * 0.15)
    );

    // 9. New-user / insufficient-data handling
    if (!dataAvailable) {
      insights.unshift('Insufficient health data to calculate an accurate score. Please log your vitals.');
    }

    return {
      userId,
      score:   Math.min(100, Math.max(0, finalScore)),
      status:  getStatus(finalScore),
      metrics,
      insights,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('[HealthScore] Error in calculation:', error);
    throw error;
  }
};

// ─── API handlers ─────────────────────────────────────────────────────────────

/**
 * @desc    Get latest health score (auto-recalculates if stale > 1 hour)
 * @route   GET /api/health-score
 * @access  Private
 */
exports.getLatestHealthScore = async (req, res) => {
  try {
    let scoreRecord = await HealthScore.findOne({ userId: req.user._id }).sort({ timestamp: -1 });

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (!scoreRecord || scoreRecord.timestamp < oneHourAgo) {
      const calculatedData = await calculateScore(req.user._id);
      scoreRecord = await HealthScore.create(calculatedData);
    }

    res.status(200).json({ success: true, data: scoreRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Force recalculate and save a new health score
 * @route   POST /api/health-score/calculate
 * @access  Private
 */
exports.triggerCalculation = async (req, res) => {
  try {
    const calculatedData = await calculateScore(req.user._id);
    const scoreRecord    = await HealthScore.create(calculatedData);

    res.status(201).json({ success: true, data: scoreRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get health score history for the last N days
 * @route   GET /api/health-score/history?days=7
 * @access  Private
 */
exports.getHealthScoreHistory = async (req, res) => {
  try {
    const days      = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 90);
    const dateLimit = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const history = await HealthScore.find({
      userId:    req.user._id,
      timestamp: { $gte: dateLimit },
    }).sort({ timestamp: 1 });

    res.status(200).json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get weekly health summary: avg score per day, trend, badges
 * @route   GET /api/health-score/summary
 * @access  Private
 */
exports.getHealthSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch last 30 scores for trend & badge computation
    const recentScores = await HealthScore.find({ userId })
      .sort({ timestamp: -1 })
      .limit(30);

    // Compute trend from last 14
    const trend = computeTrend(recentScores.slice(0, 14));

    // Latest score for badge computation
    const latestScore = recentScores[0];
    const badges = computeBadges(recentScores, latestScore?.metrics);

    // Weekly averages — group by day-of-week (0=Sun … 6=Sat)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekScores = recentScores.filter(s => s.timestamp >= sevenDaysAgo);

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const byDay = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }));

    weekScores.forEach(s => {
      const dow = new Date(s.timestamp).getDay();
      byDay[dow].total += s.score;
      byDay[dow].count += 1;
    });

    const weeklyAverages = dayLabels.map((label, i) => ({
      day:   label,
      avg:   byDay[i].count > 0 ? Math.round(byDay[i].total / byDay[i].count) : null,
      count: byDay[i].count,
    }));

    // Summary stats
    const scores = recentScores.map(s => s.score);
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
    const highScore = scores.length > 0 ? Math.max(...scores) : null;
    const lowScore  = scores.length > 0 ? Math.min(...scores) : null;

    res.status(200).json({
      success: true,
      data: {
        trend,
        badges,
        weeklyAverages,
        stats: {
          average:   avgScore,
          highest:   highScore,
          lowest:    lowScore,
          totalDays: recentScores.length,
        },
        latestScore: latestScore || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
