const VitalSign = require('../models/VitalSign');

// @desc    Create new vital signs record with anomaly detection
// @route   POST /api/vitals
// @access  Private
const createVitalSign = async (req, res, next) => {
  try {
    const { heartRate, spo2, temperature } = req.body;
    const userId = req.user._id;

    console.log(`[VitalsController] createVitalSign - userId: ${userId}, HR: ${heartRate}, SpO2: ${spo2}, Temp: ${temperature}`);

    // Validate input
    if (!heartRate || !spo2 || !temperature) {
      console.warn(`[VitalsController] Invalid input - missing vitals`);
      return res.status(400).json({ 
        success: false,
        message: 'Please provide heartRate, spo2, and temperature' 
      });
    }

    // Validate numeric ranges
    if (typeof heartRate !== 'number' || heartRate < 0 || heartRate > 300) {
      return res.status(400).json({ 
        success: false,
        message: 'Heart rate must be between 0 and 300 bpm' 
      });
    }
    if (typeof spo2 !== 'number' || spo2 < 0 || spo2 > 100) {
      return res.status(400).json({ 
        success: false,
        message: 'SpO2 must be between 0 and 100%' 
      });
    }
    if (typeof temperature !== 'number' || temperature < 20 || temperature > 45) {
      return res.status(400).json({ 
        success: false,
        message: 'Temperature must be between 20 and 45 Celsius' 
      });
    }

    // Determine anomaly flags
    const anomalyFlags = {
      heartRateAnomaly: heartRate > 100 || heartRate < 60,
      spo2Anomaly: spo2 < 95,
      temperatureAnomaly: temperature > 37.5 || temperature < 36.0,
    };

    const vitalSign = await VitalSign.create({
      userId,
      heartRate,
      spo2,
      temperature,
      anomalyFlags,
      timestamp: new Date()  // Explicitly set timestamp to ensure UTC
    });

    console.log(`[VitalsController] Vital record created: ${vitalSign._id}, anomalies: ${Object.values(anomalyFlags).filter(Boolean).length}`);

    res.status(201).json({
      success: true,
      data: vitalSign,
      message: 'Vital signs recorded successfully'
    });
  } catch (error) {
    console.error('[VitalsController] createVitalSign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vital signs record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get vital signs history with proper date filtering and timezone handling
 * @route GET /api/vitals
 * @query {string} timeRange - 'daily', 'weekly', or 'monthly'
 * @query {string} startDate - ISO date string for custom range (optional)
 * @query {string} endDate - ISO date string for custom range (optional)
 * @query {number} limit - Max records to return (default: 100, max: 500)
 * @returns {object} { success: boolean, data: array, meta: object }
 */
const getVitalHistory = async (req, res, next) => {
  try {
    const { timeRange, startDate, endDate, limit } = req.query;
    const userId = req.user._id;

    console.log(`[VitalsController] getVitalHistory - userId: ${userId}, timeRange: ${timeRange}, startDate: ${startDate}, endDate: ${endDate}`);

    let query = { userId };
    let fromDate, toDate;

    if (startDate && endDate) {
      // Custom date range
      fromDate = new Date(startDate);
      toDate = new Date(endDate);
      console.log(`[VitalsController] Using custom date range: ${fromDate.toISOString()} to ${toDate.toISOString()}`);
      
      query.timestamp = {
        $gte: fromDate,
        $lte: toDate
      };
    } else if (timeRange) {
      // Predefined time range - use UTC-based calculations
      const now = new Date();
      const utcNow = new Date(now.getTime());
      
      console.log(`[VitalsController] Using timeRange: ${timeRange}, current UTC: ${utcNow.toISOString()}`);

      switch (timeRange) {
        case 'daily': {
          // Get records from start of today (00:00:00 UTC) to now
          const startOfDay = new Date(utcNow);
          startOfDay.setUTCHours(0, 0, 0, 0);
          fromDate = startOfDay;
          toDate = utcNow;
          console.log(`[VitalsController] Daily range: ${fromDate.toISOString()} to ${toDate.toISOString()}`);
          break;
        }
        case 'weekly': {
          // Get records from 7 days ago to now
          fromDate = new Date(utcNow.getTime() - 7 * 24 * 60 * 60 * 1000);
          toDate = utcNow;
          console.log(`[VitalsController] Weekly range: ${fromDate.toISOString()} to ${toDate.toISOString()}`);
          break;
        }
        case 'monthly': {
          // Get records from 30 days ago to now
          fromDate = new Date(utcNow.getTime() - 30 * 24 * 60 * 60 * 1000);
          toDate = utcNow;
          console.log(`[VitalsController] Monthly range: ${fromDate.toISOString()} to ${toDate.toISOString()}`);
          break;
        }
        default:
          console.warn(`[VitalsController] Unknown timeRange: ${timeRange}, fetching last 24 hours as fallback`);
          fromDate = new Date(utcNow.getTime() - 24 * 60 * 60 * 1000);
          toDate = utcNow;
      }

      query.timestamp = {
        $gte: fromDate,
        $lte: toDate
      };
    } else {
      // No time range specified, return last 24 hours by default
      const now = new Date();
      fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      toDate = new Date();
      console.log(`[VitalsController] No timeRange specified, defaulting to last 24 hours`);
      query.timestamp = { $gte: fromDate, $lte: toDate };
    }

    // Validate and parse limit
    const maxLimit = Math.min(parseInt(limit, 10) || 100, 500);
    console.log(`[VitalsController] Limit set to: ${maxLimit}`);

    // Fetch vitals from database
    const vitals = await VitalSign.find(query)
      .sort({ timestamp: 1 })  // Ascending order: oldest first for chart display
      .limit(maxLimit)
      .lean();  // Use lean() for better performance on read-only queries

    console.log(`[VitalsController] Found ${vitals.length} vital records for user ${userId}`);

    // Validate that all records have valid timestamps
    const validatedVitals = vitals.filter((vital) => {
      if (!vital.timestamp || !(vital.timestamp instanceof Date || typeof vital.timestamp === 'string' || typeof vital.timestamp === 'number')) {
        console.warn(`[VitalsController] Skipping record with invalid timestamp:`, vital._id);
        return false;
      }
      return true;
    });

    if (validatedVitals.length < vitals.length) {
      console.warn(`[VitalsController] Filtered out ${vitals.length - validatedVitals.length} records with invalid timestamps`);
    }

    // Success response with proper format
    res.status(200).json({
      success: true,
      data: validatedVitals,
      meta: {
        count: validatedVitals.length,
        timeRange,
        dateRange: {
          from: fromDate?.toISOString(),
          to: toDate?.toISOString()
        },
        fetchedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[VitalsController] getVitalHistory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vital signs history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get most recent vital signs reading
// @route   GET /api/vitals/latest
// @access  Private
// @returns {object} { success: boolean, data: object }
const getLatestVitalSign = async (req, res, next) => {
  try {
    const userId = req.user._id;
    console.log(`[VitalsController] getLatestVitalSign - userId: ${userId}`);

    const vital = await VitalSign.findOne({ userId })
      .sort({ timestamp: -1 })
      .lean();

    if (!vital) {
      console.log(`[VitalsController] No vital records found for user ${userId}`);
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No vital signs records found'
      });
    }

    console.log(`[VitalsController] Latest vital found: ${vital._id}, timestamp: ${vital.timestamp?.toISOString()}`);

    res.status(200).json({
      success: true,
      data: vital,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[VitalsController] getLatestVitalSign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest vital signs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get statistical analysis for vital signs (last 7 days)
// @route   GET /api/vitals/stats
// @access  Private
// @returns {object} Comprehensive vitals statistics
const getVitalStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    console.log(`[VitalsController] getVitalStats - userId: ${userId}`);

    // Calculate date range for last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    console.log(`[VitalsController] Stats range: ${sevenDaysAgo.toISOString()} to ${now.toISOString()}`);

    const vitals = await VitalSign.find({
      userId,
      timestamp: { $gte: sevenDaysAgo, $lte: now }
    }).lean();

    console.log(`[VitalsController] Found ${vitals.length} vitals for stats calculation`);

    if (!vitals || vitals.length === 0) {
      console.log(`[VitalsController] No vitals found for stats, returning defaults`);
      return res.status(200).json({
        success: true,
        data: {
          averageHeartRate: 0,
          averageSpo2: 0,
          averageTemperature: 0,
          minHeartRate: 0,
          maxHeartRate: 0,
          minSpo2: 0,
          maxSpo2: 0,
          minTemperature: 0,
          maxTemperature: 0,
          anomalyCount: 0,
          healthScore: 100,
          readingsCount: 0
        },
        message: 'No data available for statistics',
        period: '7 days'
      });
    }

    // Calculate statistics
    let totalHeartRate = 0;
    let totalSpo2 = 0;
    let totalTemperature = 0;
    let minHeartRate = vitals[0].heartRate;
    let maxHeartRate = vitals[0].heartRate;
    let minSpo2 = vitals[0].spo2;
    let maxSpo2 = vitals[0].spo2;
    let minTemperature = vitals[0].temperature;
    let maxTemperature = vitals[0].temperature;
    let anomalyCount = 0;

    vitals.forEach((vital) => {
      totalHeartRate += vital.heartRate;
      totalSpo2 += vital.spo2;
      totalTemperature += vital.temperature;

      minHeartRate = Math.min(minHeartRate, vital.heartRate);
      maxHeartRate = Math.max(maxHeartRate, vital.heartRate);
      minSpo2 = Math.min(minSpo2, vital.spo2);
      maxSpo2 = Math.max(maxSpo2, vital.spo2);
      minTemperature = Math.min(minTemperature, vital.temperature);
      maxTemperature = Math.max(maxTemperature, vital.temperature);

      const flags = vital.anomalyFlags;
      if (flags && (flags.heartRateAnomaly || flags.spo2Anomaly || flags.temperatureAnomaly)) {
        anomalyCount++;
      }
    });

    const count = vitals.length;

    // Calculate health score: 100 - (anomalyCount * 5), min 0, max 100
    let healthScore = Math.max(0, Math.min(100, 100 - (anomalyCount * 5)));

    const stats = {
      averageHeartRate: parseFloat((totalHeartRate / count).toFixed(2)),
      averageSpo2: parseFloat((totalSpo2 / count).toFixed(2)),
      averageTemperature: parseFloat((totalTemperature / count).toFixed(2)),
      minHeartRate,
      maxHeartRate,
      minSpo2,
      maxSpo2,
      minTemperature,
      maxTemperature,
      anomalyCount,
      healthScore,
      readingsCount: count
    };

    console.log(`[VitalsController] Stats calculated - avg HR: ${stats.averageHeartRate}, anomalies: ${anomalyCount}, score: ${healthScore}`);

    res.status(200).json({
      success: true,
      data: stats,
      period: '7 days',
      calculatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[VitalsController] getVitalStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate vital signs statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete specific vital signs record
// @route   DELETE /api/vitals/:id
// @access  Private
const deleteVitalSign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    console.log(`[VitalsController] deleteVitalSign - id: ${id}, userId: ${userId}`);

    const vital = await VitalSign.findById(id);

    if (!vital) {
      console.warn(`[VitalsController] Vital record not found: ${id}`);
      return res.status(404).json({ 
        success: false,
        message: 'Vital sign record not found' 
      });
    }

    // Verify record belongs to authenticated user
    if (vital.userId.toString() !== userId.toString()) {
      console.warn(`[VitalsController] Unauthorized deletion attempt for record ${id} by user ${userId}`);
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete this record' 
      });
    }

    await VitalSign.findByIdAndDelete(id);

    console.log(`[VitalsController] Vital record deleted: ${id}`);

    res.status(200).json({ 
      success: true,
      message: 'Vital sign record deleted successfully',
      deletedId: id
    });
  } catch (error) {
    console.error('[VitalsController] deleteVitalSign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vital signs record',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createVitalSign,
  getVitalHistory,
  getLatestVitalSign,
  getVitalStats,
  deleteVitalSign
};
