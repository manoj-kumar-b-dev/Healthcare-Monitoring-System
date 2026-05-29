import React, { memo } from 'react';
import { Heart, Droplets, Thermometer, Footprints, Pill } from 'lucide-react';

/**
 * Shows each weighted metric as a labelled progress bar.
 * Props:
 *   metrics  { heartRate, spo2, temperature, steps, calories, medicineAdherence }
 */

const METRIC_CONFIG = [
  {
    key:    'heartRate',
    label:  'Heart Rate',
    unit:   'bpm',
    weight: 25,
    icon:   Heart,
    color:  'bg-red-500',
    track:  'bg-red-100',
    text:   'text-red-600',
    normalRange: '60–100',
    toScore: (v) => {
      if (!v) return 0;
      if (v >= 60 && v <= 100) return 100;
      if (v < 60) return Math.max(0, 100 - (60 - v) * 5);
      return Math.max(0, 100 - (v - 100) * 2);
    },
  },
  {
    key:    'spo2',
    label:  'SpO₂ Level',
    unit:   '%',
    weight: 25,
    icon:   Droplets,
    color:  'bg-cyan-500',
    track:  'bg-cyan-100',
    text:   'text-cyan-600',
    normalRange: '95–100',
    toScore: (v) => {
      if (!v) return 0;
      if (v >= 95) return 100;
      return Math.max(0, 100 - (95 - v) * 15);
    },
  },
  {
    key:    'temperature',
    label:  'Temperature',
    unit:   '°C',
    weight: 15,
    icon:   Thermometer,
    color:  'bg-orange-500',
    track:  'bg-orange-100',
    text:   'text-orange-600',
    normalRange: '36.1–37.2',
    toScore: (v) => {
      if (!v) return 0;
      if (v >= 36.1 && v <= 37.2) return 100;
      if (v > 37.2 && v <= 37.5) return 80;
      if (v > 37.5) return Math.max(0, 100 - (v - 37.5) * 20);
      return Math.max(0, 100 - (36.1 - v) * 20);
    },
  },
  {
    key:    'steps',
    label:  'Daily Activity',
    unit:   'steps',
    weight: 20,
    icon:   Footprints,
    color:  'bg-blue-500',
    track:  'bg-blue-100',
    text:   'text-blue-600',
    normalRange: '10,000 goal',
    toScore: (v) => Math.min(100, ((v || 0) / 10000) * 100),
  },
  {
    key:    'medicineAdherence',
    label:  'Medicine Adherence',
    unit:   '%',
    weight: 15,
    icon:   Pill,
    color:  'bg-violet-500',
    track:  'bg-violet-100',
    text:   'text-violet-600',
    normalRange: '100 = perfect',
    toScore: (v) => Math.min(100, Math.max(0, v || 0)),
  },
];

const MetricBreakdown = memo(({ metrics }) => {
  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
        No metric data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {METRIC_CONFIG.map((m) => {
        const raw   = metrics[m.key] ?? 0;
        const score = Math.round(m.toScore(raw));
        const Icon  = m.icon;

        return (
          <div key={m.key} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg ${m.track} flex items-center justify-center`}>
                  <Icon className={`w-3.5 h-3.5 ${m.text}`} />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-700">{m.label}</span>
                  <span className="text-xs text-slate-400 ml-1.5">({m.weight}% weight)</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold ${m.text}`}>{score}</span>
                <span className="text-xs text-slate-400">/100</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className={`w-full h-2 rounded-full ${m.track} overflow-hidden`}>
              <div
                className={`h-full rounded-full ${m.color} transition-all duration-1000 ease-out`}
                style={{ width: `${score}%` }}
              />
            </div>

            {/* Raw value + range */}
            <div className="flex justify-between mt-1">
              <span className="text-xs text-slate-400">
                Value: <span className="font-medium text-slate-600">
                  {m.key === 'temperature' ? Number(raw).toFixed(1) : Math.round(raw)} {m.unit}
                </span>
              </span>
              <span className="text-xs text-slate-400">Normal: {m.normalRange}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
});

MetricBreakdown.displayName = 'MetricBreakdown';

export default MetricBreakdown;
