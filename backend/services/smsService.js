const twilio = require('twilio');

/**
 * Sends an SMS
 * @param {string} to - Recipient phone number (E.164 format)
 * @param {string} body - SMS message body
 */
const sendSMSAlert = async (to, body) => {
  try {
    // Format to E.164 if it's just a 10 digit Indian number
    let formattedTo = to;
    if (!formattedTo.startsWith('+')) {
      if (formattedTo.length === 10) {
        formattedTo = '+91' + formattedTo;
      } else {
        formattedTo = '+' + formattedTo;
      }
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    if (!accountSid || !authToken || (!twilioPhoneNumber && !messagingServiceSid)) {
      console.warn('Twilio credentials not configured. Skipping SMS sending.');
      return false; // Return false indicating failure/skip due to missing config
    }

    const client = twilio(accountSid, authToken);

    const messageData = {
      body,
      to: formattedTo,
    };

    if (messagingServiceSid) {
      messageData.messagingServiceSid = messagingServiceSid;
    } else {
      messageData.from = twilioPhoneNumber;
    }

    const message = await client.messages.create(messageData);

    console.log(`SMS sent successfully to ${to}: ${message.sid}`);
    return true; // Success
  } catch (error) {
    console.error(`Error sending SMS to ${to}:`, error);
    return false; // Failed
  }
};

module.exports = {
  sendSMSAlert
};
