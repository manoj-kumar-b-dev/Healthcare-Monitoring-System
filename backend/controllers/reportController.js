const { parse } = require('json2csv');
const User = require('../models/User');
const VitalSign = require('../models/VitalSign');
const Activity = require('../models/Activity');
const MedicineReminder = require('../models/MedicineReminder');
const Alert = require('../models/Alert');
const EmergencyAlertHistory = require('../models/EmergencyAlertHistory');
const Report = require('../models/Report');
const { generateHealthReportPdf } = require('../services/reportPdfService');

const generateCSVReport = (res, vitals, activities, reportId) => {
  const data = vitals.map(vital => {
    const dateKey = vital.timestamp.toISOString().split('T')[0];
    const activity = activities.find(item => item.date.toISOString().split('T')[0] === dateKey) || {};
    const hasAnomaly = Object.values(vital.anomalyFlags || {}).some(Boolean);
    return {
      Date: dateKey,
      Time: vital.timestamp.toISOString().split('T')[1].split('.')[0],
      'Heart Rate (bpm)': vital.heartRate,
      'SpO2 (%)': vital.spo2,
      'Temperature (C)': vital.temperature,
      'Blood Pressure': vital.bloodPressureSystolic && vital.bloodPressureDiastolic
        ? `${vital.bloodPressureSystolic}/${vital.bloodPressureDiastolic}` : '',
      'Blood Glucose (mg/dL)': vital.bloodGlucose ?? '',
      Steps: activity.steps || 0,
      'Distance (km)': activity.distance || 0,
      Calories: activity.caloriesBurned || 0,
      'Anomaly Flag': hasAnomaly ? 'YES' : 'NO'
    };
  });

  try {
    const csv = parse(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=health-report-${reportId}.csv`);
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Error generating CSV report' });
  }
};

const generateReport = async (req, res, next) => {
  try {
    const format = (req.query.format || req.body.format || 'pdf').toLowerCase();
    const startValue = req.query.startDate || req.body.startDate;
    const endValue = req.query.endDate || req.body.endDate;
    if (!startValue || !endValue) {
      return res.status(400).json({ message: 'startDate and endDate are required.' });
    }
    if (!['pdf', 'csv'].includes(format)) {
      return res.status(400).json({ message: 'Format must be "pdf" or "csv".' });
    }

    const start = new Date(startValue);
    const end = new Date(endValue);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return res.status(400).json({ message: 'Provide a valid date range.' });
    }
    end.setUTCHours(23, 59, 59, 999);

    const userId = req.user._id;
    const [user, vitals, activities, reminders, alerts, emergencyAlerts] = await Promise.all([
      User.findById(userId),
      VitalSign.find({ userId, timestamp: { $gte: start, $lte: end } }).sort({ timestamp: 1 }),
      Activity.find({ userId, date: { $gte: start, $lte: end } }).sort({ date: 1 }),
      MedicineReminder.find({ user: userId, startDate: { $lte: end }, endDate: { $gte: start } }).sort({ startDate: 1 }),
      Alert.find({ userId }),
      EmergencyAlertHistory.find({ userId, createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 })
    ]);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const metadata = await Report.create({ userId, format, dateRange: { startDate: start, endDate: end } });
    if (format === 'csv') return generateCSVReport(res, vitals, activities, metadata._id);
    return generateHealthReportPdf(res, {
      user, vitals, activities, reminders, alerts, emergencyAlerts,
      start, end, reportId: metadata._id
    });
  } catch (error) {
    next(error);
  }
};

const getReportHistory = async (req, res, next) => {
  try {
    const reports = await Report.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(reports.map(report => ({
      reportId: report._id,
      generatedAt: report.createdAt,
      dateRange: report.dateRange,
      format: report.format
    })));
  } catch (error) {
    next(error);
  }
};

module.exports = { generateReport, getReportHistory };
