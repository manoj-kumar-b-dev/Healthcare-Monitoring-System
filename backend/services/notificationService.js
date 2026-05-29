const User = require('../models/User');
const EmergencyAlertHistory = require('../models/EmergencyAlertHistory');
const { sendEmailAlert } = require('./emailService');
const { sendSMSAlert } = require('./smsService');

/**
 * Orchestrates sending emergency notifications to all emergency contacts
 * @param {string} userId - The ID of the user having the emergency
 * @param {object} emergencyData - Details about the emergency
 * @returns {object} Result with delivery status
 */
const sendEmergencyNotification = async (userId, emergencyData) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    const contacts = user.emergencyContacts || [];
    if (contacts.length === 0) {
      console.warn(`[NotificationService] No emergency contacts found for user ${userId}`);
      return { success: false, message: 'No emergency contacts found', logs: [] };
    }

    const { emergencyType, vitals, location } = emergencyData;
    
    // Prepare Maps Link
    const mapsLink = (location && location.latitude && location.longitude)
      ? `https://maps.google.com/?q=${location.latitude},${location.longitude}`
      : 'Location not provided';

    const timestamp = new Date().toLocaleString();
    
    // Generate Email HTML
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
        <h2 style="color: #d9534f; text-align: center;">🚨 EMERGENCY HEALTH ALERT 🚨</h2>
        <hr />
        <p><strong>Patient:</strong> ${user.username}</p>
        <p><strong>Emergency Type:</strong> ${emergencyType || 'Critical Health Condition'}</p>
        
        <h3>Current Vitals:</h3>
        <ul>
          <li><strong>Heart Rate:</strong> ${vitals?.heartRate || 'N/A'} bpm</li>
          <li><strong>SpO₂:</strong> ${vitals?.spo2 || 'N/A'}%</li>
          <li><strong>Temperature:</strong> ${vitals?.temperature || 'N/A'}°C</li>
          <li><strong>Health Score:</strong> ${vitals?.healthScore || 'N/A'}/100</li>
        </ul>
        
        <h3>Location:</h3>
        <p><a href="${mapsLink}" target="_blank" style="color: #0275d8; text-decoration: none;">View on Google Maps</a></p>
        
        <h3>Time:</h3>
        <p>${timestamp}</p>
        
        <hr />
        <p style="color: #d9534f; font-weight: bold;">Please contact the patient immediately and consider calling emergency services if necessary.</p>
      </div>
    `;

    // Generate SMS Text
    const smsText = `🚨 EMERGENCY ALERT: ${user.username} - ${emergencyType || 'Critical'}. HR: ${vitals?.heartRate}, SpO2: ${vitals?.spo2}. Loc: ${mapsLink}. Please contact immediately.`;

    const deliveryLogs = [];

    // Dispatch Notifications
    for (const contact of contacts) {
      if (contact.email) {
        const success = await sendEmailAlert(
          contact.email,
          `EMERGENCY ALERT: ${user.username}`,
          emailHtml
        );
        deliveryLogs.push({
          contactName: contact.name,
          contactMethod: 'email',
          contactAddress: contact.email,
          status: success ? 'success' : 'failed',
          error: success ? undefined : 'Email sending failed (check config or logs)'
        });
      }

      if (contact.phone) {
        const success = await sendSMSAlert(contact.phone, smsText);
        deliveryLogs.push({
          contactName: contact.name,
          contactMethod: 'sms',
          contactAddress: contact.phone,
          status: success ? 'success' : 'failed',
          error: success ? undefined : 'SMS sending failed (check config or logs)'
        });
      }
    }

    // Save History
    const history = await EmergencyAlertHistory.create({
      userId: user._id,
      emergencyType: emergencyType || 'Critical Health Alert',
      vitalsSnapshot: {
        heartRate: vitals?.heartRate,
        spo2: vitals?.spo2,
        temperature: vitals?.temperature,
        healthScore: vitals?.healthScore,
      },
      locationSnapshot: {
        latitude: location?.latitude,
        longitude: location?.longitude,
      },
      deliveryLogs
    });

    console.log(`[NotificationService] Emergency alerts dispatched and logged for user ${userId}. History ID: ${history._id}`);
    
    return {
      success: true,
      message: 'Emergency notifications processed',
      logs: deliveryLogs,
      historyId: history._id
    };

  } catch (error) {
    console.error('[NotificationService] Error sending emergency notification:', error);
    throw error;
  }
};

module.exports = {
  sendEmergencyNotification
};
