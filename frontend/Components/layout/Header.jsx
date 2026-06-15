import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useMobileMenu } from '../../context/MobileMenuContext';
import { LogOut, User, Wifi, WifiOff, Menu } from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const { toggleMenu } = useMobileMenu();

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0 z-10 relative shadow-sm">
      {/* Left: Brand and Hamburger Menu */}
      <div className="flex items-center gap-4">
        {/* Hamburger Menu Button (visible on mobile/tablet) */}
        <button
          onClick={toggleMenu}
          aria-label="Open menu"
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">
            Smart Healthcare
          </span>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            Monitor
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Connection Status */}

        {user && (
          <>
            {/* User Info */}
            <div className="flex items-center gap-2.5 pl-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{user.username || user.name}</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              aria-label="Logout"
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all duration-200 border border-slate-200 hover:border-red-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
