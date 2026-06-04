import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Truck, Zap, AlertCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useShipment } from '../../context/ShipmentContext';
import { Logo } from '../ui/Logo';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useShipment();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const user = await login(email, password);
      
      if (user) {
         if (user.role === 'admin') navigate('/admin');
         else if (user.role === 'agent') navigate('/agent');
         else navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden overflow-y-auto p-4 sm:p-6" style={{ background: 'linear-gradient(135deg, #020617, #0b1a3a, #1e3a8a, #312e81)' }}>
      {/* Background Plus Pattern */}
      <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>

      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start lg:items-center relative z-10 py-4">
        
        {/* Left Side - Visuals (Text overlay) */}
        <div className="flex flex-col justify-between relative text-white animate-fade-in-up order-1">
          <div className="relative z-10">
            <Logo className="mb-10 text-white" />
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6">
              Welcome to the <br/>
              Future of <span className="text-blue-400">Logistics</span>
            </h2>
            <p className="text-indigo-100 text-base sm:text-lg leading-relaxed mb-8 lg:mb-10 max-w-lg">
              Sign in to access your personalized dashboard with real-time tracking, instant quotes, and seamless delivery management.
            </p>

            <div className="space-y-4 sm:space-y-6">
                {/* Feature 1 */}
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-5 transition-transform hover:scale-105 duration-300">
                    <div className="bg-blue-500/20 p-3 rounded-xl">
                        <Truck className="w-8 h-8 text-blue-300" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg sm:text-xl">Real-time Tracking</h4>
                        <p className="text-sm text-indigo-100">Live GPS updates & detailed timeline</p>
                    </div>
                </div>

                {/* Feature 2 */}
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-5 transition-transform hover:scale-105 duration-300 delay-100">
                    <div className="bg-purple-500/20 p-3 rounded-xl">
                        <Lock className="w-8 h-8 text-purple-300" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg sm:text-xl">Secure Authentication</h4>
                        <p className="text-sm text-indigo-100">JWT-based role-based access control</p>
                    </div>
                </div>

                 {/* Feature 3 */}
                 <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center gap-5 transition-transform hover:scale-105 duration-300 delay-200">
                    <div className="bg-orange-500/20 p-3 rounded-xl">
                        <Zap className="w-8 h-8 text-orange-300" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg sm:text-xl">Lightning Fast</h4>
                        <p className="text-sm text-indigo-100">Express delivery within 24-48 hours</p>
                    </div>
                </div>
            </div>
          </div>
          
          <div className="relative z-10 mt-10">
             <Link to="/track" className="flex items-center gap-2 font-semibold text-white hover:text-blue-300 transition-colors group">
                 <Truck className="w-5 h-5 group-hover:animate-bounce" />
                 Track a shipment without login
                 <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
             </Link>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="order-2 bg-white rounded-3xl shadow-2xl p-6 sm:p-10 animate-slide-in-right">
          <div className="w-full">
            <div className="text-center mb-8">
               <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold tracking-wider mb-4 uppercase">
                   Secure Login
               </span>
               <h3 className="text-3xl font-bold text-slate-900 mb-2">Sign In to Your Account</h3>
               <p className="text-slate-500 text-sm">Your credentials will automatically determine your access level</p>
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in-up mb-6">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    Email Address
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="karthika.selvan@example.in"
                    required
                />
              </div>

              <div className="space-y-2">
                 <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-400" />
                    Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none font-medium text-slate-900 placeholder:text-slate-400"
                    placeholder="********"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <input type="checkbox" id="remember" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor="remember" className="text-sm text-slate-600">Remember me</label>
                </div>
                <Link to="/forgot-password" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-indigo-500/30"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="pt-6 border-t border-slate-100 text-center">
                <p className="text-slate-500 text-sm mb-4">New to ShipFast?</p>
                <Link to="/signup" className="w-full block py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors">
                    Create New Account
                </Link>
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}


