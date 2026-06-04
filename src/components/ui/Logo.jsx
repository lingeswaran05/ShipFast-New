import { Link } from 'react-router-dom';
import { useShipment } from '../../context/ShipmentContext';
import logo from '../../assets/logo.png';

export function Logo({ className = "", imageSize = "h-14", textSize = "text-3xl" }) {
  const { currentUser, activeRole } = useShipment();
  const effectiveRole = activeRole || currentUser?.role;

  const getDestination = () => {
    if (!currentUser) return '/';
    if (effectiveRole === 'admin') return '/admin';
    if (effectiveRole === 'agent') return '/agent';
    return '/dashboard';
  };

  return (
    <Link 
      to={getDestination()} 
      className={`flex items-center gap-3 hover:opacity-90 transition-all duration-300 group ${className}`}
    >
      <img 
        src={logo} 
        alt="ShipFast" 
        className={`${imageSize} w-auto transition-transform group-hover:scale-110 duration-300`} 
      />
      <span 
        className={`font-black bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent ${textSize}`} 
        style={{ fontFamily: 'Poppins, sans-serif' }}
      >
        ShipFast
      </span>
    </Link>
  );
}


