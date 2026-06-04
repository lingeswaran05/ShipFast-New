import { AlertTriangle, X } from 'lucide-react';

export function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', type = 'danger' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-500 mb-6">{message}</p>
          
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => { onConfirm(); onClose(); }}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-white shadow-lg transition-colors ${type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

