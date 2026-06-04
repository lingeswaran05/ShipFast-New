import { useState } from 'react';
import { CreditCard, IndianRupee, Shield, Check, ArrowLeft, Smartphone } from 'lucide-react';

export function PaymentPage({ amount, serviceType, onPaymentComplete, onBack }) {
  const [selectedMethod, setSelectedMethod] = useState('paypal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Payment method details state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [cardName, setCardName] = useState('');
  const [upiId, setUpiId] = useState('');

  const handlePayment = (e) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentSuccess(true);
      
      // Auto-complete after 2 seconds
      setTimeout(() => {
        onPaymentComplete();
      }, 2000);
    }, 2000);
  };

  if (paymentSuccess) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in-up">
        <div className="bg-white rounded-2xl border-2 border-green-200 p-10 shadow-xl">
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg animate-pulse">
              <Check className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-900">Payment Successful!</h2>
            <p className="text-lg text-slate-600">Your payment of Rs {amount.toFixed(2)} has been processed successfully</p>
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <p className="text-green-800 font-semibold">
                Transaction ID: TXN{Math.random().toString(36).substr(2, 9).toUpperCase()}
              </p>
            </div>
            <p className="text-slate-500">Redirecting to confirmation page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-3 gap-6">
        {/* Payment Methods & Form */}
        <div className="col-span-2 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h2 className="text-slate-800">Payment Method</h2>
              <p className="text-slate-600">Choose your preferred payment method</p>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setSelectedMethod('paypal')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedMethod === 'paypal'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <IndianRupee className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-slate-800">PayPal</div>
                    <div className="text-slate-500">Fast & Secure</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedMethod === 'card'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-slate-800">Credit/Debit Card</div>
                    <div className="text-slate-500">Visa, Mastercard, etc.</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('upi')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedMethod === 'upi'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-slate-800">UPI</div>
                    <div className="text-slate-500">Google Pay, PhonePe</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('netbanking')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedMethod === 'netbanking'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <IndianRupee className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-slate-800">Net Banking</div>
                    <div className="text-slate-500">All major banks</div>
                  </div>
                </div>
              </button>
            </div>

            {/* Payment Form based on selected method */}
            <form onSubmit={handlePayment} className="space-y-4">
              {selectedMethod === 'paypal' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <IndianRupee className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-slate-800 mb-2">PayPal Checkout</h3>
                    <p className="text-slate-600 mb-4">
                      You will be redirected to PayPal to complete your payment securely
                    </p>
                    <div className="text-slate-500">Amount: Rs {amount.toFixed(2)}</div>
                  </div>
                </div>
              )}

              {selectedMethod === 'card' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-slate-700">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-slate-700">Expiry Date</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-slate-700">CVV</label>
                      <input
                        type="text"
                        value={cardCVV}
                        onChange={(e) => setCardCVV(e.target.value)}
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-slate-700">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Senthilnathan P"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              )}

              {selectedMethod === 'upi' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-slate-700">UPI ID</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="yourname@upi"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-orange-800">
                      A payment request will be sent to your UPI app. Please approve it to complete the transaction.
                    </p>
                  </div>
                </div>
              )}

              {selectedMethod === 'netbanking' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-slate-700">Select Your Bank</label>
                    <select className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Choose your bank</option>
                      <option value="sbi">State Bank of India</option>
                      <option value="hdfc">HDFC Bank</option>
                      <option value="icici">ICICI Bank</option>
                      <option value="axis">Axis Bank</option>
                      <option value="kotak">Kotak Mahindra Bank</option>
                    </select>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800">
                      You will be redirected to your bank's secure login page
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-lg transition-colors"
              >
                {isProcessing ? 'Processing Payment...' : `Pay Rs ${amount.toFixed(2)}`}
              </button>
            </form>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-6">
            <h3 className="text-slate-800 mb-4">Order Summary</h3>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-600">Service Type</span>
                <span className="text-slate-800">{serviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Base Rate</span>
                <span className="text-slate-800">Rs {(amount / 1.2916).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Fuel Surcharge (8%)</span>
                <span className="text-slate-800">Rs {(amount / 1.2916 * 0.08).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">GST (18%)</span>
                <span className="text-slate-800">Rs {(amount / 1.2916 * 0.18).toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-800">Total Amount</span>
                <span className="text-slate-800">Rs {amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-800 mb-1">Secure Payment</p>
                <p className="text-slate-600">Your payment information is encrypted and secure</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-slate-500">
                <Check className="w-4 h-4" />
                <span>256-bit SSL Encryption</span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 mt-2">
                <Check className="w-4 h-4" />
                <span>PCI DSS Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



