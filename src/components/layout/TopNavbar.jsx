import { Bell, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useShipment } from '../../context/ShipmentContext';
import { useNavigate } from 'react-router-dom';

import logoImage from '../../assets/logo.png';

export function TopNavbar({ user, isSidebarOpen }) {
  const { getRoleNotifications, dismissNotification, activeRole, switchActiveRole } = useShipment();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const notificationsDropdownRef = useRef(null);
  const effectiveRole = activeRole || user?.role;
  const notifications = getRoleNotifications(effectiveRole);
  const visibleNotifications = showAllNotifications ? notifications : notifications.slice(0, 5);
  const navigate = useNavigate();

  useEffect(() => {
    if (!showNotifications) return;
    const handlePointerDown = (event) => {
      if (!notificationsDropdownRef.current?.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showNotifications]);

  useEffect(() => {
    if (!showNotifications) {
      setShowAllNotifications(false);
    }
  }, [showNotifications]);

  const handleProfileClick = () => {
    if (user?.role === 'admin') navigate('/admin/settings');
    else if (effectiveRole === 'agent') navigate('/agent/settings');
    else navigate('/dashboard/settings');
  };

  const handleRoleToggle = () => {
    if (user?.role !== 'agent') return;
    const nextRole = effectiveRole === 'agent' ? 'customer' : 'agent';
    switchActiveRole(nextRole);
    navigate(nextRole === 'agent' ? '/agent' : '/dashboard');
  };

  return (
    <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-40 px-8 flex items-center justify-between">
      {/* Left side - Logo (Only visible when sidebar is closed) */}
      <div 
        onClick={() => navigate('/')} 
        className={`flex items-center gap-3 cursor-pointer group ${isSidebarOpen ? 'hidden' : 'flex'}`}
      >
        <img src={logoImage} alt="ShipFast" className="h-8 w-auto transition-transform group-hover:scale-110 duration-300" />
        <span className="font-heading font-bold text-xl bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent group-hover:from-purple-600 group-hover:to-pink-500 transition-all duration-300">
          ShipFast
        </span>
      </div>

      {/* Right side - Notifications & Profile */}
       <div className="flex items-center gap-4 ml-auto">
          {user?.role === 'agent' && (
            <button
              type="button"
              onClick={handleRoleToggle}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Switch to {effectiveRole === 'agent' ? 'Customer' : 'Agent'}
            </button>
          )}
          <div className="relative" ref={notificationsDropdownRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-all relative"
              aria-label="Open notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
            </button>
            
            {showNotifications && (
               <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in-up z-50">
                  <div className="p-3 bg-slate-50 border-b border-slate-100 font-bold text-slate-700">Notifications</div>
                  <div className="max-h-64 overflow-y-auto">
                     {visibleNotifications.length > 0 ? visibleNotifications.map((n) => (
                        <div key={n.id} className="p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                           <div className="flex items-start justify-between gap-3">
                             <p className="text-sm text-slate-800">{n.message}</p>
                             <button
                               type="button"
                               onClick={() => dismissNotification(n.id)}
                               className="text-slate-400 hover:text-red-500 transition-colors"
                               aria-label="Delete notification"
                             >
                               <X className="w-3.5 h-3.5" />
                             </button>
                           </div>
                           <span className="text-xs text-slate-400 mt-1 block">{n.timestamp}</span>
                        </div>
                     )) : (
                        <div className="p-8 text-center text-slate-500 text-sm">No new notifications</div>
                     )}
                  </div>
                  {notifications.length > 5 && (
                    <div className="px-3 py-2 border-t border-slate-100 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setShowAllNotifications((prev) => !prev)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        {showAllNotifications ? 'View Less' : 'View More'}
                      </button>
                    </div>
                  )}
               </div>
            )}
          </div>

          <div className="h-8 w-px bg-slate-200 mx-2"></div>
          
          <div 
            onClick={handleProfileClick}
            className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-3 rounded-full border border-transparent hover:border-slate-100 transition-all duration-300"
          >
             <div className="text-right hidden sm:block">
               <div className="text-sm font-bold text-slate-900 leading-tight group-hover:text-purple-600 transition-colors">{user?.name}</div>
               <div className="text-xs text-slate-500 font-medium capitalize">{effectiveRole}</div>
             </div>
             {user?.profilePic ? (
               <img
                 src={user.profilePic}
                 alt={user?.name}
                 className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-md"
               />
             ) : (
               <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 border-2 border-white shadow-md flex items-center justify-center text-white font-bold text-sm">
                 {user?.name?.charAt(0).toUpperCase()}
               </div>
             )}
          </div>
       </div>
    </header>
  );
}
