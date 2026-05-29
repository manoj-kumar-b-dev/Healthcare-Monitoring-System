const EmergencyAlertHistory = require('../models/EmergencyAlertHistory');
const { sendEmailAlert }    = require('./emailService');
const { sendSMSAlert }      = require('./smsService');

/**
 * Builds the emergency email HTML body.
 * Pure function — no I/O, no side effects.
 */
const buildEmailHtml = (user, emergencyType, vitals, mapsLink, timestamp) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
    <h2 style="color: #d9534f; text-align: center;">🚨 EMERGENCY HEALTH ALERT 🚨</h2>
    <hr />
    <p><strong>Patient:</strong> ${user.username}</p>
    <p><strong>Emergency Type:</strong> ${emergencyType}</p>

    <h3>Current Vitals:</h3>
    <ul>
      <li><strong>Heart Rate:</strong> ${vitals?.heartRate ?? 'N/A'} bpm</li>
      <li><strong>SpO₂:</strong> ${vitals?.spo2 ?? 'N/A'}%</li>
      <li><strong>Temperature:</strong> ${vitals?.temperature ?? 'N/A'}°C</li>
      <li><strong>Health Score:</strong> ${vitals?.healthScore ?? 'N/A'}/100</li>
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
 * Dispatches all notifications for ONE contact in parallel (email + SMS at the same time).
 * @returns {Promise<object[]>} delivery log entries for this contact
 */
const dispatchContactNotifications = async (contact, subject, emailHtml, smsText) => {
  const tasks = [];

  if (contact.email) {
    tasks.push(
      sendEmailAlert(contact.email, subject, emailHtml).then((success) => ({
        contactName:    contact.name,
        contactMethod:  'email',
        contactAddress: contact.email,
        status: success ? 'success' : 'failed',
        error:  success ? undefined : 'Email sending failed',
      }))
    );
  }

  if (contact.phone) {
    tasks.push(
      sendSMSAlert(contact.phone, smsText).then((success) => ({
        contactName:    contact.name,
        contactMethod:  'sms',
        contactAddress: contact.phone,
        status: success ? 'success' : 'failed',
        error:  success ? undefined : 'SMS sending failed',
      }))
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

  const timestamp  = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const subject    = `🚨 EMERGENCY ALERT: ${user.username}`;
  const emailHtml  = buildEmailHtml(user, resolvedType, vitals, mapsLink, timestamp);
  const smsText    = `🚨 EMERGENCY: ${user.username} — ${resolvedType}. HR: ${vitals?.heartRate ?? 'N/A'}, SpO2: ${vitals?.spo2 ?? 'N/A'}. Loc: ${mapsLink}. Please respond immediately.`;

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
