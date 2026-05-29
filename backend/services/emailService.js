const nodemailer = require('nodemailer');

// ─── Singleton Transporter ───────────────────────────────────────────────────
// Created ONCE on module load and reused for every email call.
// This avoids rebuilding the SMTP connection on each alert, which was adding
// hundreds of milliseconds of handshake overhead in production.
let _transporter = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    return null; // credentials not configured
  }

  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
    // Keep the connection pool alive between sends
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  return _transporter;
};

// Eagerly initialize on startup so the first SOS call pays no setup cost
getTransporter();

/**
 * Sends an email alert.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML email body
 * @returns {Promise<boolean>} true on success, false on failure/skip
 */
const sendEmailAlert = async (to, subject, html) => {
  const transporter = getTransporter();

  if (!transporter) {
    console.warn('[EmailService] Credentials not configured. Skipping email to:', to);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Health Monitor Alerts" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[EmailService] ✅ Sent to ${to} — MessageID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] ❌ Failed to send to ${to}:`, error.message);
    return false;
  }
};

module.exports = { sendEmailAlert };
