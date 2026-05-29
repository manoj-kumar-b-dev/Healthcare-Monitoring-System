'use strict';

const https = require('https');

// ─── Why Resend Email Service? ───────────────────────────────────────────────
// Render's free tier firewall blocks outbound SMTP (port 587/465) entirely.
// Resend communicates over HTTPS (port 443), which is open on Render.
// This is a pure Node.js zero-dependency implementation of the Resend API.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends an email using the Resend HTTP API (HTTPS port 443).
 */
const sendResendEmail = (to, subject, html) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      from: `Health Monitor Alerts <onboarding@resend.dev>`,
      to: [to],
      subject: subject,
      html: html,
    });

    const options = {
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseBody));
          } catch (e) {
            resolve({ id: 'unknown_success_id' });
          }
        } else {
          reject(new Error(`Resend API error (${res.statusCode}): ${responseBody}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(data);
    req.end();
  });
};

// Startup verification check
if (process.env.RESEND_API_KEY) {
  console.log('[EmailService] 🚀 Resend API configured — ready to send emails.');
} else {
  console.warn('[EmailService] ⚠️  RESEND_API_KEY is missing! Email notifications are disabled.');
}

/**
 * Sends an HTML email alert via Resend (HTTPS).
 */
const sendEmailAlert = async (to, subject, html) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[EmailService] ⚠️  Skipping email to ${to} — RESEND_API_KEY not configured.`);
    return false;
  }

  console.log('[EmailService] 📤 Sending email via Resend (HTTPS):');
  console.log(`  ↳ to:      ${to}`);
  console.log(`  ↳ subject: ${subject}`);
  try {
    const result = await sendResendEmail(to, subject, html);
    console.log('[EmailService] ✅ Email delivered via Resend:');
    console.log(`  ↳ id:      ${result.id || 'unknown'}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] ❌ Resend send FAILED for ${to}:`);
    console.error(`  ↳ message: ${error.message}`);
    return false;
  }
};

/**
 * Diagnostics safe to expose on endpoint.
 */
const getEmailDiagnostics = () => {
  const configured = !!process.env.RESEND_API_KEY;
  return {
    provider:     'Resend',
    transport:    'HTTPS REST API (Port 443)',
    configured:   configured,
    verified:     configured,
    authUser:     configured ? 'onboarding@resend.dev' : null,
    error:        configured ? null : { message: 'RESEND_API_KEY is not set.' },
  };
};

module.exports = { sendEmailAlert, getEmailDiagnostics };
