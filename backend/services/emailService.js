'use strict';

const nodemailer = require('nodemailer');

// ─── Transporter Factory ──────────────────────────────────────────────────────
// NOT a singleton. We create a fresh transporter per process start and verify
// it immediately. We do NOT cache across calls — this prevents stale/broken
// credentials from being locked in for the process lifetime.
//
// Note: nodemailer.createTransport() does NOT validate credentials at creation
// time. Only transporter.verify() or transporter.sendMail() actually hit Gmail's
// SMTP server. A cached transporter with bad credentials silently passes the
// truthy check every time and only fails deep inside sendMail().

/**
 * Builds and returns a new Nodemailer transporter configured for Gmail.
 * Returns null if EMAIL_USER or EMAIL_APP_PASSWORD env vars are missing/empty.
 */
const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn(
      '[EmailService] ⚠️  Missing credentials — EMAIL_USER or EMAIL_APP_PASSWORD not set. Email disabled.'
    );
    return null;
  }

  // Surface credential diagnostics without leaking the actual password value.
  // A correct Gmail App Password is exactly 16 characters (no spaces).
  console.log(
    `[EmailService] 🔑 Credential check — EMAIL_USER: ${user} | EMAIL_APP_PASSWORD length: ${pass.length} (expected: 16)`
  );

  if (pass.length !== 16) {
    console.error(
      `[EmailService] ❌ EMAIL_APP_PASSWORD length is ${pass.length} — expected 16. ` +
      `Gmail App Passwords must be the raw 16-char token with NO spaces. ` +
      `Check your Render environment variable and remove any spaces.`
    );
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    // Connection pool for efficiency under load, but won't cache broken auth
    pool:           true,
    maxConnections: 5,
    maxMessages:    100,
    // Explicit timeouts — Render's network can be slower than localhost
    connectionTimeout: 10000, // 10 s to establish TCP connection
    greetingTimeout:   10000, // 10 s to receive SMTP EHLO greeting
    socketTimeout:     30000, // 30 s idle socket before teardown
  });
};

// ─── Module-Level Transporter ─────────────────────────────────────────────────
// One transporter per process. Created when this module first loads (i.e. when
// server.js imports emailService). The verify() call below tests the real SMTP
// connection so failures appear immediately in startup logs.
const _transporter = createTransporter();

// ─── Startup SMTP Verification ────────────────────────────────────────────────
// transporter.verify() opens a real TCP connection to smtp.gmail.com:587,
// completes the STARTTLS + AUTH handshake, and resolves/rejects.
// This surfaces auth failures the MOMENT Render deploys — not on the first SOS.
let _smtpVerified  = false;   // true only after a successful verify()
let _smtpError     = null;    // populated if verify() rejects

const verifyTransporter = async () => {
  if (!_transporter) {
    console.warn('[EmailService] ⚠️  Skipping SMTP verify — transporter not configured.');
    return;
  }

  console.log('[EmailService] 🔍 Verifying SMTP connection to smtp.gmail.com…');
  try {
    await _transporter.verify();
    _smtpVerified = true;
    _smtpError    = null;
    console.log('[EmailService] ✅ SMTP transporter verified — Gmail auth OK. Ready to send emails.');
  } catch (err) {
    _smtpVerified = false;
    _smtpError    = err;

    // Log EVERY field that Nodemailer/Gmail populates on auth errors:
    //   err.code          → 'EAUTH' (auth failure), 'ECONNECTION' (network), etc.
    //   err.response      → raw SMTP server response e.g. "535 5.7.8 Username and Password not accepted"
    //   err.responseCode  → numeric SMTP code (535)
    //   err.command       → which SMTP command triggered the error (AUTH)
    console.error('[EmailService] ❌ SMTP verify FAILED — emails will NOT be delivered.');
    console.error(`  ↳ code:         ${err.code}`);
    console.error(`  ↳ responseCode: ${err.responseCode}`);
    console.error(`  ↳ response:     ${err.response}`);
    console.error(`  ↳ command:      ${err.command}`);
    console.error(`  ↳ message:      ${err.message}`);
    console.error(`  ↳ stack:\n${err.stack}`);
    console.error(
      '[EmailService] 🛠  Common fix: ensure EMAIL_APP_PASSWORD in Render env is the raw 16-char ' +
      'App Password with NO spaces. Go to myaccount.google.com → Security → App passwords.'
    );
  }
};

// Run verify on startup — non-blocking, errors are logged above
verifyTransporter();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends an HTML email alert via Gmail SMTP.
 *
 * Logs on every call:
 *  - Recipient address
 *  - Auth user + password length (never the password itself)
 *  - Full Nodemailer sendMail response (messageId, accepted[], rejected[])
 *  - Full error object on failure (code, response, responseCode, stack)
 *
 * @param {string} to       - Recipient email address
 * @param {string} subject  - Email subject line
 * @param {string} html     - HTML email body
 * @returns {Promise<boolean>} true on success, false on any failure/skip
 */
const sendEmailAlert = async (to, subject, html) => {
  if (!_transporter) {
    console.warn(`[EmailService] ⚠️  Skipping email to ${to} — transporter not configured (missing env vars).`);
    return false;
  }

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  // Pre-send diagnostics — visible in Render logs for every SOS
  console.log('[EmailService] 📤 Attempting to send email:');
  console.log(`  ↳ to:              ${to}`);
  console.log(`  ↳ from (auth user): ${user}`);
  console.log(`  ↳ password length:  ${pass ? pass.length : 'MISSING'} (expected: 16)`);
  console.log(`  ↳ subject:         ${subject}`);
  console.log(`  ↳ smtpVerified:    ${_smtpVerified}`);

  if (!_smtpVerified) {
    console.warn(
      `[EmailService] ⚠️  Proceeding despite SMTP verify failure. ` +
      `Error was: ${_smtpError?.response || _smtpError?.message || 'unknown'}`
    );
  }

  try {
    const info = await _transporter.sendMail({
      from:    `"Health Monitor Alerts" <${user}>`,
      to,
      subject,
      html,
    });

    // Full success diagnostics
    console.log(`[EmailService] ✅ Email delivered successfully:`);
    console.log(`  ↳ to:         ${to}`);
    console.log(`  ↳ messageId:  ${info.messageId}`);
    console.log(`  ↳ accepted:   ${JSON.stringify(info.accepted)}`);
    console.log(`  ↳ rejected:   ${JSON.stringify(info.rejected)}`);
    console.log(`  ↳ response:   ${info.response}`);

    if (info.rejected && info.rejected.length > 0) {
      console.warn(`[EmailService] ⚠️  Some recipients were rejected: ${JSON.stringify(info.rejected)}`);
      return false;
    }

    return true;

  } catch (error) {
    // Full error diagnostics — no detail swallowed
    console.error(`[EmailService] ❌ sendMail FAILED for ${to}:`);
    console.error(`  ↳ code:         ${error.code}`);
    console.error(`  ↳ responseCode: ${error.responseCode}`);
    console.error(`  ↳ response:     ${error.response}`);
    console.error(`  ↳ command:      ${error.command}`);
    console.error(`  ↳ message:      ${error.message}`);
    console.error(`  ↳ stack:\n${error.stack}`);
    return false;
  }
};

/**
 * Returns current SMTP transporter status for the /api/alerts/email-status
 * diagnostic endpoint. Safe to expose — does NOT include credentials.
 *
 * @returns {{ configured: boolean, verified: boolean, error: string|null }}
 */
const getEmailDiagnostics = () => ({
  configured:    !!_transporter,
  verified:      _smtpVerified,
  authUser:      process.env.EMAIL_USER || null,
  passwordLength: process.env.EMAIL_APP_PASSWORD ? process.env.EMAIL_APP_PASSWORD.length : 0,
  error: _smtpError
    ? {
        code:         _smtpError.code,
        responseCode: _smtpError.responseCode,
        response:     _smtpError.response,
        message:      _smtpError.message,
      }
    : null,
});

module.exports = { sendEmailAlert, getEmailDiagnostics };
