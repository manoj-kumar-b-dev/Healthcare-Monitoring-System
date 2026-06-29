const PDFDocument = require('pdfkit');

const C = {
  navy: '#16324F', blue: '#2E6F9E', teal: '#168C8C', green: '#2F855A',
  amber: '#B7791F', red: '#C53030', ink: '#243447', muted: '#64748B',
  line: '#D7E2EA', pale: '#F3F8FB', white: '#FFFFFF'
};
const P = { w: 612, h: 792, m: 42, cw: 528 };
const num = (v, fallback = 0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
const avg = values => values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
const date = value => new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
const dateTime = value => new Intl.DateTimeFormat('en-US', {
  year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
}).format(new Date(value));
const abnormal = vital => Object.values(vital.anomalyFlags || {}).some(Boolean);
const stats = values => {
  const clean = values.map(Number).filter(Number.isFinite);
  return { min: clean.length ? Math.min(...clean) : 0, max: clean.length ? Math.max(...clean) : 0, avg: avg(clean) };
};

const scheduledDoses = (reminder, start, end) => {
  if (reminder.frequency === 'As Needed') return 0;
  const from = new Date(Math.max(new Date(reminder.startDate), start));
  const to = new Date(Math.min(new Date(reminder.endDate), end));
  if (from > to) return 0;
  const days = Math.floor((to - from) / 86400000) + 1;
  const times = Math.max(1, reminder.time?.length || 1);
  return reminder.frequency === 'Weekly' ? (Math.floor((days - 1) / 7) + 1) * times : days * times;
};

const buildAnalysis = ({ user, vitals, activities, reminders, alerts, emergencyAlerts, start, end }) => {
  const heartRate = stats(vitals.map(v => v.heartRate));
  const spo2 = stats(vitals.map(v => v.spo2));
  const temperature = stats(vitals.map(v => v.temperature));
  const systolic = stats(vitals.map(v => v.bloodPressureSystolic).filter(Number.isFinite));
  const diastolic = stats(vitals.map(v => v.bloodPressureDiastolic).filter(Number.isFinite));
  const glucose = stats(vitals.map(v => v.bloodGlucose).filter(Number.isFinite));
  const abnormalCount = vitals.filter(abnormal).length;
  const normalCount = vitals.length - abnormalCount;
  const abnormalPercent = vitals.length ? abnormalCount / vitals.length * 100 : 0;
  const totalAlerts = abnormalCount + alerts.length + emergencyAlerts.length;
  let riskLevel = 'Low';
  if (abnormalPercent >= 30 || emergencyAlerts.some(a => ['failed', 'partial', 'pending'].includes(a.status))) riskLevel = 'High';
  else if (abnormalPercent >= 10 || totalAlerts) riskLevel = 'Moderate';
  const overallStatus = !vitals.length ? 'Insufficient Data'
    : riskLevel === 'Low' ? 'Stable' : riskLevel === 'Moderate' ? 'Needs Attention' : 'Clinical Review Recommended';

  const totalSteps = activities.reduce((s, a) => s + num(a.steps), 0);
  const totalDistance = activities.reduce((s, a) => s + num(a.distance), 0);
  const totalCalories = activities.reduce((s, a) => s + num(a.caloriesBurned), 0);
  const averageSteps = totalSteps / Math.max(1, activities.length);
  const goal = num(user.settings?.dailyStepGoal, 10000);
  const activityLevel = averageSteps >= goal ? 'Highly Active' : averageSteps >= goal * .7 ? 'Active'
    : averageSteps >= goal * .4 ? 'Lightly Active' : 'Low Activity';

  const elapsedEnd = new Date(Math.min(Date.now(), end.getTime()));
  const scheduled = reminders.reduce((s, r) => s + scheduledDoses(r, start, end), 0);
  const elapsed = reminders.reduce((s, r) => s + scheduledDoses(r, start, elapsedEnd), 0);
  const taken = Math.min(scheduled, reminders.filter(r => r.status === 'Completed')
    .reduce((s, r) => s + scheduledDoses(r, start, end), 0));
  const missed = Math.max(0, elapsed - taken);
  const compliance = elapsed ? taken / elapsed * 100 : 0;

  const recommendations = [];
  if (!vitals.length) recommendations.push('Collect regular vital-sign readings before drawing clinical conclusions.');
  if (heartRate.avg && (heartRate.avg < 60 || heartRate.avg > 100)) recommendations.push('Review the heart-rate pattern with a clinician, especially if symptoms are present.');
  if (spo2.avg && spo2.avg < 95) recommendations.push('Low average oxygen saturation warrants prompt clinical review and repeat measurement.');
  if (temperature.max >= 38) recommendations.push('Monitor fever, hydration, and symptoms; seek medical advice if fever persists.');
  if (abnormalPercent >= 10) recommendations.push('Discuss recurring abnormal readings and alerts with the treating clinician.');
  if (averageSteps < goal * .4) recommendations.push('Increase activity gradually as medically appropriate and according to the care plan.');
  if (missed) recommendations.push('Review medication reminders and confirm the prescribed schedule with the care team.');
  if (!recommendations.length) recommendations.push('Continue the current monitoring routine and follow the existing care plan.');
  return {
    heartRate, spo2, temperature, systolic, diastolic, glucose, abnormalCount, normalCount,
    abnormalPercent, normalPercent: vitals.length ? normalCount / vitals.length * 100 : 0,
    totalAlerts, riskLevel, overallStatus, totalSteps, totalDistance, totalCalories,
    averageSteps, activityLevel, scheduled, taken, missed, compliance, recommendations
  };
};

const addPage = doc => {
  doc.addPage({ size: 'LETTER', margins: { top: P.m, bottom: P.m, left: P.m, right: P.m } });
  doc.y = 62;
};
const ensure = (doc, height) => { if (doc.y + height > P.h - 58) addPage(doc); };
const box = (doc, x, y, w, h, fill, stroke = C.line, radius = 8) => {
  doc.roundedRect(x, y, w, h, radius).fillAndStroke(fill, stroke);
};
const heading = (doc, title, subtitle) => {
  ensure(doc, subtitle ? 58 : 42);
  const y = doc.y;
  doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(16).text(title, P.m, y, { width: P.cw });
  const ruleY = y + 25;
  doc.moveTo(P.m, ruleY).lineTo(P.w - P.m, ruleY).strokeColor(C.teal).lineWidth(1.5).stroke();
  doc.y = ruleY + 9;
  if (subtitle) {
    doc.fillColor(C.muted).font('Helvetica').fontSize(8.5).text(subtitle, P.m, doc.y, { width: P.cw });
    doc.y += 20;
  }
};
const cards = (doc, items) => {
  const gap = 8, cols = 3, w = (P.cw - gap * 2) / cols, h = 64;
  for (let offset = 0; offset < items.length; offset += cols) {
    ensure(doc, h + 10);
    const y = doc.y;
    items.slice(offset, offset + cols).forEach((item, col) => {
      const x = P.m + col * (w + gap);
      box(doc, x, y, w, h, item.fill || C.pale);
      doc.fillColor(item.color || C.navy).font('Helvetica-Bold').fontSize(14)
        .text(item.value, x + 10, y + 12, { width: w - 20, ellipsis: true, lineBreak: false });
      doc.fillColor(C.muted).font('Helvetica-Bold').fontSize(7.3)
        .text(item.label.toUpperCase(), x + 10, y + 39, { width: w - 20, lineBreak: false });
    });
    doc.y = y + h + 10;
  }
};
const table = (doc, headers, rows, widths, options = {}) => {
  const rh = options.rowHeight || 22, hh = 24;
  const header = () => {
    ensure(doc, hh + rh);
    const y = doc.y;
    let x = P.m;
    headers.forEach((label, i) => {
      doc.rect(x, y, widths[i], hh).fillAndStroke(C.navy, C.navy);
      doc.fillColor(C.white).font('Helvetica-Bold').fontSize(7.2)
        .text(label, x + 5, y + 8, { width: widths[i] - 10, align: options.align?.[i] || 'left' });
      x += widths[i];
    });
    doc.y = y + hh;
  };
  header();
  rows.forEach((row, ri) => {
    if (doc.y + rh > P.h - 58) { addPage(doc); header(); }
    const y = doc.y;
    let x = P.m;
    row.forEach((cell, i) => {
      doc.rect(x, y, widths[i], rh).fillAndStroke(ri % 2 ? C.white : C.pale, C.line);
      doc.fillColor(options.color?.(cell, i, row) || C.ink).font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(options.fontSize || 7.3).text(String(cell ?? '-'), x + 5, y + 7, {
          width: widths[i] - 10, align: options.align?.[i] || 'left', ellipsis: true, lineBreak: false
        });
      x += widths[i];
    });
    doc.y = y + rh;
  });
  doc.moveDown(.8);
};
const chart = (doc, title, data, accessor, options = {}) => {
  ensure(doc, 184);
  const x = P.m, y = doc.y, w = P.cw, h = 160;
  box(doc, x, y, w, h, C.white);
  doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(10).text(title, x + 12, y + 10);
  const area = { x: x + 42, y: y + 34, w: w - 58, h: 96 };
  const values = data.map(item => num(accessor(item)));
  const min = values.length ? Math.min(...values) : 0, max = values.length ? Math.max(...values) : 1;
  const pad = Math.max((max - min) * .12, options.pad || 1), lo = min - pad, hi = max + pad;
  for (let i = 0; i <= 4; i++) {
    const gy = area.y + area.h * i / 4;
    doc.moveTo(area.x, gy).lineTo(area.x + area.w, gy).strokeColor(C.line).lineWidth(.5).stroke();
    doc.fillColor(C.muted).font('Helvetica').fontSize(6.5)
      .text((hi - (hi - lo) * i / 4).toFixed(options.decimals || 0), x + 5, gy - 3, { width: 32, align: 'right' });
  }
  if (values.length > 1) {
    values.forEach((value, i) => {
      const px = area.x + area.w * i / (values.length - 1);
      const py = area.y + area.h - (value - lo) / (hi - lo || 1) * area.h;
      i ? doc.lineTo(px, py) : doc.moveTo(px, py);
    });
    doc.strokeColor(options.color || C.teal).lineWidth(2).stroke();
  } else {
    doc.fillColor(C.muted).font('Helvetica-Oblique').fontSize(9)
      .text(values.length ? 'One reading available.' : 'No readings available for this period.', area.x, area.y + 40, { width: area.w, align: 'center' });
  }
  if (data.length) {
    const getDate = item => item.timestamp || item.date;
    doc.fillColor(C.muted).font('Helvetica').fontSize(6.5)
      .text(date(getDate(data[0])), area.x, y + 137, { width: area.w / 2 })
      .text(date(getDate(data[data.length - 1])), area.x + area.w / 2, y + 137, { width: area.w / 2, align: 'right' });
  }
  doc.y = y + h + 12;
};
const bullets = (doc, items) => items.forEach(item => {
  ensure(doc, 32);
  const y = doc.y;
  doc.circle(P.m + 5, y + 6, 3).fill(C.teal);
  doc.fillColor(C.ink).font('Helvetica').fontSize(9).text(item, P.m + 16, y, { width: P.cw - 16, lineGap: 2 });
  doc.moveDown(.5);
});
const cover = (doc, user, start, end, generatedAt, reportId) => {
  doc.rect(0, 0, P.w, P.h).fill('#EDF7FA');
  doc.rect(0, 0, P.w, 210).fill(C.navy);
  doc.circle(306, 128, 46).fill(C.white);
  doc.roundedRect(297, 93, 18, 70, 4).fill(C.teal);
  doc.roundedRect(271, 119, 70, 18, 4).fill(C.teal);
  doc.fillColor(C.white).font('Helvetica-Bold').fontSize(11).text('HEALTHCARE MONITORING SYSTEM', 42, 38, { characterSpacing: 1.2 });
  doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(28).text('Clinical Health Report', 72, 270, { width: 468, align: 'center' });
  doc.fillColor(C.teal).font('Helvetica').fontSize(12).text('Patient Monitoring and Wellness Analysis', 72, 310, { width: 468, align: 'center' });
  box(doc, 96, 365, 420, 205, C.white);
  [['PATIENT NAME', user.name || user.username || 'Patient'], ['REPORT DATE RANGE', `${date(start)} - ${date(end)}`],
    ['GENERATED DATE', dateTime(generatedAt)], ['REPORT ID', String(reportId)]].forEach(([label, value], i) => {
    const y = 394 + i * 43;
    doc.fillColor(C.muted).font('Helvetica-Bold').fontSize(7.5).text(label, 122, y);
    doc.fillColor(C.ink).font('Helvetica-Bold').fontSize(11).text(value, 122, y + 13, { width: 368 });
    if (i < 3) doc.moveTo(122, y + 34).lineTo(490, y + 34).strokeColor(C.line).lineWidth(.6).stroke();
  });
  doc.fillColor(C.muted).font('Helvetica').fontSize(8)
    .text('Confidential medical information. For the patient and authorized care professionals.', 72, 672, { width: 468, align: 'center' });
};
const pageFurniture = (doc, generatedAt) => {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    if (i) {
      doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(8).text('HEALTHCARE MONITORING SYSTEM', P.m, 24, { width: 300 });
      doc.moveTo(P.m, 39).lineTo(P.w - P.m, 39).strokeColor(C.line).lineWidth(.7).stroke();
    }
    doc.moveTo(P.m, 744).lineTo(P.w - P.m, 744).strokeColor(C.line).lineWidth(.7).stroke();
    doc.fillColor(C.muted).font('Helvetica').fontSize(7)
      .text(`Generated ${date(generatedAt)}`, P.m, 754, { width: 200, lineBreak: false })
      .text(`Page ${i + 1} of ${range.count}`, P.w - P.m - 120, 754, { width: 120, align: 'right', lineBreak: false });
  }
};

const generateHealthReportPdf = (res, payload) => {
  const { user, vitals, activities, reminders, alerts, emergencyAlerts, start, end, reportId } = payload;
  const generatedAt = new Date(), a = buildAnalysis(payload);
  const doc = new PDFDocument({
    autoFirstPage: false, bufferPages: true, size: 'LETTER',
    margins: { top: P.m, bottom: P.m, left: P.m, right: P.m },
    info: { Title: `Healthcare Monitoring Report - ${user.name || user.username}`, Author: 'Healthcare Monitoring System' }
  });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=health-report-${reportId}.pdf`);
  doc.pipe(res);

  addPage(doc); cover(doc, user, start, end, generatedAt, reportId);
  addPage(doc); heading(doc, 'Executive Summary', 'A concise review of the selected monitoring period.');
  cards(doc, [
    { label: 'Overall Health Status', value: a.overallStatus, color: a.riskLevel === 'High' ? C.red : C.green },
    { label: 'Risk Level', value: a.riskLevel, color: a.riskLevel === 'High' ? C.red : a.riskLevel === 'Moderate' ? C.amber : C.green },
    { label: 'Number of Alerts', value: String(a.totalAlerts), color: a.totalAlerts ? C.amber : C.green },
    { label: 'Average Heart Rate', value: `${a.heartRate.avg.toFixed(1)} bpm` },
    { label: 'Average SpO2', value: `${a.spo2.avg.toFixed(1)}%` },
    { label: 'Average Temperature', value: `${a.temperature.avg.toFixed(1)} C` }
  ]);
  heading(doc, 'Vital Sign Summary');
  const vitalRows = [
    ['Heart Rate', 'bpm', a.heartRate.min.toFixed(0), a.heartRate.max.toFixed(0), a.heartRate.avg.toFixed(1)],
    ['SpO2', '%', a.spo2.min.toFixed(0), a.spo2.max.toFixed(0), a.spo2.avg.toFixed(1)],
    ['Temperature', 'C', a.temperature.min.toFixed(1), a.temperature.max.toFixed(1), a.temperature.avg.toFixed(1)]
  ];
  if (vitals.some(v => Number.isFinite(v.bloodPressureSystolic))) vitalRows.push(
    ['Blood Pressure', 'mmHg', `${a.systolic.min.toFixed(0)}/${a.diastolic.min.toFixed(0)}`, `${a.systolic.max.toFixed(0)}/${a.diastolic.max.toFixed(0)}`, `${a.systolic.avg.toFixed(0)}/${a.diastolic.avg.toFixed(0)}`]
  );
  if (vitals.some(v => Number.isFinite(v.bloodGlucose))) vitalRows.push(
    ['Blood Glucose', 'mg/dL', a.glucose.min.toFixed(0), a.glucose.max.toFixed(0), a.glucose.avg.toFixed(1)]
  );
  table(doc, ['Vital Sign', 'Unit', 'Minimum', 'Maximum', 'Average'], vitalRows, [170, 78, 92, 92, 96], { align: ['left', 'center', 'center', 'center', 'center'] });
  heading(doc, 'Clinical Summary', 'For clinician review; this report supports, but does not replace, clinical assessment.');
  const summary = vitals.length
    ? `${vitals.length} readings were reviewed. ${a.normalPercent.toFixed(1)}% were within configured ranges and ${a.abnormalPercent.toFixed(1)}% were flagged. Overall status is ${a.overallStatus.toLowerCase()} with ${a.riskLevel.toLowerCase()} calculated risk. Average heart rate was ${a.heartRate.avg.toFixed(1)} bpm, SpO2 ${a.spo2.avg.toFixed(1)}%, and temperature ${a.temperature.avg.toFixed(1)} C. Correlate these findings with symptoms, diagnoses, medications, and measurement conditions.`
    : 'No vital-sign readings were recorded in the selected period. Clinical interpretation is limited; review device connectivity and monitoring adherence.';
  const summaryHeight = doc.heightOfString(summary, { width: P.cw - 28, lineGap: 3 }) + 28;
  ensure(doc, summaryHeight + 12);
  const summaryY = doc.y; box(doc, P.m, summaryY, P.cw, summaryHeight, C.pale);
  doc.fillColor(C.ink).font('Helvetica').fontSize(9.2).text(summary, P.m + 14, summaryY + 14, { width: P.cw - 28, lineGap: 3 });
  doc.y = summaryY + summaryHeight + 12;

  addPage(doc); heading(doc, 'Vital Sign Trends', 'Charts are chronological and use all readings in the selected period.');
  chart(doc, 'Heart Rate Trends (bpm)', vitals, v => v.heartRate, { color: C.red, pad: 5 });
  chart(doc, 'SpO2 Trends (%)', vitals, v => v.spo2, { color: C.blue, pad: 1 });
  chart(doc, 'Temperature Trends (C)', vitals, v => v.temperature, { color: C.amber, pad: .2, decimals: 1 });
  chart(doc, 'Activity Trends (daily steps)', activities, v => v.steps, { color: C.teal, pad: 500 });

  addPage(doc); heading(doc, 'Health Analysis');
  cards(doc, [
    { label: 'Normal Readings', value: `${a.normalPercent.toFixed(1)}%`, color: C.green },
    { label: 'Abnormal Readings', value: `${a.abnormalPercent.toFixed(1)}%`, color: a.abnormalCount ? C.red : C.green },
    { label: 'Alert Statistics', value: String(a.totalAlerts), color: a.totalAlerts ? C.amber : C.green }
  ]);
  table(doc, ['Alert Type', 'Count', 'Interpretation'], [
    ['Abnormal vital readings', a.abnormalCount, a.abnormalCount ? 'Review flagged measurements' : 'No flagged measurements'],
    ['System alerts', alerts.length, alerts.some(item => item.status === 'active') ? 'Active alerts remain' : 'No active system alerts'],
    ['Emergency alerts', emergencyAlerts.length, emergencyAlerts.length ? 'See emergency history below' : 'No emergency events']
  ], [210, 80, 238], { align: ['left', 'center', 'left'] });
  doc.fillColor(C.navy).font('Helvetica-Bold').fontSize(11)
    .text('Health Recommendations', P.m, doc.y, { width: P.cw });
  doc.moveDown(.5);
  bullets(doc, a.recommendations);

  heading(doc, 'Medicine Compliance', 'Derived from reminder status because individual dose-event logging is not available.');
  cards(doc, [
    { label: 'Scheduled Doses', value: String(a.scheduled) },
    { label: 'Taken Doses', value: String(a.taken), color: C.green },
    { label: 'Missed Doses', value: String(a.missed), color: a.missed ? C.red : C.green },
    { label: 'Compliance Percentage', value: a.scheduled ? `${a.compliance.toFixed(1)}%` : 'N/A', color: a.compliance >= 80 ? C.green : C.amber }
  ]);
  const reminderRows = reminders.slice(0, 8).map(r => [r.medicineName, r.dosage, r.frequency, r.status]);
  if (reminderRows.length) table(doc, ['Medicine', 'Dosage', 'Frequency', 'Status'], reminderRows, [155, 95, 160, 118]);
  else { doc.fillColor(C.muted).font('Helvetica-Oblique').fontSize(9).text('No medication reminders overlap this period.'); doc.moveDown(); }

  addPage(doc); heading(doc, 'Activity Analysis');
  cards(doc, [
    { label: 'Steps', value: a.totalSteps.toLocaleString('en-US') },
    { label: 'Distance', value: `${a.totalDistance.toFixed(2)} km` },
    { label: 'Calories', value: `${a.totalCalories.toFixed(0)} kcal` },
    { label: 'Activity Level', value: a.activityLevel, color: a.activityLevel === 'Low Activity' ? C.amber : C.green }
  ]);
  const activityRows = activities.slice(-10).reverse().map(item => [
    date(item.date), num(item.steps).toLocaleString('en-US'), num(item.distance).toFixed(2), num(item.caloriesBurned).toFixed(0)
  ]);
  table(doc, ['Date', 'Steps', 'Distance (km)', 'Calories'], activityRows.length ? activityRows : [['No activity data', '-', '-', '-']], [170, 120, 120, 118], { align: ['left', 'right', 'right', 'right'] });

  heading(doc, 'Emergency Alerts');
  const logs = emergencyAlerts.flatMap(item => item.deliveryLogs || []);
  const delivered = logs.filter(log => log.status === 'success').length;
  cards(doc, [
    { label: 'Alerts Generated', value: String(emergencyAlerts.length), color: emergencyAlerts.length ? C.red : C.green },
    { label: 'Contacts Configured', value: String(user.emergencyContacts?.length || 0) },
    { label: 'Notifications Delivered', value: `${delivered}/${logs.length}`, color: logs.length && delivered < logs.length ? C.amber : C.green }
  ]);
  const emergencyRows = emergencyAlerts.slice(0, 10).map(item => [
    dateTime(item.createdAt), item.emergencyType, item.status,
    (item.deliveryLogs || []).map(log => `${log.contactName}: ${log.status}`).join(', ') || 'No delivery log'
  ]);
  table(doc, ['Date', 'Emergency Type', 'Status', 'Contact Notification'], emergencyRows.length ? emergencyRows : [['-', 'No emergency alerts', '-', '-']], [128, 140, 70, 190], { fontSize: 7, rowHeight: 24 });

  addPage(doc); heading(doc, 'Recent Readings', 'The 10 most recent readings replace the full raw-data export.');
  const recent = vitals.slice(-10).reverse().map(v => [
    dateTime(v.timestamp), num(v.heartRate).toFixed(0), num(v.spo2).toFixed(0), num(v.temperature).toFixed(1), abnormal(v) ? 'Flagged' : 'Normal'
  ]);
  table(doc, ['Date / Time', 'HR', 'SpO2', 'Temp C', 'Status'], recent.length ? recent : [['No readings', '-', '-', '-', '-']], [188, 72, 72, 84, 112], {
    align: ['left', 'center', 'center', 'center', 'center'],
    color: (cell, i) => i === 4 ? (cell === 'Flagged' ? C.red : C.green) : null
  });
  heading(doc, 'Report Notes');
  bullets(doc, [
    'System-generated risk levels are screening aids and are not diagnoses.',
    'Unexpected or severe symptoms require prompt professional medical evaluation regardless of report status.',
    'Measurement quality can be affected by device placement, motion, calibration, and connectivity.',
    'Medication compliance reflects reminder records, not pharmacy dispensing or independently verified ingestion.'
  ]);
  pageFurniture(doc, generatedAt);
  doc.end();
};

module.exports = { generateHealthReportPdf, buildAnalysis };
