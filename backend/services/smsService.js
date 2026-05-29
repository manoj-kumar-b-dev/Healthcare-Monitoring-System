const twilio = require('twilio');

// ─── Singleton Twilio Client ─────────────────────────────────────────────────
// Created ONCE on module load and reused for every SMS call.
// Instantiating twilio() per call was recreating the HTTP client each time,
// adding unnecessary overhead in production.
let _twilioClient = null;

const getTwilioClient = () => {
  if (_twilioClient) return _twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) return null;

  _twilioClient = twilio(accountSid, authToken);
  return _twilioClient;
};

// Eagerly initialize on startup so the first SOS pays no setup cost
getTwilioClient();

/**
 * Formats a phone number to E.164.
 * Handles bare 10-digit Indian numbers by prepending +91.
 */
const toE164 = (phone) => {
  if (!phone) return null;
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return `+${cleaned}`;
};

/**
 * Sends an SMS alert via Twilio.
 * @param {string} to - Recipient phone number
 * @param {string} body - SMS message body
 * @returns {Promise<boolean>} true on success, false on failure/skip
 */
const sendSMSAlert = async (to, body) => {
  const client = getTwilioClient();

  const twilioPhoneNumber    = process.env.TWILIO_PHONE_NUMBER;
  const messagingServiceSid  = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!client || (!twilioPhoneNumber && !messagingServiceSid)) {
    console.warn('[SMSService] Twilio not configured. Skipping SMS to:', to);
    return false;
  }

  const formattedTo = toE164(to);
  if (!formattedTo) {
    console.warn('[SMSService] Invalid phone number, skipping:', to);
    return false;
  }

  try {
    const messageData = { body, to: formattedTo };
    if (messagingServiceSid) {
      messageData.messagingServiceSid = messagingServiceSid;
    } else {
      messageData.from = twilioPhoneNumber;
    }

    const message = await client.messages.create(messageData);
    console.log(`[SMSService] ✅ Sent to ${formattedTo} — SID: ${message.sid}`);
    return true;
  } catch (error) {
    console.error(`[SMSService] ❌ Failed to send to ${formattedTo}:`, error.message);
    return false;
  }
};

module.exports = { sendSMSAlert };
