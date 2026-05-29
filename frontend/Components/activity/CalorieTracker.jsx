import React from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, YAxis, CartesianGrid } from 'recharts';
import { Flame, Info } from 'lucide-react';

const CalorieTracker = ({ currentCalories = 0, weeklyData = [], activeProfile }) => {
  // Formula tooltip
  const formulaExplanation = `Calories are estimated using the Harris-Benedict equation adapted for steps. BMR is calculated via Height/Weight/Age constants, and step distance acts as an activity multiplier.`;

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Energy Burn
          </h3>
          <p className="text-xs text-gray-500 font-medium tracking-wide uppercase mt-1">Calorie Expenditure</p>
        </div>
        <div className="group relative">
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <Info className="w-5 h-5" />
          </button>
          <div className="absolute right-0 w-64 p-3 bg-gray-900 border border-gray-700 text-white text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none mt-2">
            {formulaExplanation}
          </div>
        </div>
      </div>

      <div className="mb-8 flex items-baseline gap-2">
        <span className="text-4xl font-black text-gray-900 tracking-tight">{currentCalories.toLocaleString()}</span>
        <span className="text-lg font-bold text-orange-500">kcal</span>
      </div>

      <div className="flex-1 w-full min-h-[160px]">
        {weeklyData && weeklyData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={160}>
            <AreaChart data={weeklyData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                formatter={(value) => [`${value} kcal`, 'Burned']}
              />
              <Area type="monotone" dataKey="calories" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorCalories)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 font-medium text-sm">
            Not enough data for trending.
          </div>
        )}
      </div>
    </div>
  );
};

export default CalorieTracker;
