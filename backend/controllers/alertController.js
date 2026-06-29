const VitalSign = require('../models/VitalSign');
const User = require('../models/User');
const EmergencyAlertHistory = require('../models/EmergencyAlertHistory');
const { sendEmergencyNotification, updateHistoryWithLogs } = require('../services/notificationService');

// ─── Background Dispatch ─────────────────────────────────────────────────────
/**
 * Fires notifications AFTER the HTTP response has already been sent.
 * This is intentionally NOT awaited in the route handler — it runs in the
 * background so the user receives an immediate confirmation.
 *
 * @param {object} user          - The authenticated user (from req.user)
 * @param {object} emergencyData - { emergencyType, vitals, location }
 * @param {string} historyId     - MongoDB ID of the pre-created history doc
 */
const dispatchInBackground = (user, emergencyData, historyId) => {
  const t0 = Date.now();
  console.log(`[AlertController] 🔄 Background dispatch started for history: ${historyId}`);

  sendEmergencyNotification(user, emergencyData)
    .then(({ logs }) => {
      const elapsed = Date.now() - t0;
      console.log(`[AlertController] ✅ Background dispatch complete in ${elapsed}ms`);
      // Persist delivery results back to the history record
      return updateHistoryWithLogs(historyId, logs);
    })
    .catch((err) => {
      console.error('[AlertController] ❌ Background dispatch error:', err.message);
      // Update history to failed state so it's visible in admin logs
      updateHistoryWithLogs(historyId, []).catch(() => {});
    });
};

// ─── Validation Helpers ──────────────────────────────────────────────────────

/**
 * Validates that emergency contacts exist and have valid data
 */
const validateEmergencyContacts = (contacts, userId) => {
  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    console.warn(`[AlertController] ⚠️  User ${userId} has NO emergency contacts configured.`);
    return {
      isValid: false,
      reason: 'No emergency contacts configured'
    };
  }

  const validContacts = contacts.filter(c => {
    const hasEmail = c.email && typeof c.email === 'string' && c.email.trim().length > 0;
    const hasPhone = c.phone && typeof c.phone === 'string' && c.phone.trim().length > 0;
    return hasEmail || hasPhone;
  });

  if (validContacts.length === 0) {
    console.warn(`[AlertController] ⚠️  User ${userId} has ${contacts.length} contacts but NONE have valid email/phone.`);
    return {
      isValid: false,
      reason: 'Emergency contacts exist but have no valid email or phone numbers',
      invalidCount: contacts.length
    };
  }

  console.log(`[AlertController] ✅ Contact validation passed - ${validContacts.length} valid contact(s) out of ${contacts.length}`);
  return {
    isValid: true,
    validContacts: validContacts,
    count: validContacts.length
  };
};

const validateVitalsForAlert = (vitals, userId) => {
  const timestamp = new Date().toISOString();
  const logFailure = (field, reason) => {
    console.warn(`[AlertController] ❌ Validation Failure - Field: ${field}, Reason: ${reason}, User ID: ${userId}, Timestamp: ${timestamp}`);
    return {
      isValid: false,
      reason: `${field} validation failed: ${reason}`,
      missingField: field
    };
  };

  if (!vitals) {
    return logFailure('vitals', 'No vital sign data exists.');
  }

  if (typeof vitals !== 'object' || Object.keys(vitals).length === 0) {
    return logFailure('vitals', 'Vital sign data is empty.');
  }

  const { heartRate, spo2, temperature, bloodPressureSystolic, bloodPressureDiastolic, bloodGlucose } = vitals;

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

  // 1. Validate Heart Rate (Mandatory)
  if (isFieldInvalid(heartRate)) {
    return logFailure('heartRate', 'Heart rate is missing, null, undefined, empty, non-numeric, or zero.');
  }

  // 2. Validate SpO2 (Mandatory)
  if (isFieldInvalid(spo2)) {
    return logFailure('spo2', 'SpO2 is missing, null, undefined, empty, non-numeric, or zero.');
  }

  // 3. Validate Temperature (Mandatory)
  if (isFieldInvalid(temperature)) {
    return logFailure('temperature', 'Temperature is missing, null, undefined, empty, non-numeric, or zero.');
  }

  // 4. Validate Blood Pressure (Optional - Skip if either is missing/null/undefined)
  let checkBP = true;
  if (
    bloodPressureSystolic === null || bloodPressureSystolic === undefined ||
    bloodPressureDiastolic === null || bloodPressureDiastolic === undefined ||
    bloodPressureSystolic === 'N/A' || bloodPressureDiastolic === 'N/A' ||
    bloodPressureSystolic === 'undefined' || bloodPressureDiastolic === 'undefined' ||
    bloodPressureSystolic === 'null' || bloodPressureDiastolic === 'null' ||
    bloodPressureSystolic === '' || bloodPressureDiastolic === ''
  ) {
    checkBP = false; // Skip BP analysis completely
  } else {
    const sysNum = Number(bloodPressureSystolic);
    const diaNum = Number(bloodPressureDiastolic);
    if (Number.isNaN(sysNum) || Number.isNaN(diaNum) || sysNum === 0 || diaNum === 0) {
      return logFailure('bloodPressure', 'Blood pressure values are invalid, non-numeric, or zero.');
    }
  }

  // 5. Validate Blood Glucose (Optional - Skip if missing/null/undefined)
  let checkBG = true;
  if (
    bloodGlucose === null || bloodGlucose === undefined ||
    bloodGlucose === 'N/A' || bloodGlucose === 'undefined' ||
    bloodGlucose === 'null' || bloodGlucose === ''
  ) {
    checkBG = false; // Skip BG analysis
  } else {
    const bgNum = Number(bloodGlucose);
    if (Number.isNaN(bgNum) || bgNum === 0) {
      return logFailure('bloodGlucose', 'Blood glucose value is invalid, non-numeric, or zero.');
    }
  }

  // Numeric range physical validation (sanity checks)
  const hrVal = Number(heartRate);
  const spo2Val = Number(spo2);
  const tempVal = Number(temperature);

  if (hrVal < 30 || hrVal > 250) {
    return logFailure('heartRate', `Heart rate value (${hrVal}) is physically invalid.`);
  }
  if (spo2Val < 50 || spo2Val > 100) {
    return logFailure('spo2', `SpO2 value (${spo2Val}) is physically invalid.`);
  }
  if (tempVal < 30 || tempVal > 45) {
    return logFailure('temperature', `Temperature value (${tempVal}) is physically invalid.`);
  }

  // Recency check
  if (vitals.timestamp) {
    const ageMs = Date.now() - new Date(vitals.timestamp).getTime();
    const tenMinutesMs = 10 * 60 * 1000;
    if (ageMs > tenMinutesMs) {
      return logFailure('vitals', `Vital sign readings are too old (${Math.round(ageMs / 1000 / 60)} minutes ago).`);
    }
  }

  return {
    isValid: true,
    checkBP,
    checkBG,
    cleanedVitals: {
      heartRate: hrVal,
      spo2: spo2Val,
      temperature: tempVal,
      bloodPressureSystolic: checkBP ? Number(bloodPressureSystolic) : undefined,
      bloodPressureDiastolic: checkBP ? Number(bloodPressureDiastolic) : undefined,
      bloodGlucose: checkBG ? Number(bloodGlucose) : undefined,
      healthScore: vitals.healthScore
    }
  };
};

const checkThresholdsExceeded = (vitals, checkBP, checkBG) => {
  const { heartRate, spo2, temperature, bloodPressureSystolic, bloodPressureDiastolic, bloodGlucose } = vitals;
  
  const heartRateExceeded = heartRate > 100 || heartRate < 60;
  const spo2Exceeded = spo2 < 95;
  const tempExceeded = temperature > 37.5 || temperature < 36.0;
  
  let bpExceeded = false;
  if (checkBP) {
    bpExceeded = bloodPressureSystolic > 140 || bloodPressureSystolic < 90 ||
                 bloodPressureDiastolic > 90 || bloodPressureDiastolic < 60;
  }
  
  let bgExceeded = false;
  if (checkBG) {
    bgExceeded = bloodGlucose > 180 || bloodGlucose < 70;
  }

  return {
    thresholdExceeded: heartRateExceeded || spo2Exceeded || tempExceeded || bpExceeded || bgExceeded,
    anomalies: {
      heartRateAnomaly: heartRateExceeded,
      spo2Anomaly: spo2Exceeded,
      temperatureAnomaly: tempExceeded,
      bloodPressureAnomaly: bpExceeded,
      bloodGlucoseAnomaly: bgExceeded
    }
  };
};

// ─── Reusable Helper to Process Emergency Alert ──────────────────────────────
const processEmergencyAlert = async (user, { emergencyType, vitals, location, bypassThreshold = false }) => {
  const COOLDOWN_PERIOD_MS = 15 * 60 * 1000; // 15 minutes cooldown
  let finalVitals = vitals;

  // Fetch fresh user from DB to avoid stale emergency contacts list (especially for long-lived socket sessions)
  let freshUser;
  try {
    freshUser = await User.findById(user._id);
    if (!freshUser) {
      console.error(`[AlertController] ❌ User not found for ID: ${user._id}`);
      return {
        success: false,
        message: 'User not found.',
        reason: 'USER_NOT_FOUND'
      };
    }
  } catch (userError) {
    console.error(`[AlertController] ❌ Failed to fetch user for alert:`, userError.message);
    return {
      success: false,
      message: 'Failed to retrieve user profile.',
      reason: 'DATABASE_ERROR'
    };
  }

  // 1. Data Retrieval Fallback: Fetch latest from database if not passed
  if (!finalVitals) {
    try {
      finalVitals = await VitalSign.findOne({ userId: freshUser._id }).sort({ timestamp: -1 });
    } catch (dbError) {
      console.error('[AlertController] ❌ Data retrieval fails during alert processing:', dbError.message);
      return {
        success: false,
        message: 'Data retrieval fails during alert processing.',
        reason: 'DATABASE_ERROR'
      };
    }
  }

  // 2. Validate vital signs (not null, not empty, not zero, physically valid, recent)
  const validation = validateVitalsForAlert(finalVitals, freshUser._id);
  if (!validation.isValid) {
    return {
      success: false,
      message: `Emergency alert not generated: ${validation.reason}`,
      reason: 'INVALID_VITALS',
      detail: validation.reason,
      missingField: validation.missingField
    };
  }

  // 3. Ensure thresholds are exceeded (unless bypassed for manual SOS)
  const thresholdCheck = checkThresholdsExceeded(validation.cleanedVitals, validation.checkBP, validation.checkBG);
  if (!bypassThreshold && !thresholdCheck.thresholdExceeded) {
    console.warn('[AlertController] ⚠️ Alert blocked. Reason: Vital signs are within normal thresholds.');
    return {
      success: false,
      message: 'Emergency alert not generated: Vital signs are within normal thresholds.',
      reason: 'NORMAL_VITALS'
    };
  }

  const vitalsWithFlags = {
    ...validation.cleanedVitals,
    ...thresholdCheck.anomalies
  };

  // 4. Cooldown checking (15 minutes) - Bypassed for manual SOS alerts to ensure prompt notification
  const lastAlert = await EmergencyAlertHistory.findOne({ userId: freshUser._id })
    .sort({ createdAt: -1 });

  const isCooldownActive = !bypassThreshold && lastAlert && (Date.now() - new Date(lastAlert.createdAt).getTime() < COOLDOWN_PERIOD_MS);

  // 5. CRITICAL: Validate emergency contacts before proceeding
  const contacts = freshUser.emergencyContacts || [];
  const contactValidation = validateEmergencyContacts(contacts, freshUser._id);
  
  if (!contactValidation.isValid) {
    // Still create history record but mark as failed due to no contacts
    const history = await EmergencyAlertHistory.create({
      userId:        freshUser._id,
      emergencyType: emergencyType || 'Critical Health Alert',
      status:        'failed',
      vitalsSnapshot: {
        heartRate:   validation.cleanedVitals.heartRate,
        spo2:        validation.cleanedVitals.spo2,
        temperature: validation.cleanedVitals.temperature,
        healthScore: validation.cleanedVitals.healthScore,
        bloodPressureSystolic: validation.cleanedVitals.bloodPressureSystolic,
        bloodPressureDiastolic: validation.cleanedVitals.bloodPressureDiastolic,
        bloodGlucose: validation.cleanedVitals.bloodGlucose,
      },
      locationSnapshot: {
        latitude:  location?.latitude,
        longitude: location?.longitude,
      },
      deliveryLogs: [{
        contactName: 'System',
        contactMethod: 'none',
        contactAddress: 'N/A',
        status: 'failed',
        error: contactValidation.reason || 'No emergency contacts available'
      }],
    });

    console.error(`[AlertController] ❌ ALERT BLOCKED - ${contactValidation.reason} for user ${freshUser._id}`);
    return {
      success: false,
      message: `Emergency alert not sent: ${contactValidation.reason}. Please add emergency contacts to your profile.`,
      reason: 'NO_VALID_CONTACTS',
      historyId: history._id,
      contacts: 0
    };
  }

  // 6. Build proper logging info
  const exceededDetails = [];
  if (thresholdCheck.anomalies.heartRateAnomaly) exceededDetails.push(`Heart Rate (${validation.cleanedVitals.heartRate} bpm)`);
  if (thresholdCheck.anomalies.spo2Anomaly) exceededDetails.push(`SpO2 (${validation.cleanedVitals.spo2}%)`);
  if (thresholdCheck.anomalies.temperatureAnomaly) exceededDetails.push(`Temperature (${validation.cleanedVitals.temperature}°C)`);
  if (thresholdCheck.anomalies.bloodPressureAnomaly) exceededDetails.push(`BP (${validation.cleanedVitals.bloodPressureSystolic}/${validation.cleanedVitals.bloodPressureDiastolic} mmHg)`);
  if (thresholdCheck.anomalies.bloodGlucoseAnomaly) exceededDetails.push(`Blood Glucose (${validation.cleanedVitals.bloodGlucose} mg/dL)`);
  const triggerReason = exceededDetails.join(', ');

  console.log(`[AlertController] 🚨 EMERGENCY ALERT GENERATED at ${new Date().toISOString()}`);
  console.log(`  - User: ${freshUser.name || freshUser.username} (${freshUser._id})`);
  console.log(`  - Vital sign values: HR=${validation.cleanedVitals.heartRate}, SpO2=${validation.cleanedVitals.spo2}, Temp=${validation.cleanedVitals.temperature}`);
  console.log(`  - Thresholds exceeded: ${triggerReason}`);
  console.log(`  - Emergency Contacts: ${contactValidation.count} valid contact(s) will be notified`);

  // Create history log record
  const resolvedType = emergencyType || 'Critical Health Alert';
  const history = await EmergencyAlertHistory.create({
    userId:        freshUser._id,
    emergencyType: resolvedType,
    status:        isCooldownActive ? 'failed' : 'pending',
    vitalsSnapshot: {
      heartRate:   validation.cleanedVitals.heartRate,
      spo2:        validation.cleanedVitals.spo2,
      temperature: validation.cleanedVitals.temperature,
      healthScore: validation.cleanedVitals.healthScore,
      bloodPressureSystolic: validation.cleanedVitals.bloodPressureSystolic,
      bloodPressureDiastolic: validation.cleanedVitals.bloodPressureDiastolic,
      bloodGlucose: validation.cleanedVitals.bloodGlucose,
    },
    locationSnapshot: {
      latitude:  location?.latitude,
      longitude: location?.longitude,
    },
    deliveryLogs: isCooldownActive ? [{
      contactName: 'Cooldown Prevention System',
      contactMethod: 'sms',
      contactAddress: 'prevented',
      status: 'failed',
      error: `Notifications throttled to prevent duplicate alerts within ${COOLDOWN_PERIOD_MS / 60 / 1000} minutes.`
    }] : [],
  });

  if (isCooldownActive) {
    console.log(`[AlertController] ⚠️ Cooldown active. Skipping notifications for user ${freshUser._id}`);
    return {
      success:   true,
      cooldown:  true,
      message:   'Emergency logged in history (cooldown active - contacts not spammed).',
      historyId: history._id,
      contacts:  contactValidation.count,
    };
  }

  // 7. Fire-and-forget background dispatch with valid contacts
  dispatchInBackground(
    freshUser,
    { emergencyType: resolvedType, vitals: vitalsWithFlags, location, isManual: bypassThreshold },
    history._id
  );

  return {
    success:   true,
    cooldown:  false,
    message:   'Emergency alert accepted — notifying your contacts now.',
    historyId: history._id,
    contacts:  contactValidation.count,
  };
};

// ─── Route Handler ───────────────────────────────────────────────────────────
/**
 * @desc    Trigger an emergency alert — responds instantly, dispatches in background
 * @route   POST /api/alerts/emergency
 * @access  Private
 */
const triggerEmergency = async (req, res) => {
  const requestStart = Date.now();

  try {
    const user = req.user;
    const { emergencyType, vitals, location } = req.body;

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Validate emergency contacts exist
    const contactValidation = validateEmergencyContacts(user.emergencyContacts, user._id);
    if (!contactValidation.isValid) {
      console.warn(`[AlertController] SOS attempted but contacts invalid: ${contactValidation.reason}`);
      return res.status(400).json({
        success: false,
        message: `Cannot trigger emergency alert: ${contactValidation.reason}. Please add emergency contacts to your profile first.`,
        reason: 'NO_VALID_CONTACTS'
      });
    }

    const result = await processEmergencyAlert(user, { emergencyType, vitals, location, bypassThreshold: true });
    const totalApiTime = Date.now() - requestStart;
    console.log(`[AlertController] ⚡ Responding to manual SOS trigger in ${totalApiTime}ms`);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(202).json(result);

  } catch (error) {
    console.error('[AlertController] ❌ triggerEmergency error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to initiate emergency alert',
        error:   process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
};

module.exports = { triggerEmergency, processEmergencyAlert };

