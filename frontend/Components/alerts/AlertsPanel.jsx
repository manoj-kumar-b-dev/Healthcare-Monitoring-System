import React from 'react';
import { AlertCircle, AlertTriangle, Info, Bell } from 'lucide-react';

const AlertsPanel = ({ alerts = [] }) => {
  const getSeverityConfig = (severity) => {
    switch (severity) {
      case 'critical':
        return {
          container: 'bg-red-50 border-l-4 border-red-500',
          icon: <AlertCircle className="w-5 h-5 text-red-500 animate-bounce" />,
          titleColor: 'text-red-800',
          metaColor: 'text-red-600',
          badge: 'bg-red-100 text-red-700 ring-1 ring-red-200',
        };
      case 'warning':
        return {
          container: 'bg-amber-50 border-l-4 border-amber-500',
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
          titleColor: 'text-amber-800',
          metaColor: 'text-amber-600',
          badge: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
        };
      default:
        return {
          container: 'bg-blue-50 border-l-4 border-blue-500',
          icon: <Info className="w-5 h-5 text-blue-500" />,
          titleColor: 'text-blue-800',
          metaColor: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200',
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <Bell className="w-4.5 h-4.5 text-amber-500" />
          <h3 className="font-bold text-slate-800 text-sm">Active Alerts</h3>
        </div>
        {alerts.length > 0 && (
          <span className="flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
            {alerts.length}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 max-h-72 overflow-y-auto space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active alerts at this time.</p>
          </div>
        ) : (
          alerts.map((alert, idx) => {
            const cfg = getSeverityConfig(alert.severity);
            return (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3.5 rounded-xl ${cfg.container} transition-all duration-200`}
              >
                <div className="mt-0.5 shrink-0">{cfg.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${cfg.titleColor}`}>{alert.title || alert.message}</p>
                  {alert.title && (
                    <p className={`text-xs mt-0.5 ${cfg.metaColor} opacity-90`}>{alert.message}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${cfg.badge}`}>
                    {alert.severity || 'info'}
                  </span>
                  <span className={`text-xs ${cfg.metaColor} opacity-70`}>
                    {new Date(alert.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AlertsPanel;
