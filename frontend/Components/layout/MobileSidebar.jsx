import { Link, useLocation } from 'react-router-dom';
import { Home, User, FileText, History, X, PhoneCall, Pill, HeartPulse } from 'lucide-react';
import { useEffect } from 'react';

const MobileSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  // Close sidebar when route changes (mobile UX)
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const menuItems = [
    { path: '/',             label: 'Dashboard',          icon: Home },
    { path: '/health-score', label: 'Health Score',       icon: HeartPulse },
    { path: '/profile',      label: 'My Profile',         icon: User },
    { path: '/contacts',     label: 'Emergency Contacts', icon: PhoneCall },
    { path: '/reminders',    label: 'Medicine Reminders', icon: Pill },
    { path: '/reports',      label: 'Reports',            icon: FileText },
    { path: '/history',      label: 'History',            icon: History },
  ];

  // Don't render anything if closed
  if (!isOpen) return null;

  return (
    <>
      {/* Background Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
        {/* Header with Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <span className="font-bold text-white text-lg">H</span>
            </div>
            <div>
              <span className="font-bold text-gray-800 text-sm block leading-tight">HealthMonitor</span>
              <span className="text-gray-400 text-xs">Mobile Menu</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50">
            <div className="status-dot-live"></div>
            <span className="text-sm text-emerald-700 font-medium">All systems operational</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default MobileSidebar;