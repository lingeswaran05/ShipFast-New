import { useState } from 'react';
import { Package, Truck, Search, CreditCard, ChevronRight, PlusCircle, Calculator, X, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useShipment } from '../../context/ShipmentContext';

export function CustomerDashboard() {
  const navigate = useNavigate();
  const { shipments } = useShipment();
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcData, setCalcData] = useState({ weight: '', source: '', destination: '', type: 'Standard' });
  const [calculatedRate, setCalculatedRate] = useState(null);
  const [trackingInput, setTrackingInput] = useState('');
  const formatCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(Number(value) || 0);

  const handleCalculate = (e) => {
    e.preventDefault();
    const weight = parseFloat(calcData.weight) || 0;
    const baseRate = 50;
    const weightRate = weight * 40; 
    const typeRate = calcData.type === 'Express' ? 150 : 0;
    
    setCalculatedRate(baseRate + weightRate + typeRate);
  };

  const handleTrack = () => {
    const trimmed = trackingInput.trim();
    navigate(`/track${trimmed ? `?id=${encodeURIComponent(trimmed)}` : ''}`);
  };

  const recentShipments = shipments.slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in-up relative">
      {showCalculator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowCalculator(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
             <div className="flex justify-between items-center mb-6">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                   <Calculator className="w-6 h-6" />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800">Rate Calculator</h3>
               </div>
               <button onClick={() => setShowCalculator(false)} className="text-slate-400 hover:text-slate-600">
                 <X className="w-6 h-6" />
               </button>
             </div>

             <form onSubmit={handleCalculate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Source Pincode</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="110001" 
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                          value={calcData.source}
                          onChange={(e) => setCalcData({...calcData, source: e.target.value})}
                          required 
                        />
                      </div>
                   </div>
                   <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Dest Pincode</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          placeholder="400001" 
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                          value={calcData.destination}
                          onChange={(e) => setCalcData({...calcData, destination: e.target.value})}
                          required 
                        />
                      </div>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-1">Weight (kg)</label>
                   <input 
                     type="number" 
                     placeholder="0.5" 
                     step="0.1"
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                     value={calcData.weight}
                     onChange={(e) => setCalcData({...calcData, weight: e.target.value})}
                     required 
                   />
                </div>

                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-1">Service Type</label>
                   <div className="grid grid-cols-2 gap-4">
                      {['Standard', 'Express'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setCalcData({...calcData, type})}
                          className={`py-3 rounded-xl font-semibold border-2 transition-all ${
                            calcData.type === type 
                              ? 'border-purple-500 bg-purple-50 text-purple-700' 
                              : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                   </div>
                </div>

                <button type="submit" className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98]">
                   Calculate Rate
                </button>
             </form>

             {calculatedRate !== null && (
                <div className="mt-6 p-4 bg-green-50 border border-green-100 rounded-xl animate-fade-in-up">
                   <div className="flex justify-between items-center">
                      <span className="text-green-700 font-medium">Estimated Cost</span>
                      <span className="text-2xl font-bold text-green-700">{formatCurrency(calculatedRate)}</span>
                   </div>
                   <p className="text-xs text-green-600 mt-1 text-center">* Final price may vary based on exact volumetric weight</p>
                </div>
             )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Active Shipments</div>
              <div className="text-2xl font-bold text-slate-900">
                {shipments.filter(s => s.status !== 'Delivered' && s.status !== 'Cancelled').length}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Delivered</div>
              <div className="text-2xl font-bold text-slate-900">
                {shipments.filter(s => s.status === 'Delivered').length}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-pink-50 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-pink-50 text-pink-600 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-slate-500">Total Spent</div>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(shipments.reduce((acc, s) => acc + (parseFloat(s.cost) || 0), 0))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button 
          onClick={() => navigate('/dashboard/book')}
          className="p-6 bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl text-white shadow-lg shadow-purple-500/30 flex items-center justify-between group hover:scale-[1.02] transition-all duration-200"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <PlusCircle className="w-8 h-8 text-white" />
            </div>
            <div className="text-left">
              <div className="text-lg font-bold">Book New Shipment</div>
              <div className="text-blue-100 text-sm">Schedule a pickup now</div>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-white/70 group-hover:translate-x-1 transition-transform" />
        </button>

        <button 
           onClick={() => setShowCalculator(true)}
           className="p-6 bg-white border border-slate-200 rounded-2xl text-slate-900 shadow-sm hover:shadow-md hover:border-purple-200 flex items-center justify-between group transition-all duration-200"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Calculator className="w-8 h-8" />
            </div>
            <div className="text-left">
              <div className="text-lg font-bold">Calculate Rate</div>
              <div className="text-slate-500 text-sm">Get instant shipping quotes</div>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-6">Track Your Shipment</h2>
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Enter Tracking ID (e.g. SF123456789)"
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium placeholder:text-slate-400"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
            />
          </div>
          <button 
             onClick={handleTrack}
             className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 active:scale-95"
          >
            Track Now
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recent Shipments</h2>
          <button onClick={() => navigate('/dashboard/shipments')} className="text-purple-600 font-medium hover:text-purple-700 text-sm">View All</button>
        </div>
        <div className="divide-y divide-slate-100">
          {recentShipments.length > 0 ? (
            recentShipments.map((shipment) => {
              const stableId = shipment.trackingNumber || shipment.trackingId || shipment.id;
              return (
              <div 
                 key={stableId} 
                 onClick={() => navigate(`/track?id=${encodeURIComponent(stableId)}`)}
                 className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                      shipment.status === 'Delivered' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{stableId}</div>
                    <div className="text-sm text-slate-500">
                       {shipment.sender?.city || 'Origin'} {'->'} {shipment.receiver?.city || 'Dest'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      shipment.status === 'Delivered' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}>
                    {shipment.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
                </div>
              </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500">No shipments found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

