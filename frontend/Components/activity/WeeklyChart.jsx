import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';

const WeeklyChart = ({ data, goal = 10000 }) => {
  // data format expected: [{ day: 'Mon', steps: 8500 }, ...]

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border-none text-white p-3 rounded-lg shadow-xl">
          <p className="font-bold mb-1">{label}</p>
          <p className="text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            {payload[0].value.toLocaleString()} steps
          </p>
        </div>
      );
    }
    return null;
  };

   return (
     <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-full flex flex-col w-full min-w-0">
       <div className="mb-6">
         <h3 className="font-bold text-gray-800 text-lg">Weekly Activity</h3>
         <p className="text-xs text-gray-500 font-medium tracking-wide uppercase mt-1">Steps vs Daily Goal</p>
       </div>
       
       <div className="flex-1 w-full min-h-[250px] min-w-0">
        {data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 600 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#94a3b8' }} 
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 4 }} />
              
              {/* Goal Line */}
              <ReferenceLine y={goal} stroke="#10b981" strokeDasharray="4 4" strokeWidth={2} label={{ position: 'top', value: 'GOAL', fill: '#10b981', fontSize: 10, fontWeight: 'bold' }} />
              
              <Bar 
                dataKey="steps" 
                fill="#3b82f6" 
                radius={[6, 6, 6, 6]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 font-medium text-sm">
            No activity data available.
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyChart;
