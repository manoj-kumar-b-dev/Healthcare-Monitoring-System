import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Cell,
} from 'recharts';
import { api } from '../../services/api';
import { Calendar, RefreshCw } from 'lucide-react';

/**
 * Bar chart showing average health score per day-of-week.
 * Data comes from GET /api/health-score/summary
 */

const COLOR_FOR_SCORE = (score) => {
  if (!score) return '#E2E8F0';
  if (score >= 90) return '#10B981';
  if (score >= 75) return '#3B82F6';
  if (score >= 60) return '#F59E0B';
  if (score >= 40) return '#F97316';
  return '#EF4444';
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value;
  if (!score) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-xl text-xs text-slate-400">
        {label}: No data
      </div>
    );
  }
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-xl">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR_FOR_SCORE(score) }} />
        <span className="font-bold text-slate-800">Avg: {score}</span>
        <span className="text-xs text-slate-400">/ 100</span>
      </div>
    </div>
  );
};

const WeeklySummary = () => {
  const [data,    setData]    = useState([]);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.healthScore.getSummary();
      const { weeklyAverages, stats: s } = res.data?.data ?? {};
      setData(weeklyAverages ?? []);
      setStats(s ?? null);
    } catch (err) {
      console.error('[WeeklySummary] fetch error:', err);
      setError('Failed to load weekly summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, []);

  const hasData = data.some(d => d.avg !== null);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-bold text-slate-800">Weekly Breakdown</h3>
        </div>
        {stats && (
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>Avg <span className="font-bold text-slate-700">{stats.average}</span></span>
            <span>Best <span className="font-bold text-emerald-600">{stats.highest}</span></span>
            <span>Low <span className="font-bold text-red-500">{stats.lowest}</span></span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="p-4 h-[220px]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-red-400 text-sm">{error}</div>
        ) : !hasData ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            No weekly data yet — keep tracking your health!
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -25, bottom: 0 }} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
                ticks={[0, 50, 75, 100]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={COLOR_FOR_SCORE(entry.avg)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-3 text-xs text-slate-500">
        {[
          { label: 'Excellent (90+)', color: '#10B981' },
          { label: 'Good (75–89)',    color: '#3B82F6' },
          { label: 'Fair (60–74)',    color: '#F59E0B' },
          { label: 'Poor (40–59)',    color: '#F97316' },
          { label: 'Critical (<40)', color: '#EF4444' },
        ].map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default WeeklySummary;
