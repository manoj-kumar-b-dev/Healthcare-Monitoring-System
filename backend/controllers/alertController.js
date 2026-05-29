const { sendEmergencyNotification } = require('../services/notificationService');

// @desc    Trigger an emergency alert (Email/SMS to contacts)
// @route   POST /api/alerts/emergency
// @access  Private
const triggerEmergency = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { emergencyType, vitals, location } = req.body;

    console.log(`[AlertController] Triggering emergency for user: ${userId}`);

    const result = await sendEmergencyNotification(userId, {
      emergencyType,
      vitals,
      location
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Emergency notifications sent successfully',
      data: {
        historyId: result.historyId,
        logs: result.logs
      }
    });
  } catch (error) {
    console.error('[AlertController] triggerEmergency error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger emergency notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  triggerEmergency
};
