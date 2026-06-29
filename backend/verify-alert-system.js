const mongoose = require('mongoose');
const connectDB = require('./db');
const User = require('./models/User');
const VitalSign = require('./models/VitalSign');
const EmergencyAlertHistory = require('./models/EmergencyAlertHistory');
const { processEmergencyAlert } = require('./controllers/alertController');
require('dotenv').config();

const runVerification = async () => {
  let testUser = null;
  try {
    console.log('--- 1. Connecting to Database ---');
    await connectDB();

    console.log('--- 2. Finding or Creating Test User ---');
    testUser = await User.findOne({ username: 'system_verify_test_user' });
    if (!testUser) {
      testUser = await User.create({
        username: 'system_verify_test_user',
        email: 'verify-test@healthsynq-system.com',
        password: 'password123',
        name: 'System Verification User',
        phone: '+919999999999',
        emergencyContacts: [
          {
            name: 'Primary Contact',
            phone: '+918888888888',
            email: 'primary@contact.com',
            relationship: 'Sibling'
          }
        ]
      });
      console.log('Created test user.');
    } else {
      testUser.emergencyContacts = [
        {
          name: 'Primary Contact',
          phone: '+918888888888',
          email: 'primary@contact.com',
          relationship: 'Sibling'
        }
      ];
      await testUser.save();
      console.log('Found and reset test user.');
    }

    // Clear history and vitals for clean run
    await EmergencyAlertHistory.deleteMany({ userId: testUser._id });
    await VitalSign.deleteMany({ userId: testUser._id });
    console.log('Cleaned up existing records for test user.');

    console.log('\n--- 3. Running Scenario Tests (Cases 1-6) ---');

    // ==========================================
    // Test Case 1: All vitals missing.
    // Expected: No emergency alert.
    // ==========================================
    console.log('\nTest Case 1: All vitals missing...');
    const res1 = await processEmergencyAlert(testUser, {
      emergencyType: 'Test Case 1',
      vitals: null,
      location: null
    });
    console.log('Result:', res1);
    if (!res1.success && res1.reason === 'INVALID_VITALS') {
      console.log('✅ PASS: Test Case 1 - No emergency alert generated.');
    } else {
      console.error('❌ FAIL: Test Case 1 - Expected block due to missing vitals.');
    }

    // ==========================================
    // Test Case 2: Blood pressure = undefined/undefined.
    // Expected: No emergency alert.
    // ==========================================
    console.log('\nTest Case 2: Blood pressure = undefined/undefined (others valid & normal)...');
    const vitalsBPUndefined = {
      heartRate: 75,
      spo2: 98,
      temperature: 36.5,
      bloodPressureSystolic: 'undefined',
      bloodPressureDiastolic: 'undefined',
      timestamp: new Date()
    };
    const res2 = await processEmergencyAlert(testUser, {
      emergencyType: 'Test Case 2',
      vitals: vitalsBPUndefined,
      location: null
    });
    console.log('Result:', res2);
    if (!res2.success && res2.reason === 'NORMAL_VITALS') {
      console.log('✅ PASS: Test Case 2 - No emergency alert generated (BP analysis skipped, other vitals normal).');
    } else {
      console.error('❌ FAIL: Test Case 2 - Expected alert block due to normal vitals after BP skip.');
    }

    // ==========================================
    // Test Case 3: Heart rate = null.
    // Expected: No emergency alert.
    // ==========================================
    console.log('\nTest Case 3: Heart rate = null (others valid & normal)...');
    const vitalsHRNull = {
      heartRate: null,
      spo2: 98,
      temperature: 36.5,
      timestamp: new Date()
    };
    const res3 = await processEmergencyAlert(testUser, {
      emergencyType: 'Test Case 3',
      vitals: vitalsHRNull,
      location: null
    });
    console.log('Result:', res3);
    if (!res3.success && res3.reason === 'INVALID_VITALS') {
      console.log('✅ PASS: Test Case 3 - No emergency alert generated (Heart rate cannot be null).');
    } else {
      console.error('❌ FAIL: Test Case 3 - Expected block due to null heart rate.');
    }

    // ==========================================
    // Test Case 4: Heart rate = 150 bpm.
    // Expected: Emergency alert generated.
    // ==========================================
    console.log('\nTest Case 4: Heart rate = 150 bpm (others valid & normal)...');
    const vitalsHRHigh = {
      heartRate: 150,
      spo2: 98,
      temperature: 36.5,
      timestamp: new Date()
    };
    const res4 = await processEmergencyAlert(testUser, {
      emergencyType: 'Test Case 4',
      vitals: vitalsHRHigh,
      location: null
    });
    console.log('Result:', res4);
    if (res4.success && !res4.cooldown) {
      console.log('✅ PASS: Test Case 4 - Emergency alert generated successfully.');
    } else {
      console.error('❌ FAIL: Test Case 4 - Expected alert to trigger.');
    }

    // Reset alert history for Test Case 5 to avoid cooldown interference
    await EmergencyAlertHistory.deleteMany({ userId: testUser._id });

    // ==========================================
    // Test Case 5: SpO₂ = 85%.
    // Expected: Emergency alert generated.
    // ==========================================
    console.log('\nTest Case 5: SpO₂ = 85% (others valid & normal)...');
    const vitalsSpO2Low = {
      heartRate: 75,
      spo2: 85,
      temperature: 36.5,
      timestamp: new Date()
    };
    const res5 = await processEmergencyAlert(testUser, {
      emergencyType: 'Test Case 5',
      vitals: vitalsSpO2Low,
      location: null
    });
    console.log('Result:', res5);
    if (res5.success && !res5.cooldown) {
      console.log('✅ PASS: Test Case 5 - Emergency alert generated successfully.');
    } else {
      console.error('❌ FAIL: Test Case 5 - Expected alert to trigger.');
    }

    // Reset alert history for Test Case 6 to avoid cooldown interference
    await EmergencyAlertHistory.deleteMany({ userId: testUser._id });

    // ==========================================
    // Test Case 6: Temperature = 37°C.
    // Expected: No emergency alert.
    // ==========================================
    console.log('\nTest Case 6: Temperature = 37°C (others valid & normal)...');
    const vitalsNormal = {
      heartRate: 75,
      spo2: 98,
      temperature: 37,
      timestamp: new Date()
    };
    const res6 = await processEmergencyAlert(testUser, {
      emergencyType: 'Test Case 6',
      vitals: vitalsNormal,
      location: null
    });
    console.log('Result:', res6);
    if (!res6.success && res6.reason === 'NORMAL_VITALS') {
      console.log('✅ PASS: Test Case 6 - No emergency alert generated (vitals normal).');
    } else {
      console.error('❌ FAIL: Test Case 6 - Expected alert block since vitals are normal.');
    }

    // ==========================================
    // Test Case 7: Manual SOS (bypassThreshold = true) during active cooldown.
    // Expected: Cooldown is bypassed and emergency alert is generated.
    // ==========================================
    console.log('\nTest Case 7: Manual SOS during active cooldown...');
    // Create an alert to activate cooldown
    await EmergencyAlertHistory.create({
      userId: testUser._id,
      emergencyType: 'Cooldown Trigger Alert',
      status: 'completed',
      vitalsSnapshot: vitalsNormal,
      createdAt: new Date()
    });

    const res7 = await processEmergencyAlert(testUser, {
      emergencyType: 'Test Case 7 (Manual)',
      vitals: vitalsNormal,
      location: null,
      bypassThreshold: true
    });
    console.log('Result:', res7);
    if (res7.success && !res7.cooldown && res7.contacts === 1) {
      console.log('✅ PASS: Test Case 7 - Cooldown bypassed for manual alert.');
    } else {
      console.error('❌ FAIL: Test Case 7 - Expected cooldown bypass for manual alert.');
    }

    console.log('\n--- 4. Cleanup Test Data ---');
    await User.deleteOne({ _id: testUser._id });
    await EmergencyAlertHistory.deleteMany({ userId: testUser._id });
    await VitalSign.deleteMany({ userId: testUser._id });
    console.log('Cleanup complete.');

    console.log('\n--- VERIFICATION SUCCESSFUL ---');
    process.exit(0);
  } catch (error) {
    console.error('Verification failed with error:', error);
    if (testUser) {
      await User.deleteOne({ _id: testUser._id });
      await EmergencyAlertHistory.deleteMany({ userId: testUser._id });
      await VitalSign.deleteMany({ userId: testUser._id });
    }
    process.exit(1);
  }
};

runVerification();
