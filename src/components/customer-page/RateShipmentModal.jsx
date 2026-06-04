import React, { useState } from 'react';
import { Star, X } from 'lucide-react';

export function RateShipmentModal({ isOpen, onClose, shipmentId, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const shouldClose = await onSubmit({ rating, feedback, shipmentId });
    if (shouldClose !== false) {
      onClose();
      setRating(0);
      setFeedback('');
      setHoverRating(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-scale-in">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Rate Delivery</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="text-center">
            <p className="text-slate-500 mb-4">How was your experience with shipment <span className="font-semibold text-slate-900">{shipmentId}</span>?</p>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star 
                    className={`w-8 h-8 ${
                      (hoverRating || rating) >= star 
                        ? 'text-yellow-400 fill-yellow-400' 
                        : 'text-slate-300'
                    } transition-colors`} 
                  />
                </button>
              ))}
            </div>
            <p className="text-sm font-medium text-slate-600 mt-2">
              {rating === 5 ? 'Excellent!' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : rating === 2 ? 'Poor' : rating === 1 ? 'Terrible' : 'Select a rating'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Additional Feedback</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us what you liked or how we can improve..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={rating === 0}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            Submit Feedback
          </button>
        </form>
      </div>
    </div>
  );
}

