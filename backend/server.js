const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
require("dotenv").config();
const connectDB = require("./db");
const healthRoutes = require("./routes/heathRoutes");
const authRoutes = require("./routes/authRoutes.js");
const vitalsRoutes = require("./routes/vitalsRoutes.js");
const contactRoutes = require("./routes/contactRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const activityRoutes = require("./routes/activityRoutes.js");
const reportRoutes = require("./routes/reportRoutes.js");
const reminderRoutes = require("./routes/reminderRoutes.js");
const healthScoreRoutes = require("./routes/healthScoreRoutes.js");
const alertRoutes = require("./routes/alertRoutes.js");
const keepWarm = require("./utils/keepWarm");
const { getEmailDiagnostics } = require('./services/emailService');
// CORS configuration origins array
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(o => o.trim());

const app = express();
let server = app;
let io = null;

if (process.env.VERCEL !== 'true') {
  server = http.createServer(app);
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true
    }
  });
  app.set('socketio', io);
}

// Database Connection Middleware — ensures connection is warm for serverless environments
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("Database connection error in middleware:", err.message);
    res.status(500).json({ success: false, message: "Database connection failed" });
  }
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl) or matching origin
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: Origin ${origin} is not allowed`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsers — MUST come before routes so req.body is populated
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Security: MongoDB Injection Prevention ─────────────────────────────────
// Express 5 compatibility layer: redefine req.query as writable since it's a getter by default in Express 5,
// which prevents express-mongo-sanitize from crashing.
app.use((req, res, next) => {
  if (req.query) {
    Object.defineProperty(req, 'query', {
      value: req.query,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }
  next();
});

// Prevents $ and . operator injection attacks
app.use(mongoSanitize());

// ─── Rate Limiting ──────────────────────────────────────────────────────────
// Protect API endpoints from abuse
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 1000,                  // Limit each IP to 1000 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,      // Return rate limit info in RateLimit-* headers
  legacyHeaders: false        // Disable X-RateLimit-* headers
});

const activityLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,   // 1 minute
  max: 100,                   // Limit to 100 requests per minute
  message: 'Too many activity updates, please try again in a minute'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                     // Limit login attempts to 5 per 15 minutes
  skipSuccessfulRequests: true,  // Don't count successful requests
  message: 'Too many login attempts, please try again later'
});

// Apply general rate limiter to all routes
app.use(generalLimiter);


// Database connection
// bufferCommands: false — operations fail fast on DB disconnect instead of
// silently queuing, which would cause invisible hangs in production.
mongoose.set('bufferCommands', false);
if (process.env.VERCEL !== 'true') {
  connectDB();

  // ─── Keep-warm (production only) ────────────────────────────────────────────
  // Self-pings every 14 min to prevent Render free-tier cold starts (15 min idle).
  keepWarm();
}

// Routes
// ── Health-check / keep-warm ping (no auth, responds in microseconds) ────────
app.get('/ping', (req, res) => res.status(200).json({ status: 'ok', ts: Date.now() }));
app.use("/", healthRoutes);

// ── Auth routes with specific rate limiting ─────────────────────────────────
app.use("/api/auth", authRoutes);

// ── Activity routes with stricter rate limiting ────────────────────────────
// (prevent spam step updates)
app.use("/api/activities", activityLimiter, activityRoutes);

app.use("/api/vitals", vitalsRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/user", userRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/health-score", healthScoreRoutes);
app.use("/api/alerts", alertRoutes);

// ── Email SMTP diagnostic endpoint ───────────────────────────────────────────
// Safe to call anytime — returns SMTP config status without sending any email.
// Use this immediately after deploying to Render to verify email is configured.
// Example: GET https://your-backend.onrender.com/api/email-status
app.get('/api/email-status', (req, res) => {
  const diagnostics = getEmailDiagnostics();
  const httpStatus = diagnostics.verified ? 200 : 503;
  res.status(httpStatus).json({
    smtp: diagnostics.verified ? 'ok' : 'error',
    emailService: diagnostics.verified ? 'ok' : 'error',
    ...diagnostics,
    hint: !diagnostics.verified
      ? 'No email service is configured. Please set RESEND_API_KEY in your environment.'
      : undefined,
  });
});

app.get("/", (req, res) => {
  res.send("API is running successfully");
});

// Basic Error Handling Middleware setup
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

// Socket.io connection handling mapping imported cleanly over abstraction layer
if (io) {
  const initializeSockets = require("./socket");
  initializeSockets(io);
}

// Socket.io Bridge route (only active in persistent mode so Vercel can delegate emits)
if (process.env.VERCEL !== 'true') {
  app.post('/api/socket-bridge/emit', async (req, res) => {
    const { secret, room, event, payload } = req.body;
    
    // Verify shared secret to prevent abuse
    if (!secret || secret !== process.env.SOCKET_BRIDGE_SECRET) {
      return res.status(403).json({ success: false, message: 'Unauthorized bridge request' });
    }
    
    if (!room || !event) {
      return res.status(400).json({ success: false, message: 'Room and event are required' });
    }
    
    try {
      if (io) {
        io.to(room).emit(event, payload);
        return res.status(200).json({ success: true, message: `Bridged event ${event} to room ${room}` });
      } else {
        return res.status(500).json({ success: false, message: 'Socket.IO is not initialized on this server instance' });
      }
    } catch (error) {
      console.error('[Socket Bridge] Error forwarding event:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Start medicine reminder cron jobs in persistent server mode
  connectDB().then(() => {
    try {
      const { startReminderCron, syncReminderSchedule, resetMissedNotifications, setSocketIO } = require('./cron/reminderCron');
      setSocketIO(io);
      syncReminderSchedule().then(() => {
        resetMissedNotifications();
        startReminderCron();
      });
    } catch (cronError) {
      console.error('[Cron] Failed to initialize reminder scheduler:', cronError.message);
    }
  }).catch(err => {
    console.error('[Cron] Failed to connect to DB for cron jobs:', err.message);
  });
}

// Export app for Vercel Serverless environment
module.exports = app;

if (process.env.VERCEL !== 'true') {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`); // nodemon reload triggered
  });
}