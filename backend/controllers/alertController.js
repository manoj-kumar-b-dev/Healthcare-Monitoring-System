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

// ─── Route Handler ───────────────────────────────────────────────────────────
/**
 * @desc    Trigger an emergency alert — responds instantly, dispatches in background
 * @route   POST /api/alerts/emergency
 * @access  Private
 *
 * OPTIMIZED FLOW:
 *  1. Validate request (no extra DB call — user already in req.user from auth middleware)
 *  2. Pre-create history document with status 'pending'  → ~50ms DB write
 *  3. Return 202 Accepted to the client IMMEDIATELY       → user sees toast < 1s
 *  4. [Background] Dispatch emails + SMS in parallel
 *  5. [Background] Update history document with results
 */
const triggerEmergency = async (req, res) => {
  const requestStart = Date.now();

  try {
    // req.user is already populated by the protect middleware — no extra DB call needed
    const user = req.user;
    const { emergencyType, vitals, location } = req.body;

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const contacts = user.emergencyContacts || [];
    if (contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No emergency contacts configured. Please add contacts in your profile first.',
      });
    }

    const resolvedType = emergencyType || 'Critical Health Alert';

    console.log(`[AlertController] 🚨 SOS triggered by ${user.username} (${contacts.length} contacts)`);

    // ── STEP 1: Save history doc immediately with 'pending' status ──────────
    // This is the ONLY blocking DB operation before we respond.
    const dbStart = Date.now();
    const history = await EmergencyAlertHistory.create({
      userId:        user._id,
      emergencyType: resolvedType,
      status:        'pending',
      vitalsSnapshot: {
        heartRate:   vitals?.heartRate,
        spo2:        vitals?.spo2,
        temperature: vitals?.temperature,
        healthScore: vitals?.healthScore,
      },
      locationSnapshot: {
        latitude:  location?.latitude,
        longitude: location?.longitude,
      },
      deliveryLogs: [], // will be filled in by background job
    });
    console.log(`[AlertController] 📝 History created (${Date.now() - dbStart}ms) — ID: ${history._id}`);

    // ── STEP 2: Respond to client IMMEDIATELY ───────────────────────────────
    // 202 Accepted = "we have the request, processing is happening asynchronously"
    const totalApiTime = Date.now() - requestStart;
    console.log(`[AlertController] ⚡ Responding to client in ${totalApiTime}ms`);

    res.status(202).json({
      success:   true,
      message:   'Emergency alert accepted — notifying your contacts now.',
      historyId: history._id,
      contacts:  contacts.length,
    });

    // ── STEP 3: Fire-and-forget background dispatch ─────────────────────────
    // This runs AFTER res.json() returns. The client has already received their
    // response by this point — notifications are processed independently.
    dispatchInBackground(
      user,
      { emergencyType: resolvedType, vitals, location },
      history._id
    );

  } catch (error) {
    console.error('[AlertController] ❌ triggerEmergency error:', error);
    // Only reaches here if the history.create() DB write failed
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to initiate emergency alert',
        error:   process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
};

module.exports = { triggerEmergency };
