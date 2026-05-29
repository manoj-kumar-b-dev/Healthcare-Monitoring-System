import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileSidebar from './MobileSidebar';
import { MobileMenuProvider, useMobileMenu } from '../../context/MobileMenuContext';

const LayoutContent = () => {
  const { isMenuOpen, closeMenu } = useMobileMenu();

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={isMenuOpen} onClose={closeMenu} />

      <div className="flex-1 flex flex-col overflow-hidden w-full relative">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto w-full p-6 md:p-8 relative">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

const Layout = () => {
  return (
    <MobileMenuProvider>
      <LayoutContent />
    </MobileMenuProvider>
  );
};

export default Layout;
