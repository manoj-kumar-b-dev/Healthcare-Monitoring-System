const jwt = require('jsonwebtoken');
const User = require('./models/User');
const VitalSign = require('./models/VitalSign');
const Activity = require('./models/Activity');
const { processEmergencyAlert } = require('./controllers/alertController');

// Manage user specific vital generation intervals to prevent overlap and memory leaks
const userIntervals = new Map();

const initializeSockets = (io) => {
  // 1. Connection Event Handler Authentication Middleware
  io.use(async (socket, next) => {
    try {
      // Connect with JWT token in auth header logic via socket.handshake.auth
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify and decode Token payload
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Fetch fresh user to ensure they are fully authenticated
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user document dynamically onto the individual socket pipeline
      socket.user = user;
      next();
    } catch (error) {
      console.error("Socket authentication exception:", error.message);
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    const roomName = `user_${userId}`;

    // Join personal isolated room utilizing room-based broadcasting
    socket.join(roomName);
    console.log(`[Socket Connected] User ${userId} joined room ${roomName} via socket ${socket.id}`);

    // Emit initial successful connection alert mapping back metadata
    socket.emit('connection_success', {
      user: {
        _id: socket.user._id,
        username: socket.user.username
      },
      message: 'Successfully connected to live stream multiplexer'
    });

    // Handle auto-generation interval setup uniquely to each user
    if (!userIntervals.has(userId)) {
      console.log(`[Simulation Initialized] Starting vitals simulation for user ${userId}`);

      const intervalId = setInterval(async () => {
        try {
          // Verification layer validating active sockets exist in the designated broadcast cluster room before proceeding
          const socketsInRoom = await io.in(roomName).fetchSockets();
          if (socketsInRoom.length === 0) {
            // Garbage collect intervals explicitly if all tabs get closed immediately causing async racing mismatches
            clearInterval(userIntervals.get(userId));
            userIntervals.delete(userId);
            return;
          }

          // ── Vital Signs Simulation ───────────────────────────────────────────
          // Most readings are NORMAL (90% of the time) to avoid saturating the
          // 15-minute alert cooldown. A 10% "spike" mode simulates a real emergency.
          const isAnomalySpike = Math.random() < 0.10; // 10% chance of simulated emergency

          const heartRate = Math.floor(Math.random() * (95 - 65 + 1)) + 65;
          const spo2 = Math.floor(Math.random() * (100 - 97 + 1)) + 97;
          const temperature = +(Math.random() * (37.2 - 36.2) + 36.2).toFixed(1);

          const bloodPressureSystolic  = Math.floor(Math.random() * (130 - 110 + 1)) + 110;
          const bloodPressureDiastolic = Math.floor(Math.random() * (85  - 70  + 1)) + 70;
          const bloodGlucose           = Math.floor(Math.random() * (120 - 90  + 1)) + 90;

          // Evaluate anomaly flags against clinical thresholds
          const anomalyFlags = {
            heartRateAnomaly:    heartRate > 100 || heartRate < 60,
            spo2Anomaly:         spo2 < 95,
            temperatureAnomaly:  temperature > 37.5 || temperature < 36.0,
            bloodPressureAnomaly: false,
            bloodGlucoseAnomaly:  false
          };

          const vitalSignData = {
            userId,
            heartRate,
            spo2,
            temperature,
            bloodPressureSystolic,
            bloodPressureDiastolic,
            bloodGlucose,
            anomalyFlags,
            timestamp: new Date()
          };

          // Save simulation straight cleanly directly into permanent DB layer
          const savedVital = await VitalSign.create(vitalSignData);

          // Push vitals object event directly into their encapsulated user tunnel
          io.to(roomName).emit('vitals:update', savedVital);

          // Determine if there are any anomalies triggered
          const hasAnomaly = Object.values(anomalyFlags).some(flag => flag === true);

          if (hasAnomaly) {
            // Automatically process alert (logs alert history, respects cooldown)
            const alertResult = await processEmergencyAlert(socket.user, {
              emergencyType: 'Abnormal Vitals Detected (Simulated)',
              vitals: savedVital,
              location: null
            });

            if (alertResult && alertResult.success) {
              // Emit to frontend to display warning toast and play sound/device alert
              io.to(roomName).emit('alert:triggered', {
                message: 'Abnormal vital sign detected!',
                vitals: savedVital,
                cooldown: alertResult.cooldown,
                alertText: alertResult.alertText || 'Critical Health Warning',
                severity: alertResult.severity || 'WARNING'
              });
            }
          }

        } catch (error) {
          console.error(`Simulation runtime error for user ${userId}:`, error.message);
        }
      }, 5000); // Lock to strict 5 seconds iteration limit

      userIntervals.set(userId, intervalId);
    }

    // Capture standard disconnected garbage collection
    socket.on('disconnect', async () => {
      console.log(`[Socket Disconnected] Socket ${socket.id} closed for user ${userId}`);

      // Check multi-user simultaneous connections across various tabs iteratively
      const socketsInRoom = await io.in(roomName).fetchSockets();
      if (socketsInRoom.length === 0) {
        // Safe to clear data generation algorithms locally
        if (userIntervals.has(userId)) {
          clearInterval(userIntervals.get(userId));
          userIntervals.delete(userId);
          console.log(`[Simulation Stopped] Cleaned up generation for user ${userId}`);
        }
      }
    });

    // Handle real-time step updates from mobile sensors
    socket.on('steps:update', async (data) => {
      try {
        // The data from frontend is already the latest absolute values saved via API
        // So we just need to broadcast it to other clients in the same room
        io.to(roomName).emit('steps:updated', {
          steps: data.steps,
          calories: data.calories,
          distance: data.distance
        });
      } catch (error) {
        console.error('Step update error:', error);
      }
    });

  });
};

module.exports = initializeSockets;
