import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/button';
import { MapPin, ArrowRight } from 'lucide-react';
import { useShipment } from '../../context/ShipmentContext';
import logoImage from '../../assets/logo.png';
import { AnimatedPage } from './AnimatedPage';

export function PublicLayout() {
  const navigate = useNavigate();
  const { currentUser, activeRole } = useShipment();
  const effectiveRole = activeRole || currentUser?.role;

  const handleSignIn = () => navigate('/login');
  const handleTrackShipment = () => navigate('/track');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 transition-colors duration-500">
      <header className="border-b border-white/20 bg-white/80 backdrop-blur-xl shadow-sm transition-colors duration-500 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleTrackShipment} className="hover:bg-blue-50 text-slate-700 font-semibold transition-all duration-300 hover:scale-105">
              <MapPin className="size-4 mr-2" />
              Track Shipment
            </Button>
            {currentUser ? (
              <div 
                 onClick={() => navigate(effectiveRole === 'admin' ? '/admin' : effectiveRole === 'agent' ? '/agent' : '/dashboard')}
                 className="flex items-center gap-3 bg-white/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/50 cursor-pointer hover:bg-white/80 transition-colors"
              >
                 {currentUser.profilePic ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-purple-500">
                      <img src={currentUser.profilePic} alt={currentUser.name} className="w-full h-full object-cover" />
                    </div>
                 ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 border-2 border-white flex items-center justify-center text-white font-bold text-xs">
                      {currentUser.name?.charAt(0).toUpperCase()}
                    </div>
                 )}
                 <span className="font-semibold text-slate-800">{currentUser.name}</span>
              </div>
            ) : (
              <Button onClick={handleSignIn} className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 shadow-lg shadow-purple-500/50 text-white font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl">
                Sign In
                <ArrowRight className="size-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        <AnimatedPage />
      </main>

      <footer className="border-t border-slate-200 bg-white/80 backdrop-blur-xl mt-auto">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div 
              onClick={() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity scale-90 origin-left"
            >
              <img src={logoImage} alt="ShipFast" className="h-10 w-auto" />
              <span className="font-black text-2xl bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent" style={{ fontFamily: 'Poppins, sans-serif' }}>
                ShipFast
              </span>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <p className="text-slate-600 font-medium">© 2025 ShipFast. All rights reserved.</p>
              <div className="flex gap-6 text-sm text-slate-600">
                <button onClick={() => { navigate('/about'); window.scrollTo(0, 0); }} className="hover:text-blue-600 transition-colors">About Us</button>
                <button onClick={() => { navigate('/privacy'); window.scrollTo(0, 0); }} className="hover:text-blue-600 transition-colors">Privacy Policy</button>
                <button onClick={() => { navigate('/terms'); window.scrollTo(0, 0); }} className="hover:text-blue-600 transition-colors">Terms of Service</button>
                <button onClick={() => { navigate('/contact'); window.scrollTo(0, 0); }} className="hover:text-blue-600 transition-colors">Contact Us</button>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
