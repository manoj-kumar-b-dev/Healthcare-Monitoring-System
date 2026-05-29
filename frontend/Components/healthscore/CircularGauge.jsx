import React, { memo, useEffect, useRef } from 'react';

/**
 * Animated SVG circular progress gauge.
 *
 * Props:
 *  score  {number}  0–100
 *  status {string}  'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical'
 *  size   {number}  Diameter in px (default 200)
 *  stroke {number}  Ring thickness (default 18)
 */

const STATUS_COLORS = {
  Excellent: { stroke: '#10B981', glow: '#10B98140', text: 'text-emerald-600', bg: 'from-emerald-500 to-teal-400' },
  Good:      { stroke: '#3B82F6', glow: '#3B82F640', text: 'text-blue-600',    bg: 'from-blue-500 to-cyan-400' },
  Fair:      { stroke: '#F59E0B', glow: '#F59E0B40', text: 'text-amber-600',   bg: 'from-amber-500 to-yellow-400' },
  Poor:      { stroke: '#F97316', glow: '#F9731640', text: 'text-orange-600',  bg: 'from-orange-500 to-amber-400' },
  Critical:  { stroke: '#EF4444', glow: '#EF444440', text: 'text-red-600',     bg: 'from-red-500 to-rose-400' },
};

const CircularGauge = memo(({ score = 0, status = 'Fair', size = 200, stroke = 18 }) => {
  const circleRef  = useRef(null);
  const config     = STATUS_COLORS[status] ?? STATUS_COLORS.Fair;
  const safeScore  = Math.min(100, Math.max(0, score ?? 0));

  const radius        = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset        = circumference * (1 - safeScore / 100);
  const cx            = size / 2;
  const cy            = size / 2;

  // Animate the stroke-dashoffset on mount / score change
  useEffect(() => {
    if (!circleRef.current) return;
    circleRef.current.style.transition = 'none';
    circleRef.current.style.strokeDashoffset = circumference;

    // Trigger animation on next paint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (circleRef.current) {
          circleRef.current.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
          circleRef.current.style.strokeDashoffset = offset;
        }
      });
    });
  }, [score, offset, circumference]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <defs>
          <linearGradient id={`gaugeGrad-${status}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={config.stroke} stopOpacity="0.9" />
            <stop offset="100%" stopColor={config.stroke} stopOpacity="0.6" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={stroke}
        />

        {/* Progress arc */}
        <circle
          ref={circleRef}
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={`url(#gaugeGrad-${status})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          filter="url(#glow)"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-extrabold tabular-nums ${config.text}`} style={{ fontSize: size * 0.22 }}>
          {safeScore}
        </span>
        <span className="text-slate-400 font-semibold" style={{ fontSize: size * 0.075 }}>
          / 100
        </span>
        <span className={`font-bold mt-0.5 ${config.text}`} style={{ fontSize: size * 0.085 }}>
          {status}
        </span>
      </div>
    </div>
  );
});

CircularGauge.displayName = 'CircularGauge';

export default CircularGauge;
