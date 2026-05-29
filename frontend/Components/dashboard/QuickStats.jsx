import React from 'react';
import { Link } from 'react-router-dom';
import { Footprints, Map, Flame, ActivitySquare, TrendingUp, ChevronRight } from 'lucide-react';

const QuickStats = ({ activities, healthScore }) => {
  const steps = activities?.steps || 0;
  const distance = activities?.distance || 0;
  const calories = activities?.caloriesBurned || 0;

  const stepGoal = 10000;
  const stepProgress = Math.min((steps / stepGoal) * 100, 100);

  const getScoreConfig = (score) => {
    if (score >= 90) return { color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-200', bar: 'bg-emerald-500', label: 'Excellent' };
    if (score >= 75) return { color: 'text-blue-600',    bg: 'bg-blue-50',    ring: 'ring-blue-200',    bar: 'bg-blue-500',    label: 'Good' };
    if (score >= 60) return { color: 'text-amber-600',   bg: 'bg-amber-50',   ring: 'ring-amber-200',   bar: 'bg-amber-500',   label: 'Fair' };
    if (score >= 40) return { color: 'text-orange-600',  bg: 'bg-orange-50',  ring: 'ring-orange-200',  bar: 'bg-orange-500',  label: 'Poor' };
    return                  { color: 'text-red-600',     bg: 'bg-red-50',     ring: 'ring-red-200',     bar: 'bg-red-500',     label: 'Critical' };
  };

  const scoreConfig = getScoreConfig(healthScore ?? 100);

  const stats = [
    {
      icon: Footprints,
      label: 'Steps Today',
      value: steps.toLocaleString(),
      sub: `/ ${stepGoal.toLocaleString()}`,
      progress: stepProgress,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      barColor: 'bg-blue-500',
      showProgress: true,
    },
    {
      icon: Map,
      label: 'Distance',
      value: typeof distance === 'number' ? distance.toFixed(2) : '0.00',
      sub: 'km covered',
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-600',
      showProgress: false,
    },
    {
      icon: Flame,
      label: 'Calories',
      value: typeof calories === 'number' ? Math.floor(calories).toLocaleString() : '0',
      sub: 'kcal burned',
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-500',
      showProgress: false,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-bold text-slate-800">Daily Activity Summary</h3>
        </div>
        <span className="text-xs text-slate-400 font-medium">Today</span>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Step/Distance/Calorie Stats */}
        {stats.map((stat, i) => (
          <div key={i} className="flex flex-col gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-lg ${stat.iconBg} flex items-center justify-center shrink-0`}>
                <stat.icon className={`w-4.5 h-4.5 ${stat.iconColor}`} />
              </div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {stat.value}
                {stat.sub && <span className="text-xs font-medium text-slate-400 ml-1">{stat.sub}</span>}
              </p>
            </div>
            {stat.showProgress && (
              <div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                  <div
                    className={`${stat.barColor} h-1.5 rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${stat.progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">{Math.round(stat.progress)}% of goal</p>
              </div>
            )}
          </div>
        ))}

        {/* Health Score */}
        <div className={`flex flex-col gap-3 p-4 ${scoreConfig.bg} rounded-xl border ring-1 ${scoreConfig.ring} hover:opacity-90 transition-opacity`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-lg bg-white/80 flex items-center justify-center shrink-0 ring-1 ${scoreConfig.ring}`}>
              <ActivitySquare className={`w-4.5 h-4.5 ${scoreConfig.color}`} />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Health Score</p>
          </div>
          <div>
            <p className={`text-3xl font-extrabold tabular-nums ${scoreConfig.color}`}>
              {healthScore ?? '--'}
              <span className="text-sm font-medium text-slate-400 ml-1">/ 100</span>
            </p>
            <span className={`text-xs font-bold ${scoreConfig.color} mt-0.5 block`}>{scoreConfig.label}</span>
          </div>
          <div className="w-full bg-white/60 rounded-full h-1.5">
            <div
              className={`${scoreConfig.bar} h-1.5 rounded-full transition-all duration-1000`}
              style={{ width: `${healthScore ?? 0}%` }}
            />
          </div>
          <Link
            to="/health-score"
            className={`flex items-center gap-1 text-xs font-semibold ${scoreConfig.color} hover:underline mt-0.5`}
          >
            View details <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default QuickStats;
