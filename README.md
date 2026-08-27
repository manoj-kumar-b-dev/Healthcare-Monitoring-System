<div align="center">

# 🏥 HealthSynq

### *Your Personal Health Companion — All in One Dashboard*

A full-stack personal health monitoring platform with real-time vitals tracking, intelligent health scoring, medicine reminders, emergency alerts, and exportable health reports.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express%205-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io)
[![Vite](https://img.shields.io/badge/Vite-Rolldown-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running Locally](#running-locally)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)

---

## 🌟 Overview

**HealthSynq** is a comprehensive personal health monitoring web application designed to give users full visibility into their health from a single, beautiful dashboard. Whether you want to track daily vitals, monitor your step count, get reminders for medications, or instantly notify your emergency contacts — HealthSynq has you covered.

The platform is built as a production-grade full-stack application with a **React + Vite** SPA on the frontend and a **Node.js + Express + MongoDB** REST API on the backend, connected via **Socket.IO** for real-time features and secured with **JWT authentication**, rate limiting, and NoSQL injection prevention.

---

## ✨ Features

### 📊 Dashboard
Central hub displaying a live overview of your health score, recent vitals, daily activity summary, active reminders, and emergency alert status — all updated in real-time.

### 💓 Vital Signs Tracking
Log and visualize key health metrics including heart rate, blood pressure (systolic/diastolic), oxygen saturation (SpO₂), body temperature, and more. Historical trends are displayed as interactive charts.

### 🏃 Activity Monitoring
Track daily step counts with automatic session detection, view step history over time with rich chart visualizations, and monitor physical activity patterns.

### 🧠 Health Score Engine
An intelligent scoring engine computes a personal wellness score based on a combination of vitals quality, activity levels, medication adherence, and tracking consistency — giving you a single number to gauge your overall health.

### 💊 Medicine Reminders
A powerful scheduling system backed by server-side cron jobs that sends timely reminders via:
- 📧 **Email** — Nodemailer (Gmail OAuth2) or Resend API
- 📱 **SMS** — Twilio Messaging Service

Supports multiple reminder times per medicine, snooze, and acknowledgement tracking.

### 🚨 Emergency Alerts
One-tap emergency notifications delivered instantly to your registered contacts via real-time Socket.IO events, email, and SMS. Full alert history is stored and viewable in the app.

### 📋 Health Reports
Generate and download comprehensive health reports in:
- 📄 **PDF** — Styled with PDFKit, includes charts and vitals summary
- 📊 **CSV** — Export raw health data for spreadsheet analysis

### 👤 User Profile
Manage personal health details — age, weight, height, blood type, and medical conditions — with Firebase-powered profile picture uploads.

### 🔐 Secure Authentication
- JWT-based authentication with configurable expiry
- bcrypt password hashing
- Rate limiting on auth endpoints (5 attempts / 15 min)
- NoSQL injection prevention via `express-mongo-sanitize`
- CORS with configurable allowed origins

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 19 | UI component framework |
| **Vite** (rolldown) | 7 | Build tool & dev server |
| **Tailwind CSS** | v4 | Utility-first styling |
| **React Router** | v7 | Client-side routing |
| **Socket.IO Client** | 4.x | Real-time WebSocket communication |
| **Chart.js / Recharts** | latest | Data visualization & charts |
| **Framer Motion** | 12 | Animations & transitions |
| **Firebase** | 12 | Profile image storage |
| **Axios** | 1.x | HTTP client |
| **react-toastify** | 11 | Toast notifications |
| **date-fns** | 4 | Date formatting utilities |
| **lucide-react** | latest | Icon library |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Node.js + Express** | Express 5 | REST API server |
| **MongoDB + Mongoose** | 9.x | Database & ODM |
| **Socket.IO** | 4.x | Real-time WebSockets |
| **JSON Web Token** | 9.x | Authentication tokens |
| **bcrypt** | 6.x | Password hashing |
| **Nodemailer** | 8.x | Email delivery (Gmail OAuth2) |
| **Twilio** | 6.x | SMS notifications |
| **PDFKit** | 0.18 | PDF report generation |
| **json2csv** | 6.x | CSV export |
| **node-cron** | 4.x | Scheduled reminder jobs |
| **express-rate-limit** | 8.x | API abuse protection |
| **express-mongo-sanitize** | 2.x | NoSQL injection prevention |

---

## 🏗️ Architecture

```
HealthSynq/
│
├── frontend/                   # React + Vite SPA
│   ├── App.jsx                 # Root component, router setup
│   ├── main.jsx                # Entry point
│   ├── index.css               # Global styles
│   │
│   ├── Pages/                  # Route-level page components
│   │   ├── Dashboard.jsx       # Main health overview
│   │   ├── Profile.jsx         # User health profile
│   │   ├── Reminders.jsx       # Medicine reminder manager
│   │   ├── EmergencyContacts.jsx  # Emergency contact management
│   │   ├── Reports.jsx         # Report generation & download
│   │   ├── History.jsx         # Activity history
│   │   └── StepHistory.jsx     # Step tracking history
│   │
│   ├── Components/             # Reusable UI components
│   │   ├── Auth/               # Login / Register forms
│   │   ├── layout/             # App shell, navigation, sidebar
│   │   ├── dashboard/          # Dashboard widgets
│   │   ├── charts/             # Chart components
│   │   ├── activity/           # Activity tracking UI
│   │   ├── alerts/             # Alert notification UI
│   │   ├── healthscore/        # Health score display
│   │   └── reminders/          # Reminder UI components
│   │
│   ├── context/                # React Context providers
│   │   ├── AuthContext.jsx     # Auth state & JWT management
│   │   ├── SocketContext.jsx   # Socket.IO connection
│   │   └── HealthScoreContext.jsx  # Health score state
│   │
│   ├── hooks/                  # Custom React hooks
│   ├── services/               # Axios API service layer
│   └── utils/                  # Helper utilities
│
└── backend/                    # Node.js + Express REST API
    ├── server.js               # App entry — middleware, routes, Socket.IO
    ├── db.js                   # MongoDB connection
    ├── socket.js               # Socket.IO event handlers
    │
    ├── routes/                 # Route definitions
    │   ├── authRoutes.js       # POST /api/auth/*
    │   ├── vitalsRoutes.js     # GET/POST /api/vitals
    │   ├── activityRoutes.js   # GET/POST /api/activities
    │   ├── reminderRoutes.js   # CRUD /api/reminders
    │   ├── alertRoutes.js      # GET/POST /api/alerts
    │   ├── contactRoutes.js    # CRUD /api/contacts
    │   ├── reportRoutes.js     # GET /api/reports
    │   ├── healthScoreRoutes.js # GET /api/health-score
    │   └── userRoutes.js       # GET/PUT /api/user
    │
    ├── controllers/            # Business logic per domain
    ├── models/                 # Mongoose schemas
    │   ├── User.js
    │   ├── VitalSign.js
    │   ├── Activity.js
    │   ├── ActivitySession.js
    │   ├── MedicineReminder.js
    │   ├── Alert.js
    │   ├── EmergencyAlertHistory.js
    │   ├── HealthScore.js
    │   └── Report.js
    │
    ├── middleware/             # Auth guard, request validation
    ├── services/               # Email & notification services
    ├── cron/                   # Scheduled medicine reminder jobs
    └── utils/                  # Keep-warm, helper functions
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://npmjs.com) v9 or higher
- A [MongoDB Atlas](https://mongodb.com/atlas) account (or local MongoDB)
- A [Twilio](https://twilio.com) account *(optional — for SMS alerts)*
- A [Resend](https://resend.com) or Gmail account *(for email reminders)*
- A [Firebase](https://firebase.google.com) project *(for profile image upload)*

---

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/your-username/healthsynq.git
cd healthsynq
```

**2. Install backend dependencies**

```bash
cd backend
npm install
```

**3. Install frontend dependencies**

```bash
cd ../frontend
npm install
```

---

### Environment Variables

#### Backend — `backend/.env`

Copy the example file and fill in your values:

```bash
cp backend/.env.example backend/.env
```

| Variable | Required | Description |
|---|---|---|
| `PORT` | ✅ | Server port (default: `5000`) |
| `NODE_ENV` | ✅ | `development` or `production` |
| `FRONTEND_URL` | ✅ | Comma-separated allowed CORS origins |
| `BACKEND_URL` | ✅ | Your backend URL (for keep-warm self-ping) |
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Strong random secret (min 32 chars) |
| `JWT_EXPIRE` | ✅ | Token expiry duration (e.g., `30d`) |
| `RESEND_API_KEY` | ⚠️ | Resend API key *(Option A — recommended)* |
| `EMAIL_USER` | ⚠️ | Gmail address *(Option B — Gmail OAuth2)* |
| `GMAIL_CLIENT_ID` | ⚠️ | Gmail OAuth2 client ID |
| `GMAIL_CLIENT_SECRET` | ⚠️ | Gmail OAuth2 client secret |
| `GMAIL_REFRESH_TOKEN` | ⚠️ | Gmail OAuth2 refresh token |
| `TWILIO_ACCOUNT_SID` | ⚠️ | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | ⚠️ | Twilio Auth Token |
| `TWILIO_MESSAGING_SERVICE_SID` | ⚠️ | Twilio Messaging Service SID |

> ✅ Required &nbsp;&nbsp; ⚠️ Optional (for email/SMS features)

#### Frontend — `frontend/.env`

```bash
cp frontend/.env.example frontend/.env
```

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL (e.g., `http://localhost:5000/api`) |
| `VITE_SOCKET_URL` | Backend root URL for Socket.IO (e.g., `http://localhost:5000`) |

> **Note:** All frontend environment variables must be prefixed with `VITE_` to be exposed to the browser.

---

### Running Locally

**Start the backend server:**

```bash
cd backend
npm run dev
# Server starts at http://localhost:5000
```

**Start the frontend dev server:**

```bash
cd frontend
npm run dev
# App starts at http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser. Register a new account and start tracking your health!

---

## 📡 API Reference

All API routes are prefixed with `/api`. Protected routes require a `Bearer <token>` in the `Authorization` header.

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user | ❌ |
| `POST` | `/api/auth/login` | Login and receive JWT | ❌ |
| `GET` | `/api/vitals` | Get user's vital signs | ✅ |
| `POST` | `/api/vitals` | Log a new vital reading | ✅ |
| `GET` | `/api/activities` | Get activity records | ✅ |
| `POST` | `/api/activities` | Log a new activity | ✅ |
| `GET` | `/api/reminders` | Get all medicine reminders | ✅ |
| `POST` | `/api/reminders` | Create a medicine reminder | ✅ |
| `PUT` | `/api/reminders/:id` | Update a reminder | ✅ |
| `DELETE` | `/api/reminders/:id` | Delete a reminder | ✅ |
| `GET` | `/api/contacts` | Get emergency contacts | ✅ |
| `POST` | `/api/contacts` | Add an emergency contact | ✅ |
| `GET` | `/api/alerts` | Get alert history | ✅ |
| `POST` | `/api/alerts` | Trigger an emergency alert | ✅ |
| `GET` | `/api/health-score` | Get current health score | ✅ |
| `GET` | `/api/reports` | Download health report (PDF/CSV) | ✅ |
| `GET` | `/api/user` | Get user profile | ✅ |
| `PUT` | `/api/user` | Update user profile | ✅ |
| `GET` | `/ping` | Health check / keep-warm ping | ❌ |
| `GET` | `/api/email-status` | SMTP diagnostic check | ❌ |

---

## ☁️ Deployment

### Frontend — GitHub Pages

```bash
cd frontend
npm run deploy
```

The `deploy` script builds the Vite app and publishes the `dist/` folder to GitHub Pages via `gh-pages`.

### Backend — Render

1. Push your code to GitHub.
2. Create a new **Web Service** on [Render](https://render.com).
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `node server.js`
5. Add all environment variables from `backend/.env.example` in Render's dashboard.

> **Keep-warm:** The backend self-pings every 14 minutes to prevent Render's free-tier cold starts (15-min idle timeout).

### Backend — Vercel (Serverless)

A `vercel.json` is included for serverless deployment. Set the `VERCEL=true` environment variable in your Vercel project settings.

> **Note:** Socket.IO real-time features are **disabled** in Vercel serverless mode. Use Render for full real-time support.

### Database — MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas).
2. Whitelist your backend server's IP (or `0.0.0.0/0` for Render).
3. Copy the connection string into `MONGODB_URI`.

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. Create a feature branch: `git checkout -b feat/your-feature-name`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to your branch: `git push origin feat/your-feature-name`
5. Open a **Pull Request**

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

<div align="center">

Made with ❤️ by [Manoj Kumar B](https://github.com/manoj-kumar-b-dev)

⭐ **Star this repo if you found it helpful!**

</div>
