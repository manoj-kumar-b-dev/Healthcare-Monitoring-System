import React, { useState, useEffect, useCallback, memo } from 'react';
import { useHealthScore } from '../context/HealthScoreContext';
import { api } from '../services/api';
import CircularGauge from '../Components/healthscore/CircularGauge';
import MetricBreakdown from '../Components/healthscore/MetricBreakdown';
import InsightsList from '../Components/healthscore/InsightsList';
import AchievementBadges from '../Components/healthscore/AchievementBadges';
import ScoreHistoryChart from '../Components/healthscore/ScoreHistoryChart';
import WeeklySummary from '../Components/healthscore/WeeklySummary';
import {
  HeartPulse, RefreshCw, Clock, TrendingUp, TrendingDown,
  Minus, AlertCircle, Sparkles,
} from 'lucide-react';
import { toast } from 'react-toastify';

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Excellent: { gradient: 'from-emerald-500 to-teal-400',   ring: 'ring-emerald-200', badge: 'bg-emerald-100 text-emerald-800' },
  Good:      { gradient: 'from-blue-500 to-cyan-400',      ring: 'ring-blue-200',    badge: 'bg-blue-100 text-blue-800' },
  Fair:      { gradient: 'from-amber-500 to-yellow-400',   ring: 'ring-amber-200',   badge: 'bg-amber-100 text-amber-800' },
  Poor:      { gradient: 'from-orange-500 to-amber-400',   ring: 'ring-orange-200',  badge: 'bg-orange-100 text-orange-800' },
  Critical:  { gradient: 'from-red-500 to-rose-400',       ring: 'ring-red-200',     badge: 'bg-red-100 text-red-800' },
};

// ─── Improvement suggestions per status ───────────────────────────────────────
const SUGGESTIONS = {
  Excellent: [
    '🌟 Maintain your current healthy habits.',
    '🏃 Keep up the regular physical activity.',
    '💊 Continue perfect medicine adherence.',
  ],
  Good: [
    '🎯 Push for 10,000 steps every day.',
    '💧 Ensure adequate hydration throughout the day.',
    '😴 Prioritize 7–9 hours of quality sleep.',
  ],
  Fair: [
    '🚶 Increase daily steps by at least 2,000.',
    '💊 Set medicine reminders to stay on track.',
    '🥗 Add more fruits and vegetables to your diet.',
    '📊 Log vitals daily for better score accuracy.',
  ],
  Poor: [
    '🏥 Consider consulting your healthcare provider.',
    '💊 Review and set all medicine reminders.',
    '🚶 Start with short 15-minute walks daily.',
    '📉 Monitor your vitals at least twice daily.',
    '🛌 Ensure adequate rest and reduce stress.',
  ],
  Critical: [
    '🚨 Please consult a healthcare professional immediately.',
    '📞 Contact your emergency contacts if you feel unwell.',
    '💊 Ensure all critical medications are taken on time.',
    '🏥 Consider visiting the nearest healthcare facility.',
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────
const HealthScorePage = () => {
  const { score, status, insights, metrics, lastUpdated, loading, isFetching, error, refetch } = useHealthScore();

  const [summary,        setSummary]        = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [recalculating,  setRecalculating]  = useState(false);
  const [activeTab,      setActiveTab]      = useState('insights'); // 'insights' | 'suggestions' | 'badges'

  const config      = STATUS_CONFIG[status] ?? STATUS_CONFIG.Fair;
  const suggestions = SUGGESTIONS[status] ?? SUGGESTIONS.Fair;

  // ─── Fetch summary (badges, trend, weekly) ────────────────────────────────
  // ROOT CAUSE FIX: Previously this was `useEffect(() => fetchSummary(), [status])`.
  // Since `status` changes every time the health score re-fetches from the socket,
  // this was calling fetchSummary() every 5–6 seconds, causing constant network
  // requests and cascading re-renders.
  //
  // Fix: Fetch summary only ONCE on mount. It refreshes naturally when the user
  // hits Recalculate. The summary data (badges, weekly averages) does not need
  // real-time updates — it is a slow-moving aggregate.
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await api.healthScore.getSummary();
      setSummary(res.data?.data ?? null);
    } catch {
      // non-critical; page still works without it
    } finally {
      setSummaryLoading(false);
    }
  }, []); // stable reference — no status dependency

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]); // runs only once on mount (fetchSummary is stable)

  // ─── Force recalculate (manual action) ───────────────────────────────────
  const handleRecalculate = useCallback(async () => {
    setRecalculating(true);
    try {
      await api.healthScore.calculate();
      // Run both in parallel and also refresh summary after recalculate
      await Promise.all([refetch(), fetchSummary()]);
      toast.success('Health score updated!');
    } catch {
      toast.error('Failed to recalculate score. Please try again.');
    } finally {
      setRecalculating(false);
    }
  }, [refetch, fetchSummary]);

  // ─── Trend indicator from summary ─────────────────────────────────────────
  const trendIcon = (() => {
    const t = summary?.trend;
    if (t === 'up')   return { Icon: TrendingUp,  color: 'text-emerald-600', label: 'Improving' };
    if (t === 'down') return { Icon: TrendingDown, color: 'text-red-500',     label: 'Declining' };
    return             { Icon: Minus,           color: 'text-slate-400',   label: 'Stable' };
  })();

  const updatedStr = lastUpdated
    ? lastUpdated.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  // ─── Loading skeleton — only shows on the very first load ─────────────────
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-2 space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-slate-200 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 rounded-2xl" />
          <div className="h-80 bg-slate-200 rounded-2xl" />
        </div>
        <div className="h-72 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-12 flex flex-col items-center gap-4 text-center">
        <AlertCircle className="w-16 h-16 text-red-400 opacity-60" />
        <h2 className="text-xl font-bold text-slate-700">Failed to load Health Score</h2>
        <p className="text-slate-500 text-sm max-w-sm">{error}</p>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-2 space-y-6 animate-fade-in pb-10">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <HeartPulse className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Health Intelligence</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Health Score
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Your overall health status calculated from vitals, activity, and adherence.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Subtle "Last updated" info with live fetching dot */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            {isFetching && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            )}
            <Clock className="w-3.5 h-3.5" />
            <span>Updated {updatedStr}</span>
          </div>

          <button
            onClick={handleRecalculate}
            disabled={recalculating || isFetching}
            id="recalculate-btn"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-600/25 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${(recalculating || isFetching) ? 'animate-spin' : ''}`} />
            {recalculating ? 'Calculating…' : isFetching ? 'Refreshing…' : 'Recalculate'}
          </button>
        </div>
      </div>

      {/* ── Score Hero + Metric Breakdown ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Circular gauge card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Gradient banner */}
          <div className={`h-2 bg-gradient-to-r ${config.gradient}`} />

          <div className="p-6 flex flex-col items-center gap-5">
            {/* Gauge stays mounted during isFetching — no animation reset / flicker */}
            <CircularGauge score={score ?? 0} status={status ?? 'Fair'} size={200} stroke={18} />

            {/* Status + trend row */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${config.badge} ring-2 ${config.ring}`}>
                {status ?? '—'}
              </span>
              <span className={`flex items-center gap-1.5 text-sm font-semibold ${trendIcon.color}`}>
                <trendIcon.Icon className="w-4 h-4" />
                {trendIcon.label}
              </span>
            </div>

            {/* Last updated — shown on mobile too */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              Last updated: {updatedStr}
              {isFetching && (
                <span className="ml-1 text-blue-400 font-medium">(refreshing…)</span>
              )}
            </div>

            {/* Summary stats */}
            {summary?.stats && (
              <div className="w-full grid grid-cols-3 gap-3 mt-1">
                {[
                  { label: 'Average',  value: summary.stats.average,  color: 'text-slate-700' },
                  { label: 'Highest',  value: summary.stats.highest,  color: 'text-emerald-600' },
                  { label: 'Lowest',   value: summary.stats.lowest,   color: 'text-red-500' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className={`text-lg font-extrabold tabular-nums ${color}`}>{value ?? '—'}</p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Metric breakdown card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800">Score Breakdown</h2>
          </div>
          <div className="p-6">
            <MetricBreakdown metrics={metrics} />
          </div>
        </div>
      </div>

      {/* ── Tabs: Insights / Suggestions / Badges ───────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-slate-100">
          {[
            { id: 'insights',    label: '💡 Insights' },
            { id: 'suggestions', label: '🎯 Suggestions' },
            { id: 'badges',      label: '🏅 Badges' },
          ].map(({ id, label }) => (
            <button
              key={id}
              id={`tab-${id}`}
              onClick={() => setActiveTab(id)}
              className={`px-5 py-3.5 text-sm font-semibold transition-all border-b-2 ${
                activeTab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'insights' && (
            <InsightsList insights={insights} />
          )}

          {activeTab === 'suggestions' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 mb-4">
                Based on your <strong className="text-slate-700">{status ?? 'current'}</strong> status,
                here's what we recommend:
              </p>
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-base shrink-0">{s.split(' ')[0]}</span>
                  <p className="text-sm text-slate-700 leading-snug">{s.slice(s.indexOf(' ') + 1)}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'badges' && (
            summaryLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading badges…</span>
              </div>
            ) : (
              <AchievementBadges badges={summary?.badges ?? []} />
            )
          )}
        </div>
      </div>

      {/* ── History Chart ────────────────────────────────────────────────────── */}
      <ScoreHistoryChart />

      {/* ── Weekly Summary ───────────────────────────────────────────────────── */}
      <WeeklySummary />

    </div>
  );
};

export default HealthScorePage;
