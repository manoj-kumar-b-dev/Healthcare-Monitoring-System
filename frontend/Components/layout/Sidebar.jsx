import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, User, PhoneCall, FileText, History, Pill, Activity, HeartPulse } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { path: '/',            label: 'Dashboard',          icon: LayoutDashboard },
    { path: '/health-score', label: 'Health Score',      icon: HeartPulse },
    { path: '/profile',     label: 'My Profile',         icon: User },
    { path: '/contacts',    label: 'Emergency Contacts', icon: PhoneCall },
    { path: '/reminders',   label: 'Medicine Reminders', icon: Pill },
    { path: '/reports',     label: 'Reports',            icon: FileText },
    { path: '/history',     label: 'History',            icon: History },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-full shrink-0 z-20 shadow-xl animate-slide-left">
      {/* Brand */}
      <div className="px-6 py-5 bg-slate-950 border-b border-slate-800/60 flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-white text-sm tracking-tight block leading-tight">HealthMonitor</span>
          <span className="text-slate-400 text-xs">Clinical Portal</span>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col gap-1 p-3 pt-4">
        <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">Navigation</p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-300 rounded-r-full" />
              )}
              <Icon className={`w-5 h-5 shrink-0 transition-transform duration-200 ${!isActive && 'group-hover:scale-110'}`} />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800/60">
          <div className="status-dot-live"></div>
          <span className="text-xs text-slate-300 font-medium">System Online</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
