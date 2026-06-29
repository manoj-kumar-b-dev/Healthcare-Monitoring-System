import React from 'react';
import { Heart, Activity, Thermometer, ArrowUp, ArrowDown, Minus, TrendingUp } from 'lucide-react';

const VitalSignCard = ({ type, value, previousValue }) => {
  const config = {
    heartRate: {
      label: 'Heart Rate',
      unit: 'bpm',
      icon: Heart,
      gradient: 'from-rose-500 to-red-600',
      lightBg: 'bg-rose-50',
      ringColor: 'ring-rose-200',
      iconColor: 'text-rose-600',
      evaluate: (v) => {
        if (!v) return 'gray';
        if (v >= 60 && v <= 100) return 'green';
        if ((v >= 50 && v <= 59) || (v >= 101 && v <= 110)) return 'yellow';
        return 'red';
      }
    },
    spo2: {
      label: 'Blood Oxygen (SpO₂)',
      unit: '%',
      icon: Activity,
      gradient: 'from-cyan-500 to-teal-600',
      lightBg: 'bg-cyan-50',
      ringColor: 'ring-cyan-200',
      iconColor: 'text-cyan-600',
      evaluate: (v) => {
        if (!v) return 'gray';
        if (v >= 95) return 'green';
        if (v >= 92 && v <= 94) return 'yellow';
        return 'red';
      }
    },
    temperature: {
      label: 'Body Temperature',
      unit: '°C',
      icon: Thermometer,
      gradient: 'from-orange-500 to-amber-600',
      lightBg: 'bg-orange-50',
      ringColor: 'ring-orange-200',
      iconColor: 'text-orange-600',
      evaluate: (v) => {
        if (!v) return 'gray';
        if (v >= 36.0 && v <= 37.2) return 'green';
        if ((v >= 37.3 && v <= 37.5) || (v >= 35.5 && v <= 35.9)) return 'yellow';
        return 'red';
      }
    }
  };

  const currentConfig = config[type] || config['heartRate'];
  const status = currentConfig.evaluate(value);
  const Icon = currentConfig.icon;

  const statusMap = {
    green: {
      border: 'border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-700',
      label: 'Normal',
      dotColor: 'bg-emerald-500',
    },
    yellow: {
      border: 'border-amber-200',
      badge: 'bg-amber-100 text-amber-700',
      label: 'Moderate',
      dotColor: 'bg-amber-500',
    },
    red: {
      border: 'border-red-300',
      badge: 'bg-red-100 text-red-700',
      label: 'Critical',
      dotColor: 'bg-red-500',
    },
    gray: {
      border: 'border-slate-200',
      badge: 'bg-slate-100 text-slate-500',
      label: 'No Data',
      dotColor: 'bg-slate-400',
    },
  };

  const current = statusMap[status];

  const getTrend = () => {
    if (!previousValue || !value) return null;
    const diff = value - previousValue;
    if (Math.abs(diff) < 0.5) return { icon: Minus, color: 'text-slate-400', label: 'Stable' };
    return diff > 0
      ? { icon: ArrowUp, color: status === 'red' ? 'text-red-500' : 'text-amber-500', label: `+${diff.toFixed(1)}` }
      : { icon: ArrowDown, color: 'text-emerald-500', label: diff.toFixed(1) };
  };

  const trend = getTrend();

  return (
    <div className={`relative bg-white rounded-2xl p-5 border-2 ${current.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 group overflow-hidden`}>
      {/* Background gradient accent */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br ${currentConfig.gradient} opacity-5 -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-125`} />

      {/* Header Row */}
      <div className="flex items-start justify-between mb-4 relative">
        <div className={`p-2.5 rounded-xl ${currentConfig.lightBg} ring-2 ${currentConfig.ringColor}`}>
          <Icon
            className={`w-6 h-6 ${currentConfig.iconColor} ${type === 'heartRate' && value ? 'animate-heartbeat' : ''}`}
          />
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {/* Status badge */}
          <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${current.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${current.dotColor} ${status === 'red' ? 'animate-pulse' : ''}`} />
            {current.label}
          </span>
          {/* Trend */}
          {trend && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${trend.color}`}>
              <trend.icon className="w-3 h-3" />
              {trend.label}
            </span>
          )}
        </div>
      </div>

      {/* Value */}
      <div className="relative">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{currentConfig.label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight tabular-nums transition-all duration-500">
            {value ?? '--'}
          </span>
          <span className="text-slate-400 font-semibold text-sm">{currentConfig.unit}</span>
        </div>
      </div>

      {/* Critical pulse overlay */}
      {status === 'red' && (
        <div className="absolute inset-0 rounded-2xl ring-2 ring-red-400 ring-offset-0 animate-ping opacity-20 pointer-events-none" />
      )}
    </div>
  );
};

export default VitalSignCard;
