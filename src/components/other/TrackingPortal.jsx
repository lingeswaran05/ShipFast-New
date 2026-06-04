import { useState, useEffect, useMemo } from 'react';
import { Search, Package, MapPin, Clock, CheckCircle, Truck, ArrowLeft, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../ui/Logo';
import { shipmentService } from '../../lib/shipmentService';

const normalizeStatus = (status) => String(status || '').toUpperCase().replace(/ /g, '_');

const statusReached = (currentStatus, targetStatus) => {
  const flow = ['BOOKED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  const currentIndex = flow.indexOf(normalizeStatus(currentStatus));
  const targetIndex = flow.indexOf(targetStatus);
  if (currentIndex === -1) {
    return targetStatus === 'BOOKED';
  }
  return currentIndex >= targetIndex;
};

const formatStatusLabel = (status) => {
  const raw = String(status || 'BOOKED').replace(/_/g, ' ').toLowerCase();
  return raw.split(/\s+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const getStatusBadgeClass = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === 'DELIVERED') return 'bg-green-100 text-green-700';
  if (normalized === 'CANCELLED') return 'bg-red-100 text-red-700';
  if (normalized === 'FAILED_ATTEMPT') return 'bg-amber-100 text-amber-700';
  return 'bg-purple-100 text-purple-700';
};

const buildFallbackTimeline = (shipmentData) => {
  const baseDate = shipmentData?.date ? new Date(`${shipmentData.date}T09:00:00`) : new Date();
  const normalized = normalizeStatus(shipmentData?.status);
  const events = [
    {
      status: 'Booked',
      location: shipmentData?.origin || 'Origin Hub',
      timestamp: baseDate.toLocaleString(),
      description: 'Shipment booking confirmed.'
    }
  ];

  if (['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(normalized)) {
    events.push({
      status: 'In Transit',
      location: 'Transit Hub',
      timestamp: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000).toLocaleString(),
      description: 'Shipment moved to transit network.'
    });
  }
  if (['OUT_FOR_DELIVERY', 'DELIVERED'].includes(normalized)) {
    events.push({
      status: 'Out For Delivery',
      location: shipmentData?.destination || 'Destination Hub',
      timestamp: new Date(baseDate.getTime() + 48 * 60 * 60 * 1000).toLocaleString(),
      description: 'Shipment is out for delivery.'
    });
  }
  if (normalized === 'DELIVERED') {
    events.push({
      status: 'Delivered',
      location: shipmentData?.destination || 'Delivery Address',
      timestamp: shipmentData?.deliveryDate || new Date().toLocaleString(),
      description: 'Shipment delivered successfully.'
    });
  }

  return events.reverse();
};

export function TrackingPortal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryTrackingId = searchParams.get('id');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipmentData, setShipmentData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchShipment = async (id, options = {}) => {
    if (!id) return;
    const { silent = false } = options;
    if (!silent) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const data = await shipmentService.getShipmentByIdentifier(id);
      setShipmentData(data);
      setError(null);
    } catch (err) {
      console.error(err);
      if (!silent) {
        setError('Shipment not found. Please check the tracking ID.');
        setShipmentData(null);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!queryTrackingId) return;
    setTrackingNumber(queryTrackingId);
    fetchShipment(queryTrackingId, { silent: false });
  }, [queryTrackingId]);

  useEffect(() => {
    if (!trackingNumber) return;
    const interval = setInterval(() => {
      fetchShipment(trackingNumber, { silent: true });
    }, 10000);
    return () => clearInterval(interval);
  }, [trackingNumber]);

  const handleTrack = (e) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return;
    const trimmed = trackingNumber.trim();
    fetchShipment(trimmed, { silent: false });
    navigate(`/track?id=${encodeURIComponent(trimmed)}`, { replace: false });
  };

  const timeline = useMemo(() => {
    if (!shipmentData) return [];
    if (Array.isArray(shipmentData.history) && shipmentData.history.length > 0) {
      return [...shipmentData.history]
        .map((event) => ({
          status: formatStatusLabel(event.status),
          location: event.location || 'Hub',
          timestamp: event.timestamp ? new Date(event.timestamp).toLocaleString() : '',
          description: event.remarks || 'Status update'
        }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .reverse();
    }
    return buildFallbackTimeline(shipmentData);
  }, [shipmentData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 transition-colors duration-500">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Logo />
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-slate-800 mb-2 text-3xl font-bold">Track Your Shipment</h1>
          <p className="text-slate-600">Enter your tracking number to see real-time updates</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-slate-100">
          <form onSubmit={handleTrack} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number (e.g., SF123456789)"
                className="w-full pl-12 pr-4 py-4 border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-slate-900 placeholder-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl hover:from-purple-700 hover:to-pink-600 transition-all font-semibold shadow-lg shadow-purple-500/30 disabled:opacity-70"
            >
              {isLoading ? 'Tracking...' : 'Track'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center mb-8 border border-red-100 flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {shipmentData && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-slate-600 mb-1">Tracking Number</div>
                  <div className="text-slate-800 font-bold text-xl">{shipmentData.trackingNumber || shipmentData.trackingId || shipmentData.id}</div>
                </div>
                <div className={`px-4 py-2 rounded-lg font-semibold ${getStatusBadgeClass(shipmentData.status)}`}>
                  {formatStatusLabel(shipmentData.status)}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <div className="text-slate-600 mb-1">Origin</div>
                  <div className="text-slate-800 font-semibold">{shipmentData.origin || shipmentData.sender?.city || shipmentData.sender?.address || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-slate-600 mb-1">Destination</div>
                  <div className="text-slate-800 font-semibold">{shipmentData.destination || shipmentData.receiver?.city || shipmentData.receiver?.address || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-slate-600 mb-1">Service Type</div>
                  <div className="text-slate-800 font-semibold">{shipmentData.service || 'Standard'}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-slate-600 mb-1">Booking Date</div>
                  <div className="text-slate-800 font-semibold">{shipmentData.date || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-slate-600 mb-1">Delivery Date</div>
                  <div className="text-slate-800 font-semibold">{shipmentData.deliveryDate || 'Pending'}</div>
                </div>
                <div>
                  <div className="text-slate-600 mb-1">Weight</div>
                  <div className="text-slate-800 font-semibold">
                    {shipmentData.weight !== undefined && shipmentData.weight !== null ? `${shipmentData.weight} kg` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <h2 className="text-slate-800 mb-6 font-bold text-xl">Shipment Journey</h2>
              <div className="flex items-center justify-between">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-slate-800 font-semibold">Booked</div>
                </div>
                <div className={`flex-1 h-1 mx-2 ${statusReached(shipmentData.status, 'IN_TRANSIT') ? 'bg-green-200' : 'bg-slate-200'}`}></div>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${statusReached(shipmentData.status, 'IN_TRANSIT') ? 'bg-green-100' : 'bg-slate-100'}`}>
                    <Truck className={`w-6 h-6 ${statusReached(shipmentData.status, 'IN_TRANSIT') ? 'text-green-600' : 'text-slate-400'}`} />
                  </div>
                  <div className="text-slate-800 font-semibold">In Transit</div>
                </div>
                <div className={`flex-1 h-1 mx-2 ${statusReached(shipmentData.status, 'OUT_FOR_DELIVERY') ? 'bg-green-200' : 'bg-slate-200'}`}></div>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${statusReached(shipmentData.status, 'OUT_FOR_DELIVERY') ? 'bg-green-100' : 'bg-slate-100'}`}>
                    <MapPin className={`w-6 h-6 ${statusReached(shipmentData.status, 'OUT_FOR_DELIVERY') ? 'text-green-600' : 'text-slate-400'}`} />
                  </div>
                  <div className="text-slate-800 font-semibold">Out for Delivery</div>
                </div>
                <div className={`flex-1 h-1 mx-2 ${statusReached(shipmentData.status, 'DELIVERED') ? 'bg-green-200' : 'bg-slate-200'}`}></div>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${statusReached(shipmentData.status, 'DELIVERED') ? 'bg-green-100' : 'bg-slate-100'}`}>
                    <CheckCircle className={`w-6 h-6 ${statusReached(shipmentData.status, 'DELIVERED') ? 'text-green-600' : 'text-slate-400'}`} />
                  </div>
                  <div className="text-slate-800 font-semibold">Delivered</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
              <h2 className="text-slate-800 mb-6 font-bold text-xl">Tracking History</h2>
              <div className="space-y-6">
                {timeline.map((event, index) => (
                  <div key={`${event.status}-${index}`} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${index === 0 ? 'bg-green-100' : 'bg-blue-100'}`}>
                        {index === 0 ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-blue-600" />}
                      </div>
                      {index < timeline.length - 1 && <div className="w-0.5 h-full bg-slate-200 my-1"></div>}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-start justify-between mb-1">
                        <div className="text-slate-800 font-semibold">{event.status}</div>
                        <div className="text-slate-500 text-sm">{event.timestamp}</div>
                      </div>
                      <div className="text-slate-600 mb-1">{event.location || 'Hub'}</div>
                      <div className="text-slate-500 text-sm">{event.description || 'Status update'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {normalizeStatus(shipmentData.status) === 'DELIVERED' && (
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
                <h2 className="text-slate-800 mb-6 font-bold text-xl">Proof of Delivery</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-slate-600 mb-2">Received By</div>
                    <div className="text-slate-800 font-semibold">{shipmentData.receiver?.name || shipmentData.deliveredBy || 'Receiver'}</div>
                  </div>
                  <div>
                    <div className="text-slate-600 mb-2">Delivered By</div>
                    <div className="text-slate-800 font-semibold">{shipmentData.deliveredBy || 'Assigned Agent'}</div>
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <div className="text-slate-600 mb-3">Delivery Photo</div>
                    {shipmentData.proofOfDeliveryImage ? (
                      <div className="rounded-lg overflow-hidden border border-slate-200">
                        <img src={shipmentData.proofOfDeliveryImage} alt="Proof of Delivery" className="w-full max-h-80 object-cover" />
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors">
                        <ImageIcon className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                        <div className="text-slate-600">Proof image not uploaded yet</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!shipmentData && !isLoading && !error && (
          <div className="text-center text-slate-500 mt-12 animate-fade-in-up">
            <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p>Enter a tracking number to view shipment details</p>
          </div>
        )}
      </main>
    </div>
  );
}
