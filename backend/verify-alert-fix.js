#!/usr/bin/env node

/**
 * Emergency Alert System Verification Script
 * 
 * This script verifies that:
 * 1. Users have emergency contacts configured
 * 2. Emergency contacts have valid email/phone
 * 3. Email and SMS services are configured
 * 4. Alert history is being created properly
 * 
 * Usage: node verify-alert-fix.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const EmergencyAlertHistory = require('./models/EmergencyAlertHistory');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}`)
};

async function main() {
  try {
    // Connect to database
    log.section('Database Connection');
    if (!process.env.MONGODB_URI) {
      log.error('MONGODB_URI is not set in environment variables');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    log.success('Connected to MongoDB');

    // Check services configuration
    log.section('Service Configuration');
    
    if (process.env.RESEND_API_KEY) {
      log.success('Resend API Key configured (Email service ready)');
    } else {
      log.warn('Resend API Key NOT configured (Email alerts will be skipped)');
    }

    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      log.success('Twilio configured (SMS service ready)');
    } else {
      log.warn('Twilio NOT fully configured (SMS alerts will be skipped)');
    }

    // Check users with emergency contacts
    log.section('User Emergency Contacts Audit');
    
    const allUsers = await User.find({});
    log.info(`Total users in system: ${allUsers.length}`);

    let usersWithContacts = 0;
    let usersWithValidContacts = 0;
    const issues = [];

    for (const user of allUsers) {
      const contacts = user.emergencyContacts || [];
      
      if (contacts.length > 0) {
        usersWithContacts++;
        
        // Check if contacts have valid email/phone
        const validContacts = contacts.filter(c => {
          const hasEmail = c.email && typeof c.email === 'string' && c.email.trim().length > 0;
          const hasPhone = c.phone && typeof c.phone === 'string' && c.phone.trim().length > 0;
          return hasEmail || hasPhone;
        });

        if (validContacts.length > 0) {
          usersWithValidContacts++;
          log.info(`User "${user.username}": ${contacts.length} contact(s), ${validContacts.length} valid`);
          
          // Show contact details
          validContacts.forEach((c, idx) => {
            const methods = [];
            if (c.email) methods.push(`📧 ${c.email}`);
            if (c.phone) methods.push(`📱 ${c.phone}`);
            console.log(`   └─ ${c.name} (${methods.join(', ')})`);
          });
        } else {
          log.warn(`User "${user.username}": ${contacts.length} contact(s) but NONE have valid email/phone`);
          issues.push(`User ${user.username} has contacts without valid contact methods`);
          
          contacts.forEach(c => {
            console.log(`   └─ ${c.name} - Email: ${c.email || 'N/A'}, Phone: ${c.phone || 'N/A'}`);
          });
        }
      } else {
        log.warn(`User "${user.username}": NO emergency contacts configured`);
        issues.push(`User ${user.username} has no emergency contacts`);
      }
    }

    console.log('');
    log.info(`Summary: ${usersWithValidContacts}/${allUsers.length} users have valid emergency contacts`);

    // Check recent alert history
    log.section('Recent Emergency Alert History');
    
    const recentAlerts = await EmergencyAlertHistory.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'username email');

    if (recentAlerts.length === 0) {
      log.warn('No emergency alerts in history yet');
    } else {
      recentAlerts.forEach((alert, idx) => {
        const user = alert.userId;
        const timestamp = new Date(alert.createdAt).toLocaleString();
        const status = alert.status === 'completed' ? colors.green + 'SUCCESS' : 
                       alert.status === 'partial' ? colors.yellow + 'PARTIAL' :
                       alert.status === 'pending' ? colors.cyan + 'PENDING' :
                       colors.red + 'FAILED';
        
        log.info(`Alert #${idx + 1}: User "${user?.username}" | Status: ${status}${colors.reset} | ${timestamp}`);
        
        // Show delivery logs
        if (alert.deliveryLogs && alert.deliveryLogs.length > 0) {
          alert.deliveryLogs.forEach(log_entry => {
            const method = log_entry.contactMethod === 'email' ? '📧' : log_entry.contactMethod === 'sms' ? '📱' : '⚠️ ';
            const status_icon = log_entry.status === 'success' ? '✅' : '❌';
            console.log(`   ${status_icon} ${method} ${log_entry.contactName}: ${log_entry.contactAddress}`);
            if (log_entry.error) {
              console.log(`      Error: ${log_entry.error}`);
            }
          });
        }
      });
    }

    // Recommendations
    log.section('Recommendations');
    
    if (issues.length > 0) {
      log.warn(`Found ${issues.length} issue(s):`);
      issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`);
      });
    } else {
      log.success('All users have valid emergency contacts!');
    }

    if (!process.env.RESEND_API_KEY) {
      log.warn('Add RESEND_API_KEY to .env to enable email notifications');
    }

    if (!process.env.TWILIO_ACCOUNT_SID) {
      log.warn('Add TWILIO_ACCOUNT_SID to .env to enable SMS notifications');
    }

    log.section('Verification Complete');
    console.log('To test alert sending:');
    console.log('1. POST to /api/vitals with abnormal values (e.g., heartRate > 100)');
    console.log('2. Check EmergencyAlertHistory for delivery logs');
    console.log('3. Verify contacts receive email/SMS notifications');

  } catch (error) {
    log.error(`Verification failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

main();
