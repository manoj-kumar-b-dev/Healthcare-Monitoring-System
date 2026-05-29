import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { History, Footprints, Calendar, Flame, Map } from 'lucide-react';

const StepHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.activities.getWeekly();
        const data = response.data || [];
        setHistory(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch step history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3">
        <div className="w-9 h-9 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        <p className="text-slate-400 text-sm">Loading step history...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <History className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">History</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Step History</h1>
        <p className="text-slate-500 text-sm mt-1">
          View your walking history and progress over the past week.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-4">
          {history.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No step history available</p>
          ) : (
            history.map((day, index) => {
              const date = new Date(day.date);
              const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
              const progress = Math.min((day.steps / 10000) * 100, 100);

              return (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{dayName}</p>
                      <p className="text-xs text-slate-500">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900 tabular-nums">{day.steps.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">steps</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900">{typeof day.caloriesBurned === 'number' ? Math.floor(day.caloriesBurned) : 0}</p>
                      <p className="text-xs text-slate-500">calories</p>
                    </div>
                    <div className="w-24">
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-xs text-slate-400 text-right mt-1">{Math.round(progress)}%</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default StepHistory;