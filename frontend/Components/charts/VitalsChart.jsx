import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, Brush } from 'recharts';
import { api } from '../../services/api';
import TimeRangeToggle from './TimeRangeToggle';
import { BarChart2, RefreshCw, AlertCircle } from 'lucide-react';

const VitalsChart = () => {
  const [data, setData] = useState([]);
  const [timeRange, setTimeRange] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeMetric, setActiveMetric] = useState('all');

  const metrics = [
    { id: 'all', label: 'All Vitals' },
    { id: 'heartRate', label: 'Heart Rate', color: '#EF4444' },
    { id: 'spo2', label: 'SpO₂', color: '#06B6D4' },
    { id: 'temperature', label: 'Temperature', color: '#F97316' },
  ];

  /**
   * Format timestamp label based on time range
   * Daily: Show time (HH:MM)
   * Weekly: Show day and date (Mon 23)
   * Monthly: Show date (May 23)
   */
  const formatTimestampLabel = (timestamp, range) => {
    try {
      const date = new Date(timestamp);
      
      // Validate date
      if (isNaN(date.getTime())) {
        console.warn('[VitalsChart] Invalid timestamp:', timestamp);
        return 'Invalid';
      }

      if (range === 'daily') {
        // For daily: show time HH:MM
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      } else if (range === 'weekly') {
        // For weekly: show weekday and date (Mon 23)
        return date.toLocaleDateString('en-US', { 
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
      } else {
        // For monthly: show date and month (May 23)
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric'
        });
      }
    } catch (err) {
      console.error('[VitalsChart] Error formatting timestamp:', err);
      return 'Error';
    }
  };

  /**
   * Fetch vitals history from backend
   */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`[VitalsChart] Fetching vitals for timeRange: ${timeRange}`);
        
        const response = await api.vitals.getHistory({ timeRange });
        
        console.log('[VitalsChart] Raw API response:', response.data);

        // Handle multiple response formats for backward compatibility
        let vitalsData = [];
        
        if (response.data?.success && response.data?.data) {
          // New format: { success: true, data: [...], meta: {...} }
          vitalsData = response.data.data;
          console.log(`[VitalsChart] Parsed data from new format: ${vitalsData.length} records`);
        } else if (Array.isArray(response.data?.data)) {
          // Alternative format: { data: [...] }
          vitalsData = response.data.data;
          console.log(`[VitalsChart] Parsed data from array format: ${vitalsData.length} records`);
        } else if (Array.isArray(response.data)) {
          // Legacy format: direct array
          vitalsData = response.data;
          console.log(`[VitalsChart] Parsed data from legacy format: ${vitalsData.length} records`);
        }

        if (!Array.isArray(vitalsData)) {
          throw new Error('Invalid data format received from server');
        }

        // Validate and filter data
        const validatedData = vitalsData
          .filter((item) => {
            // Ensure record has required fields
            if (!item || typeof item !== 'object') {
              console.warn('[VitalsChart] Skipping invalid record:', item);
              return false;
            }

            // Ensure timestamp exists and is valid
            const timestamp = item.timestamp || item.createdAt;
            if (!timestamp) {
              console.warn('[VitalsChart] Skipping record without timestamp:', item._id);
              return false;
            }

            const dateObj = new Date(timestamp);
            if (isNaN(dateObj.getTime())) {
              console.warn('[VitalsChart] Skipping record with invalid timestamp:', timestamp);
              return false;
            }

            // Ensure vital values exist and are numbers
            if (typeof item.heartRate !== 'number' || typeof item.spo2 !== 'number' || typeof item.temperature !== 'number') {
              console.warn('[VitalsChart] Skipping record with invalid values:', item._id);
              return false;
            }

            return true;
          })
          .map((item) => ({
            _id: item._id,
            timestamp: item.timestamp || item.createdAt,
            heartRate: item.heartRate,
            spo2: item.spo2,
            temperature: item.temperature,
            anomalyFlags: item.anomalyFlags || {},
            // Compute label here for consistency
            timestampLabel: formatTimestampLabel(item.timestamp || item.createdAt, timeRange),
          }));

        console.log(`[VitalsChart] Validated ${validatedData.length} records after filtering`);

        if (validatedData.length === 0) {
          console.warn('[VitalsChart] No valid data points after validation');
          setData([]);
          setError(null);
          return;
        }

        // Sort chronologically (oldest first) for proper chart display
        const sortedData = validatedData.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        console.log(`[VitalsChart] Data ready - first: ${sortedData[0].timestampLabel}, last: ${sortedData[sortedData.length - 1].timestampLabel}`);
        
        setData(sortedData);
        setError(null);
      } catch (error) {
        console.error('[VitalsChart] Failed to fetch vitals history:', error);
        setError(error.message || 'Failed to fetch vitals data');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  /**
   * Custom tooltip for chart hover
   */
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-xl">
          <p className="font-bold text-slate-700 text-sm mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-600">{entry.name}:</span>
              <span className="font-bold text-slate-900">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800">Historical Vitals</h2>
          </div>
          <TimeRangeToggle timeRange={timeRange} setTimeRange={setTimeRange} />
        </div>

        {/* Metric Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {metrics.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMetric(m.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all border ${
                activeMetric === m.id
                  ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {m.color && (
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: activeMetric === m.id ? '#fff' : m.color }} 
                  />
                )}
                {m.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-4 h-[380px] w-full min-w-0">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin opacity-40" />
            <p className="text-sm font-medium">Loading chart data...</p>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-red-400">
            <AlertCircle className="w-12 h-12 opacity-60" />
            <p className="text-sm font-medium text-red-600">{error}</p>
            <p className="text-xs text-slate-400">Please try refreshing or check your connection</p>
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
            <BarChart2 className="w-12 h-12 opacity-20" />
            <p className="text-sm font-medium">No data available</p>
            <p className="text-xs text-slate-500">
              {timeRange === 'daily' && 'Start logging vitals to see today\'s trends'}
              {timeRange === 'weekly' && 'Need more records to display 7-day trends'}
              {timeRange === 'monthly' && 'Need more records to display 30-day trends'}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gradHeart" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="timestampLabel"
                tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
              />
              {(activeMetric === 'all' || activeMetric === 'heartRate' || activeMetric === 'spo2') && (
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
              )}
              {(activeMetric === 'all' || activeMetric === 'temperature') && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              {(activeMetric === 'all' || activeMetric === 'heartRate') && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  name="Heart Rate (bpm)"
                  dataKey="heartRate"
                  stroke="#EF4444"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }}
                />
              )}
              {(activeMetric === 'all' || activeMetric === 'spo2') && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  name="SpO₂ (%)"
                  dataKey="spo2"
                  stroke="#06B6D4"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#06B6D4', stroke: '#fff', strokeWidth: 2 }}
                />
              )}
              {(activeMetric === 'all' || activeMetric === 'temperature') && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  name="Temperature (°C)"
                  dataKey="temperature"
                  stroke="#F97316"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#F97316', stroke: '#fff', strokeWidth: 2 }}
                />
              )}
              <Brush
                dataKey="timestampLabel"
                height={24}
                stroke="#CBD5E1"
                fill="#F8FAFC"
                travellerWidth={6}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer - Data Info */}
      {data.length > 0 && !loading && !error && (
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex justify-between">
          <span>{data.length} data points displayed</span>
          <span>Updated: {new Date().toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
};

export default VitalsChart;
