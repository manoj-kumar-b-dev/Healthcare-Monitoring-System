/**
 * keepWarm.js
 *
 * Prevents Render free-tier cold starts by self-pinging the server's /ping
 * endpoint every 14 minutes. Render spins down free services after 15 minutes
 * of inactivity — this keeps the process alive in production.
 *
 * Only activates when NODE_ENV === 'production'.
 * Does nothing in development so local dev is not polluted with cron logs.
 */

const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

const keepWarm = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[KeepWarm] Development mode — keep-warm disabled.');
    return;
  }

  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
  const pingUrl    = `${backendUrl}/ping`;

  console.log(`[KeepWarm] ✅ Active — pinging ${pingUrl} every 14 minutes`);

  const doPing = () => {
    fetch(pingUrl, { method: 'GET' })
      .then((res) => {
        if (res.ok) {
          console.log(`[KeepWarm] 🟢 Ping OK — server alive at ${new Date().toISOString()}`);
        } else {
          console.warn(`[KeepWarm] 🟡 Ping returned HTTP ${res.status}`);
        }
      })
      .catch((err) => {
        // Non-fatal — log and continue. Server may be restarting.
        console.warn('[KeepWarm] 🔴 Ping failed:', err.message);
      });
  };

  // Schedule recurring pings
  setInterval(doPing, PING_INTERVAL_MS);
};

module.exports = keepWarm;
