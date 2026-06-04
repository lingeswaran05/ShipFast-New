import { Button } from '../ui/button';
import { Logo } from '../ui/Logo';
import logoImage from '../../assets/logo.png';
import { Package, MapPin, Clock, Shield, TrendingUp, Users, Zap, Award, Truck, Globe, Star, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useShipment } from '../../context/ShipmentContext';
import { motion } from 'framer-motion';

export function Homepage() {
  const navigate = useNavigate();
  const { currentUser, activeRole } = useShipment();
  const effectiveRole = activeRole || currentUser?.role;

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleCreateAccount = () => {
    navigate('/signup');
  };

  const handleTrackShipment = () => {
    navigate('/track');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 transition-colors duration-500">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234F46E5' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>
      
      <div className="relative z-10">
        <header className="border-b border-white/20 bg-white/80 backdrop-blur-xl shadow-sm transition-colors duration-500">
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

        <section className="container mx-auto px-6 py-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="grid lg:grid-cols-2 gap-12 items-center"
          >
            <div className="animate-fade-in-up">
              <div className="inline-block mb-4 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full">
                <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  🚀 India's Fastest Growing Courier Service
                </span>
              </div>
              <h1 className="text-6xl lg:text-7xl font-black mb-6 leading-tight">
                <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                  Ship Smarter,
                </span>
                <br />
                <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
                  Deliver Faster
                </span>
              </h1>
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Experience next-level logistics with real-time tracking, instant quotes, and seamless delivery operations. Your parcels, our priority.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" onClick={handleCreateAccount} className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 shadow-xl shadow-purple-500/50 text-white font-bold text-lg px-8 py-6">
                  Get Started Free
                  <Zap className="size-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" onClick={handleTrackShipment} className="border-2 border-slate-300 hover:border-blue-500 hover:bg-blue-50 font-semibold text-lg px-8 py-6">
                  <MapPin className="size-5 mr-2" />
                  Track Package
                </Button>
              </div>
              <div className="flex items-center gap-8 mt-8 pt-8 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 border-2 border-white" />
                    ))}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">50K+</div>
                    <div className="text-sm text-slate-600">Happy Customers</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="size-5 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="ml-2 font-bold text-slate-900">4.9/5</span>
                </div>
              </div>
            </div>

            <div className="relative animate-slide-in-right">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1566576721346-d4a3b4eaeb55?w=800&h=600&fit=crop" 
                  alt="Courier Service" 
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-slate-600 mb-1">Tracking Number</div>
                      <div className="text-xl font-bold text-slate-900">SF-123456789</div>
                    </div>
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                      <Package className="size-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-6 -left-6 bg-white rounded-2xl p-4 shadow-xl animate-pulse-glow">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <Truck className="size-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-600">On-Time Delivery</div>
                    <div className="text-2xl font-bold text-slate-900">98%</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl p-4 shadow-xl text-white">
                <div className="text-sm mb-1">Express Delivery</div>
                <div className="text-2xl font-bold">24 Hours</div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="container mx-auto px-6 py-20">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
            }}
            className="text-center mb-16"
          >
            <div className="inline-block mb-4 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full">
              <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                WHY CHOOSE US
              </span>
            </div>
            <h2 className="text-5xl font-black mb-4">
              <span className="bg-gradient-to-r from-slate-900 to-blue-900 bg-clip-text text-transparent">
                Everything You Need
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Comprehensive features designed to make shipping simple, fast, and reliable
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Clock,
                title: 'Real-Time Tracking',
                description: 'Track every movement of your package with live GPS updates and detailed timeline view.',
                gradient: 'from-blue-500 to-cyan-500'
              },
              {
                icon: TrendingUp,
                title: 'Instant Rate Calculator',
                description: 'Get accurate shipping costs in seconds. Compare services and choose what fits your budget.',
                gradient: 'from-purple-500 to-pink-500'
              },
              {
                icon: Shield,
                title: 'Secure & Insured',
                description: 'Every package is insured and handled with care. Your shipments are in safe hands.',
                gradient: 'from-green-500 to-emerald-500'
              },
              {
                icon: Globe,
                title: 'Pan-India Network',
                description: 'Extensive delivery network covering 20,000+ pin codes across India.',
                gradient: 'from-orange-500 to-red-500'
              },
              {
                icon: Zap,
                title: 'Express Delivery',
                description: 'Need it urgent? Our express service delivers within 24-48 hours nationwide.',
                gradient: 'from-yellow-500 to-orange-500'
              },
              {
                icon: Award,
                title: '24/7 Support',
                description: 'Round-the-clock customer support to assist you whenever you need help.',
                gradient: 'from-indigo-500 to-purple-500'
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 card-hover border border-slate-100"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <feature.icon className="size-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-slate-900">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="container mx-auto px-6 py-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-r from-purple-600 to-pink-500 rounded-3xl p-12 lg:p-16 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full -ml-48 -mb-48" />
            
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-center text-white">
              <div className="animate-fade-in-up">
                <div className="text-6xl font-black mb-2">10K+</div>
                <div className="text-xl text-blue-100">Daily Deliveries</div>
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="text-6xl font-black mb-2">50+</div>
                <div className="text-xl text-blue-100">Service Hubs</div>
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="text-6xl font-black mb-2">98%</div>
                <div className="text-xl text-blue-100">On-Time Rate</div>
              </div>
              <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                <div className="text-6xl font-black mb-2">24/7</div>
                <div className="text-xl text-blue-100">Support</div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="container mx-auto px-6 py-20">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-12 lg:p-16 text-center shadow-2xl relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }} />
            </div>
            
            <div className="relative z-10">
               <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl">
                <Users className="size-10 text-white" />
              </div>
              <h2 className="text-5xl font-black mb-6 text-white">
                Ready to Transform Your Shipping?
              </h2>
              <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                Join 50,000+ satisfied customers who trust ShipFast for their delivery needs. 
                Get started in minutes and experience the future of logistics.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button size="lg" onClick={handleCreateAccount} className="bg-white text-blue-600 hover:bg-blue-50 font-bold text-lg px-8 py-6 shadow-xl">
                  Create Free Account
                  <ArrowRight className="size-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" onClick={handleTrackShipment} className="border-2 border-white text-white hover:bg-white/10 font-semibold text-lg px-8 py-6">
                  Track Shipment
                </Button>
              </div>
            </div>
          </motion.div>
        </section>

        <footer className="border-t border-slate-200 bg-white/80 backdrop-blur-xl mt-20">
          <div className="container mx-auto px-6 py-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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
                  <button onClick={() => navigate('/about')} className="hover:text-blue-600 transition-colors">About Us</button>
                  <button onClick={() => navigate('/privacy')} className="hover:text-blue-600 transition-colors">Privacy Policy</button>
                  <button onClick={() => navigate('/terms')} className="hover:text-blue-600 transition-colors">Terms of Service</button>
                  <button onClick={() => navigate('/contact')} className="hover:text-blue-600 transition-colors">Contact Us</button>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
