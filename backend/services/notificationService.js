const EmergencyAlertHistory = require('../models/EmergencyAlertHistory');
const { sendEmailAlert }    = require('./emailService');
const { sendSMSAlert }      = require('./smsService');

/**
 * Builds the emergency email HTML body.
 * Pure function — no I/O, no side effects.
 */
const buildEmailHtml = (user, emergencyType, vitals, mapsLink, timestamp, alertText, severity) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
    <h2 style="color: #d9534f; text-align: center;">🚨 EMERGENCY HEALTH ALERT (${severity}) 🚨</h2>
    <hr />
    <p><strong>Patient:</strong> ${user.name || user.username}</p>
    <p><strong>Alert Details:</strong></p>
    <p style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; font-weight: bold;">
      ${alertText}
    </p>

    <h3>Current Vitals:</h3>
    <ul>
      <li><strong>Heart Rate:</strong> ${vitals?.heartRate ?? 'N/A'} bpm (Normal: 60-100)</li>
      <li><strong>SpO₂:</strong> ${vitals?.spo2 ?? 'N/A'}% (Normal: &gt;=95)</li>
      <li><strong>Temperature:</strong> ${vitals?.temperature ?? 'N/A'}°C (Normal: 36.0-37.5)</li>
      <li><strong>Blood Pressure:</strong> ${vitals?.bloodPressureSystolic && vitals?.bloodPressureDiastolic ? `${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic} mmHg` : 'N/A'} (Normal: 90-140/60-90)</li>
      <li><strong>Blood Glucose:</strong> ${vitals?.bloodGlucose ? `${vitals.bloodGlucose} mg/dL` : 'N/A'} (Normal: 70-180)</li>
    </ul>

    <h3>Location:</h3>
    <p>
      <a href="${mapsLink}" target="_blank" style="color: #0275d8; text-decoration: none;">
        ${mapsLink !== 'Location not provided' ? 'View on Google Maps' : 'Location not provided'}
      </a>
    </p>

    <h3>Time:</h3>
    <p>${timestamp}</p>
    <hr />
    <p style="color: #d9534f; font-weight: bold;">
      Please contact the patient immediately and consider calling emergency services if necessary.
    </p>
  </div>
`;

/**
 * Formats a personalized emergency message.
 */
const generateAlertMessage = (user, vitals, location) => {
  const anomalies = [];
  const name = user.name || user.username;
  
  const isFieldInvalid = (val) => {
    if (val === null || val === undefined || val === '') return true;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === 'N/A' || trimmed === 'null' || trimmed === 'undefined' || trimmed === '') return true;
    }
    const num = Number(val);
    if (Number.isNaN(num) || num === 0) return true;
    return false;
  };

  if (vitals) {
    // 1. Heart Rate
    if (!isFieldInvalid(vitals.heartRate)) {
      const hr = Number(vitals.heartRate);
      if (hr > 100 || hr < 60) {
        anomalies.push(`heart rate has reached ${hr} BPM (safe threshold: 60-100 BPM)`);
      }
    }
    // 2. SpO2
    if (!isFieldInvalid(vitals.spo2)) {
      const spo2 = Number(vitals.spo2);
      if (spo2 < 95) {
        anomalies.push(`blood oxygen level (SpO2) has reached ${spo2}% (safe threshold: >=95%)`);
      }
    }
    // 3. Temperature
    if (!isFieldInvalid(vitals.temperature)) {
      const temp = Number(vitals.temperature);
      if (temp > 37.5 || temp < 36.0) {
        anomalies.push(`body temperature has reached ${temp}°C (safe threshold: 36.0-37.5°C)`);
      }
    }
    // 4. Blood Pressure
    const hasSys = vitals.bloodPressureSystolic !== undefined && vitals.bloodPressureSystolic !== null && vitals.bloodPressureSystolic !== '' && vitals.bloodPressureSystolic !== 'N/A' && vitals.bloodPressureSystolic !== 'null' && vitals.bloodPressureSystolic !== 'undefined';
    const hasDia = vitals.bloodPressureDiastolic !== undefined && vitals.bloodPressureDiastolic !== null && vitals.bloodPressureDiastolic !== '' && vitals.bloodPressureDiastolic !== 'N/A' && vitals.bloodPressureDiastolic !== 'null' && vitals.bloodPressureDiastolic !== 'undefined';
    
    if (hasSys && hasDia) {
      if (!isFieldInvalid(vitals.bloodPressureSystolic) && !isFieldInvalid(vitals.bloodPressureDiastolic)) {
        const sys = Number(vitals.bloodPressureSystolic);
        const dia = Number(vitals.bloodPressureDiastolic);
        if (sys > 140 || sys < 90 || dia > 90 || dia < 60) {
          anomalies.push(`blood pressure has reached ${sys}/${dia} mmHg (safe threshold: 90-140/60-90 mmHg)`);
        }
      }
    }
    // 5. Blood Glucose
    if (!isFieldInvalid(vitals.bloodGlucose)) {
      const bg = Number(vitals.bloodGlucose);
      if (bg > 180 || bg < 70) {
        anomalies.push(`blood glucose level has reached ${bg} mg/dL (safe threshold: 70-180 mg/dL)`);
      }
    }
  }

  if (anomalies.length === 0) {
    return {
      text: "No valid vital sign data available.",
      severity: 'WARNING'
    };
  }

  const anomaliesText = anomalies.join(' and ');
  const userTimezone = user.timezone || 'Asia/Kolkata';
  
  let timeStr;
  try {
    timeStr = new Date().toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      timeZone: userTimezone 
    });
  } catch (err) {
    timeStr = new Date().toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      timeZone: 'Asia/Kolkata' 
    });
  }

  let locText = '';
  if (location && location.latitude && location.longitude) {
    locText = ` Location: https://maps.google.com/?q=${location.latitude},${location.longitude}.`;
  }

  const safeSpo2 = !isFieldInvalid(vitals?.spo2) ? Number(vitals.spo2) : 98;
  const safeHr = !isFieldInvalid(vitals?.heartRate) ? Number(vitals.heartRate) : 75;
  const severity = (safeSpo2 < 90 || safeHr > 120 || safeHr < 50) ? 'CRITICAL' : 'WARNING';

  return {
    text: `Emergency Alert (Severity: ${severity}): ${name}'s ${anomaliesText}, which exceeds the safe threshold. Immediate attention may be required. Detected at ${timeStr}.${locText}`,
    severity
  };
};

/**
 * Dispatches all notifications for ONE contact in parallel (email + SMS at the same time).
 * @returns {Promise<object[]>} delivery log entries for this contact
 */
const dispatchContactNotifications = async (contact, subject, emailHtml, smsText) => {
  const tasks = [];

  // Validate contact has at least one delivery method
  if (!contact.email && !contact.phone) {
    console.warn(`[NotificationService] ⚠️  Contact "${contact.name}" has no email or phone — skipping.`);
    return [{
      contactName:    contact.name,
      contactMethod:  'none',
      contactAddress: 'N/A',
      status:         'failed',
      error:          'Contact has no valid email or phone number',
    }];
  }

  if (contact.email) {
    tasks.push(
      sendEmailAlert(contact.email, subject, emailHtml)
        .then((success) => {
          if (!success) {
            console.error(`[NotificationService] ❌ Failed to send email alert to contact: ${contact.name} (${contact.email})`);
          }
          return {
            contactName:    contact.name,
            contactMethod:  'email',
            contactAddress: contact.email,
            status: success ? 'success' : 'failed',
            error:  success ? undefined : 'Email delivery failed — check Resend API configuration',
          };
        })
        .catch((err) => {
          console.error(`[NotificationService] ❌ Unexpected error sending email to ${contact.name}:`, err);
          return {
            contactName:    contact.name,
            contactMethod:  'email',
            contactAddress: contact.email,
            status:         'failed',
            error:          `Unexpected email error: ${err.message}`,
          };
        })
    );
  }

  if (contact.phone) {
    tasks.push(
      sendSMSAlert(contact.phone, smsText)
        .then((success) => {
          if (!success) {
            console.error(`[NotificationService] ❌ Failed to send SMS alert to contact: ${contact.name} (${contact.phone})`);
          }
          return {
            contactName:    contact.name,
            contactMethod:  'sms',
            contactAddress: contact.phone,
            status: success ? 'success' : 'failed',
            error:  success ? undefined : 'SMS delivery failed — check Twilio account configuration',
          };
        })
        .catch((err) => {
          console.error(`[NotificationService] ❌ Unexpected error sending SMS to ${contact.name}:`, err);
          return {
            contactName:    contact.name,
            contactMethod:  'sms',
            contactAddress: contact.phone,
            status:         'failed',
            error:          `Unexpected SMS error: ${err.message}`,
          };
        })
    );
  }

  return Promise.all(tasks);
};

/**
 * Sends emergency notifications to ALL contacts in parallel.
 *
 * IMPORTANT: This function now accepts the `user` object directly (from req.user
 * already set by auth middleware). This eliminates a duplicate User.findById()
 * DB round-trip that previously occurred on every SOS call.
 *
 * @param {object} user - The authenticated user object (from req.user)
 * @param {object} emergencyData - { emergencyType, vitals, location }
 * @returns {Promise<object>} { success, logs }
 */
const sendEmergencyNotification = async (user, emergencyData) => {
  const t0 = Date.now();

  const contacts = user.emergencyContacts || [];
  if (contacts.length === 0) {
    console.warn(`[NotificationService] No emergency contacts for user ${user._id}`);
    return { success: false, message: 'No emergency contacts found', logs: [] };
  }

  const { emergencyType, vitals, location } = emergencyData;
  const resolvedType = emergencyType || 'Critical Health Alert';

  const mapsLink = (location?.latitude && location?.longitude)
    ? `https://maps.google.com/?q=${location.latitude},${location.longitude}`
    : 'Location not provided';

  const userTimezone = user.timezone || 'Asia/Kolkata';
  const timestamp  = new Date().toLocaleString('en-IN', { timeZone: userTimezone });
  
  // Format the warning text precisely
  const alertInfo = generateAlertMessage(user, vitals, location);
  const subject    = `🚨 EMERGENCY ALERT (${alertInfo.severity}): ${user.name || user.username}`;
  const emailHtml  = buildEmailHtml(user, resolvedType, vitals, mapsLink, timestamp, alertInfo.text, alertInfo.severity);
  const smsText    = alertInfo.text;

  console.log(`[NotificationService] Dispatching to ${contacts.length} contact(s) in parallel...`);

  // ── PARALLEL DISPATCH ──────────────────────────────────────────────────────
  // All contacts notified simultaneously. Previously each contact's email + SMS
  // was awaited sequentially, multiplying latency by the number of contacts.
  const perContactResults = await Promise.all(
    contacts.map((contact) =>
      dispatchContactNotifications(contact, subject, emailHtml, smsText)
    )
  );

  // Flatten nested arrays: [[log, log], [log]] → [log, log, log]
  const deliveryLogs = perContactResults.flat();

  const successCount = deliveryLogs.filter((l) => l.status === 'success').length;
  const elapsed = Date.now() - t0;
  console.log(`[NotificationService] ✅ Done — ${successCount}/${deliveryLogs.length} delivered in ${elapsed}ms`);

  return {
    success: true,
    message: 'Emergency notifications processed',
    logs: deliveryLogs,
    alertText: alertInfo.text,
    severity: alertInfo.severity
  };
};

/**
 * Updates an existing EmergencyAlertHistory document with delivery logs.
 * Called after background dispatch completes.
 */
const updateHistoryWithLogs = async (historyId, logs) => {
  try {
    const successCount = logs.filter((l) => l.status === 'success').length;
    const docStatus = successCount === logs.length
      ? 'completed'
      : successCount > 0
        ? 'partial'
        : 'failed';

    await EmergencyAlertHistory.findByIdAndUpdate(historyId, {
      deliveryLogs: logs,
      status: docStatus,
    });
    console.log(`[NotificationService] History ${historyId} updated → status: ${docStatus}`);
  } catch (err) {
    console.error('[NotificationService] Failed to update history:', err.message);
  }
};

module.exports = { sendEmergencyNotification, updateHistoryWithLogs };
