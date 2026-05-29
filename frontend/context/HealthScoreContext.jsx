import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { api } from '../services/api';
import { useSocket } from './SocketContext';

// ─── Constants ─────────────────────────────────────────────────────────────────
/** How often (ms) to auto-refresh the health score in the background. */
const POLL_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Minimum gap (ms) between two socket-triggered re-fetches.
 * Prevents a flood of API calls when vitals stream in rapidly (every 5s).
 */
const SOCKET_DEBOUNCE_MS = 30_000; // only re-fetch once per 30s from socket events

// ─── Context ──────────────────────────────────────────────────────────────────

const HealthScoreContext = createContext(null);

/**
 * Provides the latest health score to all children.
 *
 * Auto-refreshes when:
 *  - Component mounts (initial load)
 *  - Every 30 seconds via polling interval
 *  - A `vitals:update` socket event fires AND at least 30s have passed since
 *    the last socket-triggered fetch (debounced to avoid per-second API calls)
 *  - `refetch()` is called manually (e.g. Refresh button)
 *
 * Root-cause fix:
 *  - The backend emits `vitals:update` every 5 seconds. Without debouncing,
 *    the old code was calling the health-score API every ~6 seconds, causing
 *    continuous re-renders and flickering.
 *  - The `status` state change was also causing HealthScore.jsx's
 *    `useEffect([status])` to fire fetchSummary() on every socket event,
 *    creating a cascade of redundant API calls.
 */
export const HealthScoreProvider = ({ children }) => {
  const { socket } = useSocket();

  const [score,       setScore]       = useState(null);
  const [status,      setStatus]      = useState(null);
  const [insights,    setInsights]    = useState([]);
  const [metrics,     setMetrics]     = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [isFetching,  setIsFetching]  = useState(false); // subtle indicator (not full-screen)

  // Track the timestamp of the last socket-triggered fetch so we can debounce
  const lastSocketFetchRef = useRef(0);
  // Track whether a fetch is already in-flight so we never duplicate requests
  const fetchInFlightRef = useRef(false);

  // ─── Core fetch function ───────────────────────────────────────────────────
  const fetchLatest = useCallback(async (showFullLoader = false) => {
    // Safety guard: never call the API without a token
    if (!localStorage.getItem('healthcare_token')) {
      setLoading(false);
      return;
    }

    // Prevent duplicate concurrent requests
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;

    try {
      // On the very first load, show the full skeleton loader.
      // On background refreshes, only toggle the subtle spinner.
      if (showFullLoader) {
        setLoading(true);
      } else {
        setIsFetching(true);
      }
      setError(null);

      const res  = await api.healthScore.getLatest();
      const data = res.data?.data;

      if (data) {
        // Only update state when values actually change to avoid unnecessary
        // child re-renders triggered by reference-equal-but-new objects.
        setScore((prev)    => (prev === (data.score ?? null)   ? prev : (data.score ?? null)));
        setStatus((prev)   => (prev === (data.status ?? null)  ? prev : (data.status ?? null)));
        setInsights((prev) => {
          const next = data.insights ?? [];
          return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
        });
        setMetrics((prev) => {
          const next = data.metrics ?? null;
          return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
        });
        setLastUpdated(data.timestamp ? new Date(data.timestamp) : new Date());
      }
    } catch (err) {
      console.error('[HealthScoreContext] Failed to fetch health score:', err);
      setError(err.response?.data?.message || 'Failed to load health score');
    } finally {
      setLoading(false);
      setIsFetching(false);
      fetchInFlightRef.current = false;
    }
  }, []); // No dependencies — stable reference across renders

  // ─── Initial fetch on mount ────────────────────────────────────────────────
  useEffect(() => {
    fetchLatest(true); // show full skeleton only on first load
  }, [fetchLatest]);

  // ─── Polling: refresh every 30 seconds in the background ──────────────────
  useEffect(() => {
    const id = setInterval(() => {
      fetchLatest(false); // silent background refresh
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id); // always clean up on unmount
  }, [fetchLatest]);

  // ─── Socket-driven refresh (debounced) ────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleVitalsUpdate = () => {
      const now = Date.now();
      const elapsed = now - lastSocketFetchRef.current;

      // Only re-fetch if at least SOCKET_DEBOUNCE_MS has passed since the last
      // socket-triggered fetch. This prevents a new API call every 5 seconds.
      if (elapsed >= SOCKET_DEBOUNCE_MS) {
        lastSocketFetchRef.current = now;
        // Small delay so the backend has time to recalculate the score
        setTimeout(() => fetchLatest(false), 1000);
      }
    };

    socket.on('vitals:update', handleVitalsUpdate);
    return () => socket.off('vitals:update', handleVitalsUpdate);
  }, [socket, fetchLatest]);

  // ─── Public refetch (for manual refresh button) ───────────────────────────
  const refetch = useCallback(() => {
    lastSocketFetchRef.current = Date.now(); // reset debounce on manual refresh
    fetchLatest(false);
  }, [fetchLatest]);

  // ─── Stable context value (memoized to prevent unnecessary child renders) ──
  const value = useMemo(() => ({
    score,
    status,
    insights,
    metrics,
    lastUpdated,
    loading,
    isFetching,
    error,
    refetch,
  }), [score, status, insights, metrics, lastUpdated, loading, isFetching, error, refetch]);

  return (
    <HealthScoreContext.Provider value={value}>
      {children}
    </HealthScoreContext.Provider>
  );
};

/**
 * Hook to consume the health score context.
 * Must be used inside <HealthScoreProvider>.
 */
export const useHealthScore = () => {
  const ctx = useContext(HealthScoreContext);
  if (!ctx) {
    throw new Error('useHealthScore must be used within a HealthScoreProvider');
  }
  return ctx;
};

export default HealthScoreContext;
