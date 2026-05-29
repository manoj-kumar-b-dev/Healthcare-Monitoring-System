import React from 'react';
import {
  Heart, Droplets, Thermometer, Footprints, Pill,
  AlertCircle, CheckCircle2, Info, TrendingUp, TrendingDown
} from 'lucide-react';

/**
 * Renders a list of personalized health insights with contextual icons.
 * Props:
 *   insights {string[]}  Array of insight messages
 */

// Determine the icon and colour based on keyword matching
const classifyInsight = (text = '') => {
  const t = text.toLowerCase();

  if (t.includes('excellent') || t.includes('perfect') || t.includes('on track') || t.includes('achieved')) {
    return { Icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
  }
  if (t.includes('missed') || t.includes('critical') || t.includes('low') || t.includes('high') || t.includes('immediately')) {
    return { Icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
  }
  if (t.includes('heart') || t.includes('bpm')) {
    return { Icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50 border-rose-200' };
  }
  if (t.includes('spo') || t.includes('oxygen') || t.includes('oxygenation')) {
    return { Icon: Droplets, color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200' };
  }
  if (t.includes('temperature') || t.includes('fever') || t.includes('warm')) {
    return { Icon: Thermometer, color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' };
  }
  if (t.includes('step') || t.includes('activity') || t.includes('moving') || t.includes('calorie')) {
    return { Icon: Footprints, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
  }
  if (t.includes('medicine') || t.includes('reminder')) {
    return { Icon: Pill, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' };
  }
  if (t.includes('improve') || t.includes('need') || t.includes('below') || t.includes('away')) {
    return { Icon: TrendingDown, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' };
  }
  if (t.includes('good') || t.includes('great') || t.includes('well done')) {
    return { Icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50 border-green-200' };
  }
  return { Icon: Info, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200' };
};

const InsightsList = ({ insights = [] }) => {
  if (!insights || insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
        <Info className="w-8 h-8 opacity-30" />
        <p className="text-sm">No insights yet — log your vitals to see recommendations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {insights.map((insight, idx) => {
        const { Icon, color, bg } = classifyInsight(insight);
        return (
          <div
            key={idx}
            className={`flex items-start gap-3 p-3 rounded-xl border ${bg} transition-all duration-200 hover:shadow-sm`}
          >
            <div className={`shrink-0 mt-0.5 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-sm text-slate-700 leading-snug">{insight}</p>
          </div>
        );
      })}
    </div>
  );
};

export default InsightsList;
