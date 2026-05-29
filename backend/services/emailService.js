const nodemailer = require('nodemailer');

// Create reusable transporter object using default SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail', // Use Gmail as standard testing service with app password
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
};

/**
 * Sends an email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML email body
 */
const sendEmailAlert = async (to, subject, html) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      console.warn('Email credentials not configured. Skipping email sending.');
      return false; // Return false indicating failure/skip due to missing config
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Health Monitor Alerts" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}: ${info.messageId}`);
    return true; // Success
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    return false; // Failed
  }
};

module.exports = {
  sendEmailAlert
};
