import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

export function CancelShipmentModal({ isOpen, onClose, shipmentId, onConfirm }) {
  const [reason, setReason] = useState('');
  
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({ shipmentId, reason });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-scale-in">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-red-600 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Cancel Shipment
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-800">
              Are you sure you want to cancel shipment <span className="font-bold">{shipmentId}</span>? This action cannot be undone.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Reason for Cancellation</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-700"
                required
              >
                <option value="">Select a reason</option>
                <option value="changed_mind">Changed my mind</option>
                <option value="wrong_address">Incorrect address details</option>
                <option value="better_price">Found better price</option>
                <option value="delayed">Pickup delayed</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="py-3 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
              >
                Keep Shipment
              </button>
              <button
                type="submit"
                disabled={!reason}
                className="py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20"
              >
                Confirm Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


