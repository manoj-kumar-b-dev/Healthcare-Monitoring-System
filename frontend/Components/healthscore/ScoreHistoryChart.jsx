import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { api } from '../../services/api';
import { TrendingUp, TrendingDown, Minus, RefreshCw, BarChart2 } from 'lucide-react';

/**
 * Area chart showing health score history.
 * Toggle between 7-day and 30-day views.
 */

const STATUS_COLOR = (score) => {
  if (score >= 90) return '#10B981';
  if (score >= 75) return '#3B82F6';
  if (score >= 60) return '#F59E0B';
  if (score >= 40) return '#F97316';
  return '#EF4444';
};

const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  if (!payload) return null;
  const color = STATUS_COLOR(payload.score);
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#fff" strokeWidth={2} />;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value;
  const color = STATUS_COLOR(score);
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 shadow-xl min-w-[130px]">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="font-bold text-slate-800 text-lg">{score}</span>
        <span className="text-xs text-slate-400">/ 100</span>
      </div>
    </div>
  );
};

const ScoreHistoryChart = () => {
  const [days,    setDays]    = useState(7);
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.healthScore.getHistory({ days });
      const raw = res.data?.data ?? [];

      // Deduplicate by day — pick the last score per day
      const byDay = {};
      raw.forEach((entry) => {
        const day = new Date(entry.timestamp).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric',
        });
        byDay[day] = { score: entry.score, status: entry.status };
      });

      const formatted = Object.entries(byDay).map(([date, vals]) => ({
        date,
        score:  vals.score,
        status: vals.status,
      }));

      setData(formatted);
    } catch (err) {
      console.error('[ScoreHistoryChart] fetch error:', err);
      setError('Failed to load score history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [days]);

  // Trend icon
  const trend = (() => {
    if (data.length < 2) return null;
    const delta = data[data.length - 1].score - data[0].score;
    if (delta >= 5)  return { icon: TrendingUp,   color: 'text-emerald-600', label: 'Trending up' };
    if (delta <= -5) return { icon: TrendingDown,  color: 'text-red-500',     label: 'Trending down' };
    return          { icon: Minus,             color: 'text-slate-400',   label: 'Stable' };
  })();

  // Chart stroke colour — use colour of latest point
  const latestScore  = data.at(-1)?.score ?? 75;
  const chartColor   = STATUS_COLOR(latestScore);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-bold text-slate-800">Score History</h3>
          {trend && (
            <span className={`flex items-center gap-1 text-xs font-semibold ${trend.color} ml-2`}>
              <trend.icon className="w-3.5 h-3.5" />
              {trend.label}
            </span>
          )}
        </div>

        {/* Day toggle */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {[7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                days === d
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 h-[280px]">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="text-sm">Loading history…</span>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-red-400 text-sm">{error}</div>
        ) : data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            <BarChart2 className="w-10 h-10 opacity-20" />
            <p className="text-sm">No history yet — calculate your score to start tracking.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={chartColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Status threshold reference lines */}
              <ReferenceLine y={90} stroke="#10B981" strokeDasharray="4 3" strokeOpacity={0.5}
                label={{ value: 'Excellent', position: 'right', fontSize: 9, fill: '#10B981' }} />
              <ReferenceLine y={75} stroke="#3B82F6" strokeDasharray="4 3" strokeOpacity={0.5}
                label={{ value: 'Good', position: 'right', fontSize: 9, fill: '#3B82F6' }} />
              <ReferenceLine y={60} stroke="#F59E0B" strokeDasharray="4 3" strokeOpacity={0.5}
                label={{ value: 'Fair', position: 'right', fontSize: 9, fill: '#F59E0B' }} />

              <Area
                type="monotone"
                dataKey="score"
                stroke={chartColor}
                strokeWidth={2.5}
                fill="url(#scoreGrad)"
                dot={<CustomDot />}
                activeDot={{ r: 6, fill: chartColor, stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer */}
      {data.length > 0 && !loading && (
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex justify-between">
          <span>{data.length} day{data.length !== 1 ? 's' : ''} tracked</span>
          <button onClick={fetchHistory} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      )}
    </div>
  );
};

export default ScoreHistoryChart;
