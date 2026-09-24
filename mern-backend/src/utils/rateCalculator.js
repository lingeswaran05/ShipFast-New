import { PricingConfig } from '../models/PricingConfig.js';

export const normalizeServiceType = (serviceType = '') => {
  const raw = String(serviceType || 'Standard').toUpperCase().replace(/[\s-]/g, '_').trim();
  if (raw === 'EXPRESS') return 'EXPRESS';
  if (raw === 'SAME_DAY' || raw === 'SAMEDAY') return 'SAME_DAY';
  return 'STANDARD';
};

export const isCodPaymentMethod = (paymentMethod = '') => {
  const normalized = String(paymentMethod || '').toUpperCase().trim();
  return normalized === 'COD' || normalized === 'CASH';
};

export const roundToRupee = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num);
};

export const getEffectivePricingConfig = async () => {
  let config = await PricingConfig.findById('DEFAULT');
  if (!config) {
    config = await PricingConfig.create({
      _id: 'DEFAULT',
      standardRatePerKg: 80.0,
      expressMultiplier: 1.75,
      sameDayMultiplier: 2.0,
      distanceSurcharge: 40.0,
      fuelSurchargePct: 9.0,
      gstPct: 5.0,
      codHandlingFee: 50.0
    });
  }
  return config;
};

export const calculateRateFromInputs = async ({
  weight = 0,
  serviceType = 'STANDARD',
  originPincode = '',
  destinationPincode = '',
  paymentMethod = 'ONLINE'
}) => {
  const pricing = await getEffectivePricingConfig();
  const normalizedService = normalizeServiceType(serviceType);
  const normalizedWeight = Math.max(Number(weight) || 0, 0);

  let baseRate = normalizedWeight * pricing.standardRatePerKg;

  const origPin = String(originPincode || '').trim();
  const destPin = String(destinationPincode || '').trim();

  if (origPin.length >= 2 && destPin.length >= 2) {
    if (origPin.substring(0, 2) !== destPin.substring(0, 2)) {
      baseRate += pricing.distanceSurcharge;
    }
  }

  if (normalizedService === 'EXPRESS') {
    baseRate *= pricing.expressMultiplier;
  } else if (normalizedService === 'SAME_DAY') {
    baseRate *= (pricing.expressMultiplier * pricing.sameDayMultiplier);
  }

  const fuelSurcharge = (baseRate * pricing.fuelSurchargePct) / 100.0;
  const gst = (baseRate * pricing.gstPct) / 100.0;
  const codFee = isCodPaymentMethod(paymentMethod) ? pricing.codHandlingFee : 0.0;
  const totalCost = baseRate + fuelSurcharge + gst + codFee;

  let etaDays = 4;
  if (normalizedService === 'SAME_DAY') {
    etaDays = 1;
  } else if (normalizedService === 'EXPRESS') {
    etaDays = 2;
  }

  return {
    baseRate: roundToRupee(baseRate),
    fuelSurcharge: roundToRupee(fuelSurcharge),
    gst: roundToRupee(gst),
    codHandlingFee: roundToRupee(codFee),
    totalCost: roundToRupee(totalCost),
    estimatedDeliveryDays: etaDays
  };
};
