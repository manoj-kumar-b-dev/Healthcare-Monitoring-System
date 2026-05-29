import React from 'react';
import { Star, TrendingUp, Award, Footprints, Droplets, Pill, Lock } from 'lucide-react';

/**
 * Renders achievement badge cards.
 * Props:
 *   badges  {Array<{id, label, description, icon, earned}>}
 */

const ICON_MAP = {
  star:        Star,
  'trending-up': TrendingUp,
  award:       Award,
  footprints:  Footprints,
  'heart-pulse': Droplets,
  pill:        Pill,
};

const AchievementBadges = ({ badges = [] }) => {
  if (!badges || badges.length === 0) return null;

  const earned  = badges.filter(b => b.earned);
  const locked  = badges.filter(b => !b.earned);

  return (
    <div className="space-y-3">
      {/* Earned */}
      {earned.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
            🏅 Earned Badges
          </p>
          <div className="grid grid-cols-2 gap-2">
            {earned.map((badge) => {
              const Icon = ICON_MAP[badge.icon] ?? Star;
              return (
                <div
                  key={badge.id}
                  className="flex items-center gap-2.5 p-3 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl shadow-sm"
                >
                  <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center shadow-md shadow-amber-300/50 shrink-0">
                    <Icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-amber-800 leading-tight truncate">{badge.label}</p>
                    <p className="text-[10px] text-amber-600 leading-tight mt-0.5 line-clamp-2">{badge.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            🔒 Locked Badges
          </p>
          <div className="grid grid-cols-2 gap-2">
            {locked.map((badge) => {
              const Icon = ICON_MAP[badge.icon] ?? Star;
              return (
                <div
                  key={badge.id}
                  className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl opacity-60"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center shrink-0 relative">
                    <Icon className="w-4.5 h-4.5 text-slate-400" />
                    <Lock className="w-2.5 h-2.5 text-slate-400 absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-500 leading-tight truncate">{badge.label}</p>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5 line-clamp-2">{badge.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {earned.length === 0 && locked.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">Keep tracking to earn badges!</p>
      )}
    </div>
  );
};

export default AchievementBadges;
