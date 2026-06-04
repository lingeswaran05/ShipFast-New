import React, { useEffect, useState } from 'react';
import { Package, Calendar, MoreHorizontal, Search, Filter, Ban, ThumbsUp, FileText, ChevronRight, Trash2, X, Download, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useShipment } from '../../context/ShipmentContext';
import { RateShipmentModal } from './RateShipmentModal';
import { CancelShipmentModal } from './CancelShipmentModal';
import { toast } from 'sonner';
import { ConfirmationModal } from '../shared/ConfirmationModal';

export function MyShipments() {
  const navigate = useNavigate();
  const { shipments, cancelShipment, deleteShipment, rateShipment } = useShipment();
  const [activeModal, setActiveModal] = useState(null);
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [shipmentToDelete, setShipmentToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const getShipmentIdentifier = (shipment) => shipment?.trackingNumber || shipment?.trackingId || shipment?.id;

  // Helper to format status for display and comparison
  const formatStatus = (status) => {
      if (!status) return '';
      return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusColor = (status) => {
    const formatted = formatStatus(status);
    switch (formatted) {
      case 'In Transit': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Delivered': return 'bg-green-50 text-green-700 border-green-200';
      case 'Pending': 
      case 'Booked': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Cancelled': return 'bg-red-50 text-red-700 border-red-200';
      case 'Out For Delivery': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const handleAction = (type, shipment) => {
    setSelectedShipment(shipment);
    setActiveModal(type);
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedShipment(null);
  };

  const handleCancel = async () => {
      const shipmentId = getShipmentIdentifier(selectedShipment);
      if (!shipmentId) return;
      setCancellingId(shipmentId);
      try {
        await cancelShipment(shipmentId);
        toast.success('Shipment request cancelled.');
      } catch (error) {
        toast.error(error?.message || 'Unable to cancel shipment');
      } finally {
        setCancellingId(null);
        closeModal();
      }
  };
  
  
  const confirmDelete = (shipment) => {
      setShipmentToDelete(shipment);
      setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
      if (!shipmentToDelete) return;
      const shipmentId = getShipmentIdentifier(shipmentToDelete);
      setDeletingId(shipmentId);
      try {
        await deleteShipment(shipmentId);
        toast.success('Shipment removed from history.');
      } catch (error) {
        toast.error(error?.message || 'Unable to delete shipment');
      } finally {
        setDeletingId(null);
        setShipmentToDelete(null);
        setShowDeleteConfirm(false);
      }
  };

  const handleRate = async ({ rating, feedback, shipmentId }) => {
      if (!shipmentId) return;
      try {
        await rateShipment(shipmentId, rating, feedback);
        toast.success(`Thank you! You rated shipment ${shipmentId} with ${rating} stars.`);
        closeModal();
        return true;
      } catch (error) {
        toast.error(error?.message || 'Unable to submit rating');
        return false;
      }
  };

  const handleTrack = (id) => {
    navigate(`/track?id=${encodeURIComponent(id)}`);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(Number(value) || 0);

  const shipmentsToDisplay = shipments;

  const filteredShipments = shipmentsToDisplay.filter(s => {
      const query = filter.toLowerCase();
      const matchesSearch = (s.id && s.id.toLowerCase().includes(query)) || 
                            (s.trackingId && String(s.trackingId).toLowerCase().includes(query)) ||
                            (s.trackingNumber && String(s.trackingNumber).toLowerCase().includes(query)) ||
                            (s.receiver?.city && s.receiver.city.toLowerCase().includes(filter.toLowerCase())) ||
                            (s.sender?.city && s.sender.city.toLowerCase().includes(filter.toLowerCase()));
      
      const normalizedStatus = formatStatus(s.status);
      const matchesStatus = statusFilter === 'All' || normalizedStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    setVisibleCount(5);
  }, [filter, statusFilter]);

  const visibleShipments = filteredShipments.slice(0, visibleCount);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-900">Shipment History</h2>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search shipments..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm w-full md:w-64"
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
                showFilters || statusFilter !== 'All' 
                  ? 'bg-purple-50 border-purple-200 text-purple-700' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filter
              {statusFilter !== 'All' && <span className="ml-1 px-1.5 py-0.5 bg-purple-200 text-purple-800 rounded-full text-xs">{statusFilter}</span>}
            </button>
            
            {showFilters && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowFilters(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 p-2 z-20 animate-scale-in origin-top-right">
                  <div className="text-xs font-semibold text-slate-400 px-3 py-2 uppercase tracking-wider">Status</div>
                  {['All', 'Booked', 'In Transit', 'Out For Delivery', 'Delivered', 'Cancelled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => { setStatusFilter(status); setShowFilters(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        statusFilter === status ? 'bg-purple-50 text-purple-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                  {statusFilter !== 'All' && (
                     <button 
                       onClick={() => { setStatusFilter('All'); setShowFilters(false); }}
                       className="w-full text-center mt-2 py-2 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors border-t border-slate-100"
                     >
                       Clear Filter
                     </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tracking ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Route</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleShipments.map((shipment) => {
                const stableId = shipment.trackingNumber || shipment.trackingId || shipment.id;
                return (
                <tr key={stableId} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => handleTrack(stableId)}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Package className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-purple-600 group-hover:text-purple-700 transition-colors underline decoration-purple-200 underline-offset-2">{stableId}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(shipment.status)}`}>
                      {formatStatus(shipment.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-slate-900">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        {shipment.sender?.city || 'N/A'}
                      </div>
                      <div className="h-4 border-l border-dashed border-slate-300 ml-1"></div>
                      <div className="flex items-center gap-2 text-sm text-slate-900">
                        <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                        {shipment.receiver?.city || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600 text-sm">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {shipment.date}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600">
                      <div>{shipment.type}</div>
                      <div className="text-xs text-slate-400">{shipment.weight} kg</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{formatCurrency(shipment.cost)}</div>
                    <div className="text-xs text-slate-400">{String(shipment.paymentStatus || 'Paid')}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       {/* Link to Invoice - Available for most statuses except maybe cancelled/pending if unpaid */}
                       {['delivered', 'in transit', 'out for delivery', 'booked'].includes(formatStatus(shipment.status).toLowerCase()) && (
                           <button 
                              onClick={() => navigate(`/dashboard/invoice/${stableId}`)}
                              className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="View Invoice"
                           >
                             <FileText className="w-4 h-4" />
                           </button>
                       )}

                       {/* Rating - Only for Delivered */}
                       {formatStatus(shipment.status).toLowerCase() === 'delivered' && !shipment.rating && (
                           <button 
                              onClick={() => handleAction('rate', shipment)}
                              className="p-2 text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors"
                              title="Rate Shipment"
                            >
                             <ThumbsUp className="w-4 h-4" />
                           </button>
                       )}

                       {/* Cancel - Only for Pending/Booked */}
                       {['pending', 'booked'].includes(formatStatus(shipment.status).toLowerCase()) && (
                          <button 
                            onClick={() => handleAction('cancel', shipment)}
                            disabled={cancellingId === stableId}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Cancel Shipment"
                          >
                           <Ban className="w-4 h-4" />
                          </button>
                       )}
                       
                       {/* Delete - Only for history cleanup (Cancelled/Delivered) */}
                       {['cancelled', 'delivered'].includes(formatStatus(shipment.status).toLowerCase()) && (
                           <button 
                              onClick={() => confirmDelete(shipment)}
                              disabled={deletingId === stableId}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete from History"
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                       )}
                    </div>
                  </td>
                </tr>
                );
              })}
              {filteredShipments.length === 0 && (
                  <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center p-6">
                             <Package className="w-16 h-16 text-slate-200 mb-4" />
                             <p className="text-lg font-medium text-slate-700">
                                {shipmentsToDisplay.length === 0 ? "You haven't made any shipments yet." : "No shipments found matching your search."}
                             </p>
                             {shipmentsToDisplay.length === 0 && (
                                 <button onClick={() => navigate('/dashboard/book')} className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                                    Book Your First Shipment
                                 </button>
                             )}
                          </div>
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredShipments.length > 5 && (
          <div className="p-4 border-t border-slate-100 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => (prev >= filteredShipments.length ? 5 : filteredShipments.length))}
              className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
            >
              {visibleCount >= filteredShipments.length ? 'Show Less' : `Show More (${filteredShipments.length - visibleCount})`}
            </button>
          </div>
        )}
      </div>

      <RateShipmentModal 
        isOpen={activeModal === 'rate'}
        onClose={closeModal}
        shipmentId={selectedShipment?.id}
        onSubmit={handleRate}
      />

      <CancelShipmentModal 
        isOpen={activeModal === 'cancel'}
        onClose={closeModal}
        shipmentId={selectedShipment?.id}
        onConfirm={handleCancel}
      />

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Shipment"
        message="Are you sure you want to delete this shipment from your history? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}


