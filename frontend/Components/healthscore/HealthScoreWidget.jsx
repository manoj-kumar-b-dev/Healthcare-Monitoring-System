import React, { memo } from 'react';
import { useHealthScore } from '../../context/HealthScoreContext';
import CircularGauge from './CircularGauge';
import { RefreshCw, Clock, AlertCircle } from 'lucide-react';

/**
 * Compact dashboard widget showing the health score.
 * Displayed on the main Dashboard page.
 *
 * Wrapped in React.memo so it only re-renders when its own props change
 * (it has none) or when the context values it consumes actually change.
 */

const STATUS_STYLES = {
  Excellent: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  Good:      'bg-blue-50   border-blue-200   text-blue-700',
  Fair:      'bg-amber-50  border-amber-200  text-amber-700',
  Poor:      'bg-orange-50 border-orange-200 text-orange-700',
  Critical:  'bg-red-50    border-red-200    text-red-700',
};

const STATUS_PILL = {
  Excellent: 'bg-emerald-500',
  Good:      'bg-blue-500',
  Fair:      'bg-amber-500',
  Poor:      'bg-orange-500',
  Critical:  'bg-red-500',
};

const HealthScoreWidget = memo(() => {
  // Use `isFetching` (subtle indicator) instead of `loading` (full skeleton)
  // so the card does NOT re-mount/flash on background refreshes.
  const { score, status, insights, lastUpdated, loading, isFetching, error, refetch } = useHealthScore();

  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.Fair;

  // Format last updated time — updates once per 30s so no continuous churn
  const updatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors duration-500 ${statusStyle}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-inherit flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status && (
            <span className={`w-2.5 h-2.5 rounded-full ${STATUS_PILL[status] ?? 'bg-slate-400'} animate-pulse`} />
          )}
          <h3 className="text-sm font-bold text-slate-800">Overall Health Score</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Last updated timestamp */}
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            {updatedStr}
          </span>

          {/* Subtle fetching indicator: spins during background refresh,
              but does NOT unmount / remount the gauge or insights */}
          <button
            onClick={refetch}
            disabled={loading || isFetching}
            aria-label="Recalculate health score"
            title={isFetching ? 'Refreshing…' : 'Refresh health score'}
            className="p-1.5 rounded-lg hover:bg-white/70 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 ${(loading || isFetching) ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      <div className="p-5 flex flex-col sm:flex-row items-center gap-6">
        {/* Circular gauge — only shows skeleton on very first load, not on refreshes */}
        <div className="shrink-0">
          {loading ? (
            <div className="w-[130px] h-[130px] rounded-full border-8 border-slate-200 animate-pulse" />
          ) : error ? (
            <div className="w-[130px] h-[130px] flex flex-col items-center justify-center text-red-400 gap-1">
              <AlertCircle className="w-8 h-8" />
              <span className="text-xs text-center">Score unavailable</span>
            </div>
          ) : (
            // Gauge stays mounted during isFetching — no flicker
            <CircularGauge score={score ?? 0} status={status ?? 'Fair'} size={130} stroke={13} />
          )}
        </div>

        {/* Insights preview — skeleton only on first load */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-3 bg-slate-200 rounded animate-pulse" style={{ width: `${70 + i * 10}%` }} />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : (
            <ul className="space-y-1.5">
              {(insights ?? []).slice(0, 3).map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-60" />
                  <span className="leading-snug">{insight}</span>
                </li>
              ))}
              {(insights ?? []).length > 3 && (
                <li className="text-xs text-slate-400 pl-3.5">
                  +{insights.length - 3} more insights…
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

    </div>
  );
});

HealthScoreWidget.displayName = 'HealthScoreWidget';

export default HealthScoreWidget;
