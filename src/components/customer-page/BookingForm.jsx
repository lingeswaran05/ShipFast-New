import { useState, useEffect } from 'react';
import { Package, Truck, Calendar, MapPin, CreditCard, ChevronRight, CheckCircle, AlertCircle, ArrowLeft, ArrowRight, Wallet, Banknote, Printer } from 'lucide-react';
import { useShipment } from '../../context/ShipmentContext';
import { shipmentService } from '../../lib/shipmentService';
import { BarcodeGenerator } from '../shared/BarcodeGenerator';
import { printElementById } from '../../lib/printUtils';
import { toast } from 'sonner';

export function BookingForm({ onViewInvoice }) {
  const { addShipment, calculateRate, pricingConfig } = useShipment();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    sender: { name: '', phone: '+91', doorAddress: '', city: '', state: 'Tamil Nadu', pincode: '' },
    receiver: { name: '', phone: '+91', doorAddress: '', city: '', state: 'Tamil Nadu', pincode: '' },
    package: { weight: '', length: '', width: '', height: '', type: 'Standard', declaredValue: '' },
    service: 'standard', 
    paymentMode: ''
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [finalAmount, setFinalAmount] = useState(0);
  const [serviceQuotes, setServiceQuotes] = useState({
    standard: null,
    express: null,
    sameday: null
  });
  const [isRateLoading, setIsRateLoading] = useState(false);

  const paymentLabel = formData.paymentMode === 'cash' ? 'COD' : String(formData.paymentMode || 'ONLINE').toUpperCase();
  const paymentStatusLabel = formData.paymentMode === 'cash' ? 'PENDING' : 'SUCCESS';
  const codHandlingFee = Number(pricingConfig?.codHandlingFee ?? 50);

  const roundToRupee = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.round(numeric);
  };

  const normalizePhoneInput = (value = '') => {
    const digits = String(value || '').replace(/\D/g, '');
    const withoutCountry = digits.startsWith('91') ? digits.slice(2) : digits;
    return `+91${withoutCountry.slice(0, 10)}`;
  };

  const isValidIndianPhone = (value) => /^\+91\d{10}$/.test(String(value || '').trim());

  const isValidAddressParts = (details = {}) => {
    return (
      String(details.doorAddress || '').trim().length >= 5 &&
      String(details.city || '').trim().length >= 2 &&
      String(details.state || '').trim().length >= 2 &&
      /^\d{6}$/.test(String(details.pincode || '').trim())
    );
  };

  const composeAddressLine = (details = {}) => (
    [details.doorAddress, details.city, details.state, details.pincode]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(', ')
  );

  const normalizeComparable = (value = '') => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const validateSenderReceiverStep = () => {
    if (!formData.sender.name || !formData.receiver.name) {
      toast.error('Sender and receiver names are required');
      return false;
    }
    if (!isValidIndianPhone(formData.sender.phone) || !isValidIndianPhone(formData.receiver.phone)) {
      toast.error('Phone number must be in +91XXXXXXXXXX format');
      return false;
    }
    if (formData.sender.phone === formData.receiver.phone) {
      toast.error('Sender and receiver phone numbers cannot be the same');
      return false;
    }
    if (!isValidAddressParts(formData.sender) || !isValidAddressParts(formData.receiver)) {
      toast.error('Enter door address, city, state and valid 6-digit pincode for sender and receiver');
      return false;
    }
    if (normalizeComparable(composeAddressLine(formData.sender)) === normalizeComparable(composeAddressLine(formData.receiver))) {
      toast.error('Sender and receiver addresses cannot be the same');
      return false;
    }
    return true;
  };

  const handleInputChange = (section, field, value) => {
    const nextValue = (field === 'phone' && (section === 'sender' || section === 'receiver'))
      ? normalizePhoneInput(value)
      : value;
    if (section === 'root') {
      setFormData(prev => ({ ...prev, [field]: nextValue }));
    } else {
      setFormData(prev => ({
        ...prev,
        [section]: { ...prev[section], [field]: nextValue }
      }));
    }
  };

  const getServiceTypeLabel = (id) => {
      switch(id) {
          case 'express': return 'Express';
          case 'sameday': return 'Same Day';
          default: return 'Standard';
      }
  };

  const normalizeQuote = (value) => {
    return roundToRupee(value);
  };

  const fallbackPrice = (serviceId) => {
    const typeLabel = getServiceTypeLabel(serviceId);
    let price = Number(calculateRate(formData.package.weight, typeLabel)) || 0;
    if (serviceId === 'sameday') {
      const expressFallback = Number(calculateRate(formData.package.weight, 'Express')) || 0;
      price = expressFallback * 2;
    }
    return normalizeQuote(price);
  };

  const getCalculatedPrice = (serviceId) => {
    const quoted = serviceQuotes[serviceId];
    if (quoted !== null && quoted !== undefined) {
      return normalizeQuote(quoted);
    }
    return fallbackPrice(serviceId);
  };

  const getTotalPrice = () => {
      let price = getCalculatedPrice(formData.service);
      if (formData.paymentMode === 'cash') {
          price += codHandlingFee;
      }
      return normalizeQuote(price);
  };

  useEffect(() => {
    const weight = parseFloat(formData.package.weight);
    const originPincode = String(formData.sender.pincode || '').trim();
    const destinationPincode = String(formData.receiver.pincode || '').trim();

    if (!Number.isFinite(weight) || weight <= 0) {
      setServiceQuotes({ standard: null, express: null, sameday: null });
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsRateLoading(true);
      try {
        const [standardQuote, expressQuote] = await Promise.all([
          shipmentService.calculateRate({
            weight,
            serviceType: 'Standard',
            originPincode,
            destinationPincode
          }),
          shipmentService.calculateRate({
            weight,
            serviceType: 'Express',
            originPincode,
            destinationPincode
          })
        ]);

        if (isCancelled) return;
        const standardTotal = normalizeQuote(standardQuote?.totalCost);
        const expressTotal = normalizeQuote(expressQuote?.totalCost);

        setServiceQuotes({
          standard: standardTotal,
          express: expressTotal,
          sameday: normalizeQuote(expressTotal * 2)
        });
      } catch {
        if (isCancelled) return;
        setServiceQuotes({
          standard: fallbackPrice('standard'),
          express: fallbackPrice('express'),
          sameday: fallbackPrice('sameday')
        });
      } finally {
        if (!isCancelled) {
          setIsRateLoading(false);
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [formData.package.weight, formData.sender.pincode, formData.receiver.pincode, pricingConfig?.standardRatePerKg, pricingConfig?.expressMultiplier, pricingConfig?.distanceSurcharge, pricingConfig?.fuelSurchargePct, pricingConfig?.gstPct]);

  const handleNext = () => {
    if (step === 1 && !validateSenderReceiverStep()) {
      return;
    }
    if (step === 2 && (!Number.isFinite(Number(formData.package.weight)) || Number(formData.package.weight) <= 0)) {
      toast.error('Package weight must be greater than 0');
      return;
    }
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateSenderReceiverStep()) {
      setStep(1);
      return;
    }
    if (!formData.paymentMode) {
        toast.error('Please select a payment method');
        return;
    }
    const bookingAmount = getTotalPrice();

    // Logic for Cash on Pickup
    if (formData.paymentMode === 'cash') {
      setIsProcessing(true);
      
      try {
        const newShipment = await addShipment({
           sender: formData.sender,
           receiver: formData.receiver,
           weight: formData.package.weight,
           cost: bookingAmount,
           type: getServiceTypeLabel(formData.service),
           paymentMode: formData.paymentMode,
           status: 'Booked',
           service: getServiceTypeLabel(formData.service)
        });

        const shipmentTrackingId = newShipment?.trackingNumber || newShipment?.trackingId || newShipment?.id || `SF-${Date.now()}`;
        setTrackingId(shipmentTrackingId);
        setFinalAmount(Number(newShipment?.cost) || bookingAmount);
        setBookingSuccess(true);
        toast.success('Shipment booked successfully!');
      } catch (error) {
          toast.error('Failed to book shipment. Please try again.');
          console.error(error);
      } finally {
          setIsProcessing(false);
      }
      return;
    }

    // Logic for Online Payment (Razorpay)
    const amount = Math.round(bookingAmount * 100); // convert to paise

    const options = {
      key: "rzp_test_SHWiLnO0BN3pEN", // From user snippet
      amount: amount,
      currency: "INR",
      name: "ShipFast",
      description: "Shipment Booking",
      
      handler: async function (response) {
        console.log("Payment Success:", response);
        setIsProcessing(true); // Start processing state after successful payment

        try {
          // Create shipment only after payment success
          const newShipment = await addShipment({
            sender: formData.sender,
            receiver: formData.receiver,
            weight: formData.package.weight,
            cost: bookingAmount,
            type: getServiceTypeLabel(formData.service),
            paymentMode: formData.paymentMode,
            status: 'Booked',
            service: getServiceTypeLabel(formData.service),
            transactionId: response.razorpay_payment_id
          });

          const shipmentTrackingId = newShipment?.trackingNumber || newShipment?.trackingId || newShipment?.id || `SF-${Date.now()}`;
          setTrackingId(shipmentTrackingId);
          setFinalAmount(Number(newShipment?.cost) || bookingAmount);
          setBookingSuccess(true);
          toast.success('Shipment booked successfully!');
        } catch (error) {
           toast.error('Payment successful, but booking failed. Please contact support.');
           console.error(error);
        } finally {
           setIsProcessing(false);
        }
      },

      prefill: {
        name: formData.sender.name,
        contact: formData.sender.phone
      },

      theme: {
        color: "#7c3aed"
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const handlePrint = () => {
      printElementById('booking-label-print', 'Shipment Label');
  };

  const services = [
    { id: 'standard', name: 'Standard Delivery', time: '3-5 Days', price: `\u20b9${getCalculatedPrice('standard')}`, icon: Truck },
    { id: 'express', name: 'Express Priority', time: '1-2 Days', price: `\u20b9${getCalculatedPrice('express')}`, icon: Package },
    { id: 'sameday', name: 'Same Day Delivery', time: 'Today', price: `\u20b9${getCalculatedPrice('sameday')}`, icon: Calendar },
  ];

  if (bookingSuccess) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-8 animate-fade-in-up py-10 print:py-0">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 print:hidden">
          <CheckCircle className="w-12 h-12 text-green-600 animate-bounce-subtle" />
        </div>
        
        <div className="print:hidden">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Booking Confirmed!</h2>
          <p className="text-slate-500 text-lg">Your shipment has been successfully scheduled.</p>
        </div>

        <div id="booking-label-print" className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-md mx-auto relative overflow-hidden group print:shadow-none print:border-2 print:max-w-none print:p-4 print:w-full printable">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-pink-600 print:hidden"></div>
          <div className="hidden print:block text-2xl font-bold mb-4 text-center border-b pb-4">SHIPFAST LOGISTICS</div>
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Tracking ID</p>
          <div className="text-4xl font-mono font-bold text-slate-900 tracking-widest mb-4 selection:bg-purple-100">{trackingId}</div>
          
          <div className="mb-6 flex justify-center">
             <BarcodeGenerator value={trackingId} />
          </div>

          <p className="text-xs text-slate-400 mb-4 print:hidden">Save this ID regarding your shipment</p>
          
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
             <div className="text-left">
                <p className="text-xs text-slate-400 font-semibold uppercase">Estimated Delivery</p>
                <p className="font-bold text-slate-800">
                   {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </p>
             </div>
             <div className="text-right">
                <p className="text-xs text-slate-400 font-semibold uppercase">Amount {formData.paymentMode === 'cash' ? 'To Pay' : 'Paid'}</p>
                <p className="font-bold text-slate-800">&#8377;{roundToRupee(finalAmount || getTotalPrice())}</p>
                {formData.paymentMode === 'cash' && <span className="text-[10px] text-slate-500">(Includes COD Fee &#8377;{roundToRupee(codHandlingFee)})</span>}
             </div>
          </div>
          <div className="hidden print:block mt-8 pt-6 border-t border-slate-100 text-left text-sm text-slate-600">
             <div className="grid grid-cols-2 gap-4">
                <div>
                    <span className="font-bold block mb-1">From:</span>
                    <p>{formData.sender.name}</p>
                    <p>{formData.sender.phone}</p>
                    <p>{composeAddressLine(formData.sender) || 'N/A'}</p>
                </div>
                <div>
                    <span className="font-bold block mb-1">To:</span>
                    <p>{formData.receiver.name}</p>
                    <p>{formData.receiver.phone}</p>
                    <p>{composeAddressLine(formData.receiver) || 'N/A'}</p>
                </div>
             </div>
             <div className="mt-4 pt-4 border-t">
                 <p><span className="font-bold">Service:</span> {getServiceTypeLabel(formData.service)}</p>
                 <p><span className="font-bold">Weight:</span> {formData.package.weight} kg</p>
                 <p><span className="font-bold">Content:</span> {formData.package.type}</p>
               <p><span className="font-bold">Payment Method:</span> {paymentLabel}</p>
               <p><span className="font-bold">Payment Status:</span> {paymentStatusLabel}</p>
             </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 print:hidden">
          <button 
             onClick={handlePrint}
             className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm hover:shadow flex items-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Print Label
          </button>
          <button 
             onClick={() => { setBookingSuccess(false); setFinalAmount(0); setStep(1); setFormData({...formData, paymentMode: ''}); }} 
             className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-600 hover:shadow-lg hover:shadow-purple-500/30 transition-all transform hover:-translate-y-0.5"
          >
            Book Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-10 relative">
        <div className="absolute left-0 top-1/2 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>
        <div 
          className="absolute left-0 top-1/2 h-1 bg-purple-600 -z-10 rounded-full transition-all duration-500"
          style={{ width: `${((step - 1) / 3) * 100}%` }}
        ></div>
        
        {['Sender & Receiver', 'Package Details', 'Service Selection', 'Payment & Review'].map((label, index) => (
          <div key={index} className="flex flex-col items-center gap-2 group cursor-default">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-white ${
              step > index + 1 ? 'bg-purple-600 border-purple-600 text-white' :
              step === index + 1 ? 'border-purple-600 text-purple-600 shadow-lg shadow-purple-500/20 scale-110' :
              'border-slate-300 text-slate-400'
            }`}>
              {step > index + 1 ? <CheckCircle className="w-6 h-6" /> : <span className="font-bold">{index + 1}</span>}
            </div>
            <span className={`text-xs font-semibold hidden sm:block transition-colors ${
              step >= index + 1 ? 'text-purple-900' : 'text-slate-400'
            }`}>{label}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
        {isProcessing && (
           <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in">
              <div className="w-16 h-16 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin mb-4"></div>
              <h3 className="text-xl font-bold text-slate-800">Processing...</h3>
              <p className="text-slate-500">Please wait while we confirm your booking</p>
           </div>
        )}

        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800">
            {step === 1 && 'Sender & Receiver Details'}
            {step === 2 && 'Package Information'}
            {step === 3 && 'Select Service'}
            {step === 4 && 'Payment & Review'}
          </h2>
          <p className="text-slate-500 mt-1">
             {step === 1 && 'Provide contact details for pickup and delivery'}
             {step === 2 && 'Enter weight and dimensions of your parcel'}
             {step === 3 && 'Choose the best courier service for your needs'}
             {step === 4 && 'Complete your payment securely'}
          </p>
        </div>

        <div className="p-8 min-h-[400px]">
          {step === 1 && (
            <div className="grid md:grid-cols-2 gap-10">
              <div className="space-y-6 animate-slide-in-right">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Sender Details</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium"
                      placeholder="Kavinraj M"
                      value={formData.sender.name}
                      onChange={(e) => handleInputChange('sender', 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium"
                      placeholder="+919876543210"
                      value={formData.sender.phone}
                      onChange={(e) => handleInputChange('sender', 'phone', e.target.value)}
                    />
                  </div>
                  <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-1">Full Address</label>
                     <input
                       type="text"
                       className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium"
                       placeholder="12, Mettupalayam Road"
                       value={formData.sender.doorAddress}
                       onChange={(e) => handleInputChange('sender', 'doorAddress', e.target.value)}
                     />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                     <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-1">City</label>
                       <input
                         type="text"
                         className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium"
                         placeholder="Coimbatore"
                         value={formData.sender.city}
                         onChange={(e) => handleInputChange('sender', 'city', e.target.value)}
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-1">State</label>
                       <input
                         type="text"
                         className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium"
                         placeholder="Tamil Nadu"
                         value={formData.sender.state}
                         onChange={(e) => handleInputChange('sender', 'state', e.target.value)}
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-1">Pincode</label>
                       <input
                         type="text"
                         className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium"
                         placeholder="641043"
                         value={formData.sender.pincode}
                         onChange={(e) => handleInputChange('sender', 'pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                       />
                     </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center text-pink-600">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Receiver Details</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium"
                      placeholder="Thenmozhi S"
                      value={formData.receiver.name}
                      onChange={(e) => handleInputChange('receiver', 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium"
                      placeholder="+919876543210"
                      value={formData.receiver.phone}
                      onChange={(e) => handleInputChange('receiver', 'phone', e.target.value)}
                    />
                  </div>
                  <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-1">Full Address</label>
                     <input
                       type="text"
                       className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium"
                       placeholder="44, West Veli Street"
                       value={formData.receiver.doorAddress}
                       onChange={(e) => handleInputChange('receiver', 'doorAddress', e.target.value)}
                     />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                     <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-1">City</label>
                       <input
                         type="text"
                         className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium"
                         placeholder="Madurai"
                         value={formData.receiver.city}
                         onChange={(e) => handleInputChange('receiver', 'city', e.target.value)}
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-1">State</label>
                       <input
                         type="text"
                         className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium"
                         placeholder="Tamil Nadu"
                         value={formData.receiver.state}
                         onChange={(e) => handleInputChange('receiver', 'state', e.target.value)}
                       />
                     </div>
                     <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-1">Pincode</label>
                       <input
                         type="text"
                         className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium"
                         placeholder="625001"
                         value={formData.receiver.pincode}
                         onChange={(e) => handleInputChange('receiver', 'pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                       />
                     </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Weight (kg)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium"
                      placeholder="0.5"
                      value={formData.package.weight}
                      onChange={(e) => handleInputChange('package', 'weight', e.target.value)}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">kg</span>
                  </div>
                </div>
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-1">Declared Value</label>
                   <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">&#8377;</span>
                     <input 
                       type="number" 
                       className="w-full pl-8 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium"
                       placeholder="1000"
                       value={formData.package.declaredValue}
                       onChange={(e) => handleInputChange('package', 'declaredValue', e.target.value)}
                     />
                   </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Dimensions (cm) - Optional</label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="L"
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium text-center"
                      value={formData.package.length}
                      onChange={(e) => handleInputChange('package', 'length', e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">CM</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="W"
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium text-center"
                      value={formData.package.width}
                      onChange={(e) => handleInputChange('package', 'width', e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">CM</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="H"
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all font-medium text-center"
                      value={formData.package.height}
                      onChange={(e) => handleInputChange('package', 'height', e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">CM</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Content Type</label>
                <div className="grid grid-cols-3 gap-4">
                  {['Documents', 'Electronics', 'Clothing', 'Fragile', 'Others'].map((type) => (
                    <button
                      key={type}
                      onClick={() => handleInputChange('package', 'type', type)}
                      className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                        formData.package.type === type 
                          ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm' 
                          : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="text-sm text-slate-500">
                {isRateLoading ? 'Syncing live rates from backend...' : 'Rates are synced with backend calculation.'}
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {services.map((service) => (
                  <div 
                    key={service.id}
                    onClick={() => handleInputChange('root', 'service', service.id)}
                    className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                      formData.service === service.id 
                        ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-500/20' 
                        : 'border-slate-100 hover:border-purple-300 hover:shadow-lg'
                    }`}
                  >
                    {formData.service === service.id && (
                      <div className="absolute top-4 right-4 text-purple-600">
                        <CheckCircle className="w-6 h-6 fill-purple-100" />
                      </div>
                    )}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                       formData.service === service.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <service.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{service.name}</h3>
                    <p className="text-sm text-slate-500 mb-4">{service.time}</p>
                    <div className="text-2xl font-bold text-slate-900">{service.price}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
              
              <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 flex items-start gap-4">
                 <AlertCircle className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                 <div>
                    <h4 className="font-bold text-purple-800 text-sm uppercase tracking-wide mb-1">Review your booking</h4>
                    <p className="text-purple-600 text-sm">Please ensure all details are correct. You can go back and edit if needed.</p>
                 </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                   <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-purple-500"></div> Shipment Summary
                      </h4>
                      <div className="space-y-3 text-sm">
                         <div className="flex justify-between">
                            <span className="text-slate-500">Service</span>
                            <span className="font-semibold text-slate-900">{services.find(s=>s.id === formData.service)?.name || 'Standard'}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-slate-500">Weight</span>
                            <span className="font-semibold text-slate-900">{formData.package.weight || '0.5'} kg</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-slate-500">Content</span>
                            <span className="font-semibold text-slate-900">{formData.package.type}</span>
                         </div>
                      </div>
                   </div>

                   <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-green-500"></div> Cost Breakdown
                      </h4>
                      <div className="space-y-3 text-sm">
                         <div className="flex justify-between">
                            <span className="text-slate-500">Base Rate</span>
                            <span className="font-medium text-slate-900">&#8377;{getCalculatedPrice(formData.service)}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-slate-500">Tax & Fees</span>
                            <span className="font-medium text-slate-900">Included</span>
                         </div>
                         {formData.paymentMode === 'cash' && (
                           <div className="flex justify-between">
                              <span className="text-slate-500">Cash Handling Fee</span>
                              <span className="font-medium text-slate-900">&#8377;{roundToRupee(codHandlingFee)}</span>
                           </div>
                         )}
                         <div className="border-t border-slate-100 pt-3 flex justify-between text-lg font-bold">
                            <span className="text-slate-900">Total</span>
                            <span className="text-purple-600">&#8377;{getTotalPrice()}</span>
                         </div>
                         <div className="text-xs text-slate-500">Live backend calculated rate</div>
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                   <h4 className="font-bold text-slate-900 mb-2">Select Payment Method</h4>
                   {[
                      { id: 'upi', name: 'UPI / QR Code', icon: Wallet },
                      { id: 'card', name: 'Credit / Debit Card', icon: CreditCard },
                      { id: 'cash', name: 'Cash on Pickup', icon: Banknote },
                   ].map((method) => (
                      <div 
                        key={method.id}
                        onClick={() => handleInputChange('root', 'paymentMode', method.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer flex items-center gap-4 transition-all ${
                           formData.paymentMode === method.id
                             ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-500/20'
                             : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                         <div className={`p-2 rounded-lg ${formData.paymentMode === method.id ? 'bg-purple-200 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                            <method.icon className="w-5 h-5" />
                         </div>
                         <span className="font-semibold text-slate-700">{method.name}</span>
                         {formData.paymentMode === method.id && <CheckCircle className="w-5 h-5 text-purple-600 ml-auto" />}
                      </div>
                   ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-slate-600 hover:bg-slate-200 hover:text-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          ) : (
            <div />
          )}
          
          <button 
            onClick={step === 4 ? handleSubmit : handleNext}
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold shadow-lg shadow-purple-500/30 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            {step === 4 ? (
               // Logic to show "Confirm & Pay" vs "Confirm Shipment" based on Payment Mode
               formData.paymentMode === 'cash' ? (
                   <>Confirm Shipment <CheckCircle className="w-5 h-5" /></>
               ) : (
                   <>Confirm & Pay <CreditCard className="w-5 h-5" /></>
               )
            ) : (
               <>Continue <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


