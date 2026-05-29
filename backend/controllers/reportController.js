const PDFDocument = require('pdfkit');
const { parse } = require('json2csv');
const User = require('../models/User');
const VitalSign = require('../models/VitalSign');
const Activity = require('../models/Activity');
const Report = require('../models/Report');

// Document export configuration formats
const generateCSVReport = (res, user, vitals, activities, start, end, reportId) => {
   // Mapping chronological rows combining Vitals and Activity boundaries
   const data = vitals.map(vital => {
     const vitalDateStr = vital.timestamp.toISOString().split('T')[0];
     const timeStr = vital.timestamp.toISOString().split('T')[1].split('.')[0];
     
     // Find corresponding activity for the precise localized day
     const defaultActivity = { steps: 0, distance: 0, caloriesBurned: 0 };
     const activity = activities.find(a => a.date.toISOString().split('T')[0] === vitalDateStr) || defaultActivity;
     
     const hasAnomaly = vital.anomalyFlags.heartRateAnomaly || vital.anomalyFlags.spo2Anomaly || vital.anomalyFlags.temperatureAnomaly;

     return {
       Date: vitalDateStr,
       Time: timeStr,
       'Heart Rate (bpm)': vital.heartRate,
       'SpO2 (%)': vital.spo2,
       'Temperature (°C)': vital.temperature,
       Steps: activity.steps,
       'Distance (km)': activity.distance,
       Calories: activity.caloriesBurned,
       'Anomaly Flag': hasAnomaly ? 'YES' : 'NO'
     };
   });

   try {
     const fields = ['Date', 'Time', 'Heart Rate (bpm)', 'SpO2 (%)', 'Temperature (°C)', 'Steps', 'Distance (km)', 'Calories', 'Anomaly Flag'];
     const csv = parse(data, { fields });
     
     res.setHeader('Content-Type', 'text/csv');
     res.setHeader('Content-Disposition', `attachment; filename=health-report-${reportId}.csv`);
     res.status(200).send(csv);
   } catch (err) {
     res.status(500).json({ message: 'Error automatically generating CSV' });
   }
};

const generatePDFReport = (res, user, vitals, activities, start, end, reportId) => {
   const doc = new PDFDocument({ margin: 50 });
   
   // Set response headers securely ensuring stream executes a download payload on the frontend browser
   res.setHeader('Content-Type', 'application/pdf');
   res.setHeader('Content-Disposition', `attachment; filename=health-report-${reportId}.pdf`);
   
   // Pipe PDF generation engine straight to Node's API stream pipe
   doc.pipe(res);
   
   // Part 1: Hero & Metadata Banner
   doc.fontSize(20).text(`Health Report for ${user.username}`, { align: 'center' });
   doc.moveDown();
   doc.fontSize(12).text(`Date Range: ${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`, { align: 'center' });
   doc.moveDown(2);
   
   // Summary Stats Pre-processor
   let totalHR = 0, totalSpo2 = 0, totalTemp = 0, anomalyCount = 0;
   vitals.forEach(v => {
      totalHR += v.heartRate;
      totalSpo2 += v.spo2;
      totalTemp += v.temperature;
      if (v.anomalyFlags.heartRateAnomaly || v.anomalyFlags.spo2Anomaly || v.anomalyFlags.temperatureAnomaly) anomalyCount++;
   });
   
   // Avoid DB division by zero issues
   const vCount = vitals.length || 1; 
   let totalSteps = 0, totalDist = 0, totalCals = 0;
   activities.forEach(a => {
      totalSteps += a.steps;
      totalDist += a.distance;
      totalCals += a.caloriesBurned;
   });
   
   // Part 2: Formatted Aggregated Outputs
   doc.fontSize(16).text('1. Summary Statistics', { underline: true });
   doc.moveDown(0.5);
   doc.fontSize(12).text(`- Average Heart Rate: ${(totalHR/vCount).toFixed(1)} bpm`);
   doc.text(`- Average SpO2: ${(totalSpo2/vCount).toFixed(1)}%`);
   doc.text(`- Average Temperature: ${(totalTemp/vCount).toFixed(1)}°C`);
   doc.text(`- Total Steps Taken: ${totalSteps}`);
   doc.text(`- Total Distance Walked: ${(totalDist).toFixed(2)} km`);
   doc.text(`- Total Calories Burned: ${totalCals} kcal`);
   doc.text(`- Total Anomaly Alerts Count: ${anomalyCount} triggered exceptions`);
   doc.moveDown(2);
   
   // Part 3: Vital Signs Logging Extract Array Slice
   doc.fontSize(16).text('2. Vital Signs Data Highlights Sample', { underline: true });
   doc.moveDown(0.5);
   doc.fontSize(10);
   // Restrict max PDF text bounds naturally avoiding large 5000+ document stream issues manually hanging backend nodes
   const printLimit = Math.min(vitals.length, 50);
   for(let i=0; i < printLimit; i++) {
      const v = vitals[i];
      doc.text(`${v.timestamp.toISOString().split('T')[0]} | Time: ${v.timestamp.toISOString().split('T')[1].split('.')[0]} | HR: ${v.heartRate} bpm | SpO2: ${v.spo2}% | Temp: ${v.temperature}°C`);
   }
   if (vitals.length > 50) {
       doc.moveDown(0.5);
       doc.text(`... plus ${vitals.length - 50} more omitted records...`);
   }
   doc.moveDown(2);
   
   // Part 4: Physical Routines Data Array Output
   doc.fontSize(16).text('3. Recorded Physical Activities Logging', { underline: true });
   doc.moveDown(0.5);
   doc.fontSize(10);
   activities.forEach(a => {
      doc.text(`${a.date.toISOString().split('T')[0]} | Total Steps: ${a.steps} | Travel: ${a.distance} km | Calories Burned: ${a.caloriesBurned} kcal`);
   });
   doc.moveDown(3);
   
   // Bottom Footer Anchor
   doc.fontSize(10).text('- Generated by Decentralized Healthcare Monitoring System Algorithm -', { align: 'center', color: '#999999' });
   // Execute Stream Closure 
   doc.end();
};


// @desc    Generate interactive health report stream
// @route   POST /api/reports/generate
// @access  Private
const generateReport = async (req, res, next) => {
  try {
    // Process formatting directly dynamically reading from express route query
    const formatType = (req.query.format || req.body.format || 'pdf').toLowerCase();
    const sDate = req.query.startDate || req.body.startDate;
    const eDate = req.query.endDate || req.body.endDate;

    if (!sDate || !eDate) {
      return res.status(400).json({ message: 'Reporting range startDate and endDate bounds are strictly required.' });
    }

    const start = new Date(sDate);
    // Align endpoint gracefully assuming user just passes purely logical "days"
    const end = new Date(eDate);
    end.setUTCHours(23, 59, 59, 999);

    const user = await User.findById(req.user._id);

    // Concurrently aggregate database bounds asynchronously resolving fastest execution arrays
    const vitals = await VitalSign.find({
      userId: req.user._id,
      timestamp: { $gte: start, $lte: end }
    }).sort({ timestamp: 1 });

    const activities = await Activity.find({
      userId: req.user._id,
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });

    // Store log reference to historical queries metadata document safely
    const reportMetadata = await Report.create({
      userId: req.user._id,
      format: formatType,
      dateRange: { startDate: start, endDate: end }
    });

    if (formatType === 'pdf') {
       generatePDFReport(res, user, vitals, activities, start, end, reportMetadata._id);
    } else if (formatType === 'csv') {
       generateCSVReport(res, user, vitals, activities, start, end, reportMetadata._id);
    } else {
       return res.status(400).json({ message: 'Invalid format defined! Expects strictly ONLY "pdf" or "csv"' });
    }

  } catch (error) {
    next(error);
  }
};

// @desc    Get list of previously generated historical metadata reports
// @route   GET /api/reports/history
// @access  Private
const getReportHistory = async (req, res, next) => {
  try {
    const reports = await Report.find({ userId: req.user._id }).sort({ createdAt: -1 });
    
    // Explicit transformation extracting solely the requested interface formats 
    const formattedMetaArray = reports.map(r => ({
      reportId: r._id,
      generatedAt: r.createdAt,
      dateRange: r.dateRange,
      format: r.format
    }));

    res.status(200).json(formattedMetaArray);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateReport,
  getReportHistory
};
