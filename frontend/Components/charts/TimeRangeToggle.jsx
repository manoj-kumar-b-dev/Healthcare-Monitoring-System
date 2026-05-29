import React from 'react';

const TimeRangeToggle = ({ timeRange, setTimeRange }) => {
  const ranges = [
    { key: 'daily', label: '24 Hours' },
    { key: 'weekly', label: '7 Days' },
    { key: 'monthly', label: '30 Days' },
  ];

  return (
    <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-0.5">
      {ranges.map((range) => (
        <button
          key={range.key}
          onClick={() => setTimeRange(range.key)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
            timeRange === range.key
              ? 'bg-white shadow-sm text-blue-600 ring-1 ring-slate-200'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
};

export default TimeRangeToggle;
