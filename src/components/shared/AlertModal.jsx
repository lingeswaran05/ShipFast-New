
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export function AlertModal({ isOpen, onClose, title, message, type = 'success' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-500 mb-6">{message}</p>
          
          <button 
            onClick={onClose}
            className={`w-full py-2.5 rounded-lg font-semibold text-white shadow-lg transition-colors ${type === 'success' ? 'bg-green-600 hover:bg-green-700 shadow-green-500/20' : 'bg-red-600 hover:bg-red-700 shadow-red-500/20'}`}
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}

