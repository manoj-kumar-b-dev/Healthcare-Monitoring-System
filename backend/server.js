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
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Middleware
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(o => o.trim());
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

// Database connection
connectDB();

// Routes
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
  console.log(`Server running on port ${PORT}`);
});