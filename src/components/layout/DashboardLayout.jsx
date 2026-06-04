import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useShipment } from '../../context/ShipmentContext';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { AnimatedPage } from './AnimatedPage';

export function DashboardLayout({ user, onLogout, sidebarItems }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { isRefreshing } = useShipment();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="print:hidden">
        <Sidebar 
          isSidebarOpen={isSidebarOpen} 
          setIsSidebarOpen={setIsSidebarOpen} 
          sidebarItems={sidebarItems} 
          onLogout={onLogout} 
        />
      </div>

      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64 print:ml-0' : 'ml-20 print:ml-0'}`}>
        {isRefreshing && (
          <div className="fixed top-3 right-4 z-40">
            <div className="px-3 py-2 bg-white/90 backdrop-blur border border-slate-200 rounded-full shadow-sm text-xs text-slate-600 flex items-center gap-2 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></span>
              Syncing latest data...
            </div>
          </div>
        )}
        <div className="print:hidden">
          <TopNavbar user={user} isSidebarOpen={isSidebarOpen} />
        </div>

        <div className="p-8 max-w-7xl mx-auto print:p-0 print:max-w-none relative">
          <AnimatedPage />
        </div>
      </main>
    </div>
  );
}
