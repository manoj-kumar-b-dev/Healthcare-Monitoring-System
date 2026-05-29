const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
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
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
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


// Database connection
// bufferCommands: false — operations fail fast on DB disconnect instead of
// silently queuing, which would cause invisible hangs in production.
mongoose.set('bufferCommands', false);
connectDB();

// ─── Keep-warm (production only) ────────────────────────────────────────────
// Self-pings every 14 min to prevent Render free-tier cold starts (15 min idle).
keepWarm();

// Routes
// ── Health-check / keep-warm ping (no auth, responds in microseconds) ────────
app.get('/ping', (req, res) => res.status(200).json({ status: 'ok', ts: Date.now() }));
app.use("/", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/vitals", vitalsRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/user", userRoutes);
app.use("/api/activities", activityRoutes);
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
const initializeSockets = require("./socket");
initializeSockets(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`); // nodemon reload triggered
});