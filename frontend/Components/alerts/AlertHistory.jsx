import React, { useState } from 'react';
import { Trash2, Clock, Filter, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const AlertHistory = ({ alerts = [], onClearHistory }) => {
  const [filter, setFilter] = useState('all');

  const filteredAlerts = alerts.filter(alert =>
    filter === 'all' ? true : alert.severity === filter
  );

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-700 ring-1 ring-red-200';
      case 'warning':
        return 'bg-amber-100 text-amber-700 ring-1 ring-amber-200';
      default:
        return 'bg-blue-100 text-blue-700 ring-1 ring-blue-200';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <h3 className="font-bold text-slate-800 text-sm">Alert History Log</h3>
          {filteredAlerts.length > 0 && (
            <span className="ml-1 text-xs font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
              {filteredAlerts.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          {/* Filter dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
            </select>
          </div>

          {alerts.length > 0 && (
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 font-medium transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-80">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No alert history found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Severity</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Message</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAlerts.map((alert, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-blue-50/40 transition-colors even:bg-slate-50/50"
                >
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${getSeverityBadge(alert.severity)}`}>
                      {getSeverityIcon(alert.severity)}
                      {(alert.severity || 'info').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-800 max-w-xs truncate">
                    {alert.message}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(alert.timestamp || Date.now()).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AlertHistory;
