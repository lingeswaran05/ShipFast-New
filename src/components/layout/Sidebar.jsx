import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Settings, Menu, X } from 'lucide-react';
import { useShipment } from '../../context/ShipmentContext';
import logoImage from '../../assets/logo.png';

export function Sidebar({ isSidebarOpen, setIsSidebarOpen, sidebarItems, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();


  const { currentUser } = useShipment();

  const handleLogoClick = () => {
    if (currentUser?.role === 'admin') navigate('/admin');
    else if (currentUser?.role === 'agent') navigate('/agent');
    else navigate('/dashboard');
  };

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 flex flex-col
        ${isSidebarOpen ? 'w-64' : 'w-20'}
      `}
    >
      <div className="p-4 border-b border-slate-100 flex items-center justify-between h-16">
        <button 
          onClick={handleLogoClick}
          className={`flex items-center gap-3 overflow-hidden transition-all hover:opacity-80 ${!isSidebarOpen && 'hidden'}`}
        >
          <img src={logoImage} alt="ShipFast" className="h-8 w-auto flex-shrink-0" />
          <span className="font-bold text-xl bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent whitespace-nowrap">ShipFast</span>
        </button>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg">
          {isSidebarOpen ? <X className="w-5 h-5 text-slate-500" /> : <Menu className="w-5 h-5 text-slate-500" />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group whitespace-nowrap
                ${isActive 
                  ? 'bg-purple-50 text-purple-600 font-semibold shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              title={!isSidebarOpen ? item.label : ''}
            >
              <div className="min-w-[1.25rem]">
                 <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-purple-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
              </div>
              <span className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 hidden'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 space-y-1">
        <button 
           onClick={() => navigate(location.pathname.startsWith('/admin') ? '/admin/settings' : location.pathname.startsWith('/agent') ? '/agent/settings' : '/dashboard/settings')} 
           className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all whitespace-nowrap"
        >
          <Settings className="w-5 h-5 text-slate-400 min-w-[1.25rem]" />
          <span className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'hidden'}`}>Settings</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all whitespace-nowrap"
        >
          <LogOut className="w-5 h-5 min-w-[1.25rem]" />
          <span className={`transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'hidden'}`}>Logout</span>
        </button>
      </div>
    </aside>
  );
}


