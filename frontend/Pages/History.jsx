import React from 'react';
import ActivityDashboard from '../Components/activity/ActivityDashboard';
import { History as HistoryIcon } from 'lucide-react';

const History = () => {
  return (
    <div className="max-w-6xl mx-auto py-2 animate-fade-in space-y-7">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <HistoryIcon className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Tracking</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Activity & Metrics</h1>
        <p className="text-slate-500 text-sm mt-1">
          Track your daily movements, steps, distance, and calorie projections interactively over the past week.
        </p>
      </div>

      <ActivityDashboard />
    </div>
  );
};

export default History;
