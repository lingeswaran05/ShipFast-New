import axios from 'axios';
import { API_BASE_PATHS, API_ENDPOINTS } from '../config/api';
import { authStorage } from './authService';
import { resolveServiceBaseUrls, toServiceBaseUrl, shouldRetryWithFallback } from './apiConfig';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://shipfast-gateway.onrender.com',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

const SHIPMENT_BASE_CANDIDATES = resolveServiceBaseUrls(import.meta.env.VITE_SHIPMENT_BASE_URL, {
  defaultBaseUrl: API_ENDPOINTS.SHIPMENT
});
const SHIPMENT_BASE_URLS = SHIPMENT_BASE_CANDIDATES
  .map((base) => toServiceBaseUrl(base, API_BASE_PATHS.SHIPMENT))
  .filter((value, index, list) => list.indexOf(value) === index);

let activeShipmentBaseIndex = 0;
const setActiveShipmentBase = (index) => {
  activeShipmentBaseIndex = index;
  api.defaults.baseURL = SHIPMENT_BASE_URLS[index] || SHIPMENT_BASE_URLS[0];
};

const withShipmentBaseFallback = async (requestFactory, options = {}) => {
  const { retryOnFailure = true } = options;
  let lastError;
  for (let offset = 0; offset < SHIPMENT_BASE_URLS.length; offset += 1) {
    const index = (activeShipmentBaseIndex + offset) % SHIPMENT_BASE_URLS.length;
    setActiveShipmentBase(index);
    try {
      return await requestFactory(api);
    } catch (error) {
      lastError = error;
      const shouldRetry = retryOnFailure && shouldRetryWithFallback(error) && offset < SHIPMENT_BASE_URLS.length - 1;
      if (!shouldRetry) throw error;
    }
  }
  throw lastError;
};

const endpointAvailability = {
  list: true,
  mine: true,
  create: true,
  update: true,
  rate: true,
  pricing: true
};

api.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const splitAddress = (value = '') => {
  const parts = String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
  if (parts.length === 0) return { doorAddress: '', city: '', state: '', pincode: '', address: '' };
  if (parts.length === 1) return { doorAddress: parts[0], city: '', state: '', pincode: '', address: parts[0] };
  if (parts.length === 2) {
    const secondLooksLikePincode = /^[0-9]{4,8}$/.test(parts[1]);
    if (secondLooksLikePincode) {
      return { doorAddress: parts[0], city: '', state: '', pincode: parts[1], address: parts[0] };
    }
    return { doorAddress: parts[0], city: parts[1], state: '', pincode: '', address: parts[0] };
  }
  if (parts.length === 3) {
    return {
      doorAddress: parts[0],
      city: parts[1],
      state: '',
      pincode: parts[2].replace(/[^\d]/g, '').slice(0, 6),
      address: parts[0]
    };
  }
  return {
    doorAddress: parts.slice(0, parts.length - 3).join(', ') || parts[0],
    city: parts[parts.length - 3] || '',
    state: parts[parts.length - 2] || '',
    pincode: (parts[parts.length - 1] || '').replace(/[^\d]/g, '').slice(0, 6),
    address: parts.slice(0, parts.length - 3).join(', ') || parts[0]
  };
};

const composeAddress = (doorAddress, city, state, pincode) => {
  return [doorAddress, city, state, pincode].map((item) => String(item || '').trim()).filter(Boolean).join(', ');
};

const normalizeServiceType = (value) => {
  const input = String(value || 'Standard').toLowerCase().replace(/[_-]/g, ' ').trim();
  if (input === 'express') return 'Express';
  if (input === 'same day' || input === 'sameday') return 'Same Day';
  return 'Standard';
};

const normalizePaymentMethod = (value) => {
  const input = String(value || '').toLowerCase().trim();
  if (input === 'cash' || input === 'cod') return 'COD';
  if (input === 'upi') return 'UPI';
  if (input === 'card') return 'CARD';
  return 'ONLINE';
};

const normalizeShipmentStatus = (status) => {
  const raw = String(status || 'Booked').replace(/_/g, ' ').trim().toLowerCase();
  if (!raw) return 'Booked';
  return raw.split(/\s+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const resolveUserIdentifier = (userId) => {
  if (userId) return userId;
  const current = authStorage.getCurrentUser() || {};
  return current.userId || current.id || current.email || '';
};

const toIdentityValue = (value) => String(value || '').trim().toLowerCase();
const asUniqueIdentityList = (values = []) => (
  [...new Set((Array.isArray(values) ? values : [values]).map((value) => String(value || '').trim()).filter(Boolean))]
);
const matchesIdentity = (shipment = {}, allowedIdentitySet = new Set()) => {
  if (!allowedIdentitySet || allowedIdentitySet.size === 0) return false;
  const candidates = [
    shipment.customerId,
    shipment.userId,
    shipment.customerEmail,
    shipment.email,
    shipment.ownerId
  ]
    .map(toIdentityValue)
    .filter(Boolean);
  return candidates.some((candidate) => allowedIdentitySet.has(candidate));
};
const dedupeShipments = (list = []) => {
  const seen = new Set();
  const result = [];
  for (const item of list || []) {
    const key = String(item?.shipmentId || item?.trackingNumber || item?.trackingId || item?.id || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
};
const roundToRupee = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric);
};

const defaultPricingConfig = () => ({
  standardRatePerKg: 80,
  expressMultiplier: 1.75,
  sameDayMultiplier: 2,
  distanceSurcharge: 40,
  fuelSurchargePct: 9,
  gstPct: 5,
  codHandlingFee: 50
});

const mapShipment = (shipment = {}) => {
  const sender = shipment.sender || {};
  const receiver = shipment.recipient || shipment.receiver || {};
  const senderRawAddress = sender.addressLine || sender.address || '';
  const receiverRawAddress = receiver.addressLine || receiver.address || '';
  const senderParsed = splitAddress(senderRawAddress);
  const receiverParsed = splitAddress(receiverRawAddress);
  const createdAt = shipment.createdAt ? new Date(shipment.createdAt) : new Date();
  const deliveredAt = shipment.deliveredAt ? new Date(shipment.deliveredAt) : null;
  const paymentMode = shipment.paymentMethod || shipment.paymentMode || 'ONLINE';
  const normalizedStatus = normalizeShipmentStatus(shipment.status);
  const hasCollectedAt = Boolean(shipment.paymentCollectedAt);
  const inferredPaymentStatus = String(paymentMode).toUpperCase() === 'COD'
    ? (hasCollectedAt ? 'SUCCESS' : 'PENDING')
    : 'SUCCESS';
  const paymentStatus = shipment.paymentStatus || inferredPaymentStatus;
  const originCity = sender.city || senderParsed.city || shipment.originCity || '';
  const destinationCity = receiver.city || receiverParsed.city || shipment.destinationCity || '';
  const senderDoorAddress = sender.doorAddress || senderParsed.doorAddress || '';
  const receiverDoorAddress = receiver.doorAddress || receiverParsed.doorAddress || '';
  const senderState = sender.state || senderParsed.state || '';
  const receiverState = receiver.state || receiverParsed.state || '';
  const senderPincode = sender.pincode || senderParsed.pincode || '';
  const receiverPincode = receiver.pincode || receiverParsed.pincode || '';
  const senderAddress = senderRawAddress || composeAddress(senderDoorAddress, originCity, senderState, senderPincode);
  const receiverAddress = receiverRawAddress || composeAddress(receiverDoorAddress, destinationCity, receiverState, receiverPincode);
  const mappedHistory = Array.isArray(shipment.history)
    ? shipment.history.map((event) => ({
      status: normalizeShipmentStatus(event.status),
      location: event.location || '',
      remarks: event.remarks || '',
      timestamp: event.timestamp || null
    }))
    : [];
  const originValue = shipment.origin || [senderAddress, originCity].filter(Boolean).join(', ');
  const destinationValue = shipment.destination || [receiverAddress, destinationCity].filter(Boolean).join(', ');
  const databaseId = shipment.id || shipment.shipmentId || null;
  const trackingValue = shipment.trackingNumber || shipment.trackingId || databaseId;
  const runSheetId = shipment.runSheetId || shipment.runsheetId || shipment.runSheetNumber || shipment.sheetId || null;

  return {
    id: trackingValue,
    shipmentId: databaseId || trackingValue,
    trackingId: trackingValue,
    trackingNumber: trackingValue,
    customerId: shipment.customerId || shipment.userId || null,
    userId: shipment.userId || shipment.customerId || null,
    customerEmail: shipment.customerEmail || shipment.email || shipment.customer?.email || '',
    customerName: shipment.customerName || shipment.customer?.name || '',
    createdBy: shipment.createdBy || '',
    ownerId: shipment.ownerId || '',
    email: shipment.email || '',
    status: normalizedStatus,
    service: shipment.serviceType || 'Standard',
    type: shipment.serviceType || 'Standard',
    paymentMode,
    paymentStatus,
    paymentCollectedAt: shipment.paymentCollectedAt || null,
    cost: roundToRupee(shipment.cost ?? shipment.totalCost ?? 0),
    date: createdAt.toISOString().split('T')[0],
    createdAt: shipment.createdAt || createdAt.toISOString(),
    updatedAt: shipment.updatedAt || shipment.createdAt || createdAt.toISOString(),
    origin: originValue,
    destination: destinationValue,
    runSheetId,
    assignedAgentId: shipment.assignedAgentId || null,
    proofOfDeliveryImage: shipment.proofOfDeliveryImage || shipment.podImage || null,
    deliveredBy: shipment.deliveredBy || null,
    deliveredByAgentId: shipment.deliveredByAgentId || null,
    rating: shipment.rating ?? null,
    ratingComment: shipment.ratingComment || '',
    deliveryDate: deliveredAt ? deliveredAt.toISOString().split('T')[0] : null,
    history: mappedHistory,
    sender: {
      name: sender.name || '',
      phone: sender.phone || '',
      email: sender.email || shipment.senderEmail || shipment.customerEmail || '',
      doorAddress: senderDoorAddress,
      address: senderAddress,
      city: originCity,
      state: senderState,
      pincode: senderPincode
    },
    receiver: {
      name: receiver.name || '',
      phone: receiver.phone || '',
      email: receiver.email || '',
      doorAddress: receiverDoorAddress,
      address: receiverAddress,
      city: destinationCity,
      state: receiverState,
      pincode: receiverPincode
    },
    weight: shipment.packageDetails?.weight || shipment.weight || 0
  };
};

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback
);

const getStatusCode = (error) => Number(error?.response?.status || 0);
const isUnavailableError = (error) => {
  const status = getStatusCode(error);
  return status === 404 || error?.message === 'Network Error';
};

const fallbackRate = ({ weight = 0, serviceType = 'Standard' } = {}) => {
  const normalizedWeight = Number(weight || 0);
  const pricing = defaultPricingConfig();
  const normalizedService = String(serviceType || '').toLowerCase().replace(/[_-]/g, ' ').trim();
  const distanceSurcharge = 0;
  let baseRate = Math.max(0, normalizedWeight * pricing.standardRatePerKg) + distanceSurcharge;
  if (normalizedService === 'express') {
    baseRate *= pricing.expressMultiplier;
  } else if (normalizedService === 'same day' || normalizedService === 'sameday') {
    baseRate *= pricing.expressMultiplier * pricing.sameDayMultiplier;
  }
  const fuelSurcharge = (baseRate * pricing.fuelSurchargePct) / 100;
  const gst = (baseRate * pricing.gstPct) / 100;
  return {
    baseRate: roundToRupee(baseRate),
    fuelSurcharge: roundToRupee(fuelSurcharge),
    gst: roundToRupee(gst),
    totalCost: roundToRupee(baseRate + fuelSurcharge + gst),
    estimatedDeliveryDays: normalizedService === 'same day' || normalizedService === 'sameday'
      ? 1
      : (normalizedService === 'express' ? 2 : 4)
  };
};

export const shipmentService = {
  async getAllShipments(filters = {}) {
    if (!endpointAvailability.list) return [];
    try {
      const response = await withShipmentBaseFallback((client) => client.get('', {
        params: {
          status: filters.status,
          branchId: filters.branchId,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          page: filters.page,
          limit: filters.limit
        }
      }));
      const payload = response?.data;
      const list = Array.isArray(payload) ? payload : payload?.data || payload?.content || [];
      return list.map(mapShipment);
    } catch (error) {
      if (isUnavailableError(error)) {
        endpointAvailability.list = false;
        return [];
      }
      throw new Error(getErrorMessage(error, 'Failed to load all shipments'));
    }
  },

  async getShipments(userId) {
    if (!endpointAvailability.mine) return [];
    const requestedIdentifiers = asUniqueIdentityList(userId);
    const fallbackIdentifier = resolveUserIdentifier(null);
    const identityList = asUniqueIdentityList(
      requestedIdentifiers.length > 0 ? requestedIdentifiers : [fallbackIdentifier]
    );
    if (identityList.length === 0) return [];

    const allowedIdentitySet = new Set(identityList.map(toIdentityValue).filter(Boolean));
    let collected = [];
    let lastError = null;

    for (const identifier of identityList) {
      try {
        const response = await withShipmentBaseFallback((client) => client.get('/mine', {
          params: { userId: identifier }
        }));
        const payload = response?.data;
        const list = Array.isArray(payload) ? payload : payload?.data || [];
        collected = collected.concat(list.map(mapShipment));
      } catch (error) {
        lastError = error;
      }
    }

    if (collected.length > 0) {
      return dedupeShipments(collected).filter((item) => matchesIdentity(item, allowedIdentitySet));
    }

    if (!lastError) return [];

    if (isUnavailableError(lastError)) {
      endpointAvailability.mine = false;
      return [];
    }

    try {
      throw lastError;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load shipments'));
    }
  },

  async getShipmentByTracking(id) {
    try {
      const response = await withShipmentBaseFallback((client) => client.get(`/track/${encodeURIComponent(id)}`));
      return mapShipment(response?.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load shipment'));
    }
  },

  async getShipmentByIdentifier(id) {
    if (!id) throw new Error('Shipment identifier is required');
    try {
      return await this.getShipmentByTracking(id);
    } catch {
      try {
        const response = await withShipmentBaseFallback((client) => client.get(`/${encodeURIComponent(id)}`));
        return mapShipment(response?.data);
      } catch (error) {
        throw new Error(getErrorMessage(error, 'Failed to load shipment'));
      }
    }
  },

  async createShipment(payload, userId) {
    if (!endpointAvailability.create) {
      throw new Error('Shipment create endpoint is unavailable');
    }
    const identifier = resolveUserIdentifier(userId);
    const currentUser = authStorage.getCurrentUser() || {};
    const request = {
      customerId: identifier || undefined,
      serviceType: normalizeServiceType(payload.type || payload.service),
      paymentMethod: normalizePaymentMethod(payload.paymentMode),
      sender: {
        name: payload.sender?.name,
        phone: payload.sender?.phone,
        email: payload.sender?.email || currentUser.email || '',
        doorAddress: payload.sender?.doorAddress || payload.sender?.address,
        city: payload.sender?.city,
        state: payload.sender?.state,
        pincode: payload.sender?.pincode,
        address: composeAddress(
          payload.sender?.doorAddress || payload.sender?.address,
          payload.sender?.city,
          payload.sender?.state,
          payload.sender?.pincode
        )
      },
      recipient: {
        name: payload.receiver?.name,
        phone: payload.receiver?.phone,
        email: payload.receiver?.email || '',
        doorAddress: payload.receiver?.doorAddress || payload.receiver?.address,
        city: payload.receiver?.city,
        state: payload.receiver?.state,
        pincode: payload.receiver?.pincode,
        address: composeAddress(
          payload.receiver?.doorAddress || payload.receiver?.address,
          payload.receiver?.city,
          payload.receiver?.state,
          payload.receiver?.pincode
        )
      },
      packageDetails: {
        weight: Number(payload.weight || payload.package?.weight || 0),
        type: payload.package?.type || 'Standard',
        description: payload.package?.description || ''
      },
      quotedCost: (() => {
        const value = Number(payload.cost ?? payload.totalCost ?? payload.quote);
        return Number.isFinite(value) && value > 0 ? value : undefined;
      })()
    };

    try {
      const response = await withShipmentBaseFallback((client) => client.post('', request, {
        params: identifier ? { userId: identifier } : undefined
      }));
      return mapShipment(response?.data);
    } catch (error) {
      if (isUnavailableError(error)) {
        endpointAvailability.create = false;
      }
      throw new Error(getErrorMessage(error, 'Failed to create shipment'));
    }
  },

  async updateStatus(id, status, userId, metadata = {}) {
    if (!endpointAvailability.update) {
      throw new Error('Shipment update endpoint is unavailable');
    }
    const requestBody = {
      status: String(status || '').toUpperCase().replace(/ /g, '_')
    };
    if (metadata?.location) requestBody.location = metadata.location;
    if (metadata?.remarks) requestBody.remarks = metadata.remarks;
    if (metadata?.proofOfDeliveryImage) requestBody.proofOfDeliveryImage = metadata.proofOfDeliveryImage;
    if (metadata?.deliveredBy) requestBody.deliveredBy = metadata.deliveredBy;
    if (metadata?.deliveredByAgentId) requestBody.deliveredByAgentId = metadata.deliveredByAgentId;
    if (metadata?.paymentStatus) requestBody.paymentStatus = metadata.paymentStatus;
    if (metadata?.paymentCollectedAt) requestBody.paymentCollectedAt = metadata.paymentCollectedAt;

    try {
      const response = await withShipmentBaseFallback((client) => client.patch(`/${encodeURIComponent(id)}/status`, requestBody, {
        params: userId ? { userId } : undefined
      }));
      return mapShipment(response?.data);
    } catch (error) {
      if (isUnavailableError(error)) {
        endpointAvailability.update = false;
      }
      throw new Error(getErrorMessage(error, 'Failed to update shipment status'));
    }
  },

  async assignShipment(idOrTracking, agentId, runSheetId = null) {
    try {
      const response = await withShipmentBaseFallback((client) => client.patch(`/${encodeURIComponent(idOrTracking)}/assign`, {
        agentId,
        ...(runSheetId ? { runSheetId } : {})
      }));
      return mapShipment(response?.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to assign shipment'));
    }
  },

  async addShipmentRating(idOrTracking, rating, comment = '') {
    try {
      const response = await withShipmentBaseFallback((client) => client.post(`/${encodeURIComponent(idOrTracking)}/rating`, {
        rating: Number(rating),
        comment
      }));
      return mapShipment(response?.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to submit shipment rating'));
    }
  },

  async deleteShipment(id) {
    try {
      await withShipmentBaseFallback((client) => client.delete(`/${encodeURIComponent(id)}`));
      return true;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to delete shipment'));
    }
  },

  async calculateRate(request) {
    if (!endpointAvailability.rate) {
      return fallbackRate(request);
    }
    try {
      const response = await withShipmentBaseFallback((client) => client.post('/calculate-rate', {
        weight: Number(request.weight || 0),
        serviceType: normalizeServiceType(request.serviceType),
        originPincode: request.originPincode,
        destinationPincode: request.destinationPincode
      }));
      return response?.data;
    } catch (error) {
      if (isUnavailableError(error)) {
        endpointAvailability.rate = false;
        return fallbackRate(request);
      }
      throw new Error(getErrorMessage(error, 'Failed to calculate shipment rate'));
    }
  },

  async getPricingConfig() {
    if (!endpointAvailability.pricing) {
      return defaultPricingConfig();
    }
    try {
      const response = await withShipmentBaseFallback((client) => client.get('/pricing-config'));
      return {
        ...defaultPricingConfig(),
        ...(response?.data || {})
      };
    } catch (error) {
      if (isUnavailableError(error)) {
        endpointAvailability.pricing = false;
        return defaultPricingConfig();
      }
      throw new Error(getErrorMessage(error, 'Failed to load pricing configuration'));
    }
  },

  async updatePricingConfig(payload = {}) {
    if (!endpointAvailability.pricing) {
      return {
        ...defaultPricingConfig(),
        ...(payload || {}),
        sameDayMultiplier: 2
      };
    }
    try {
      const requestBody = {
        standardRatePerKg: Number(payload.standardRatePerKg),
        expressMultiplier: Number(payload.expressMultiplier),
        sameDayMultiplier: 2,
        distanceSurcharge: Number(payload.distanceSurcharge),
        fuelSurchargePct: Number(payload.fuelSurchargePct),
        gstPct: Number(payload.gstPct),
        codHandlingFee: Number(payload.codHandlingFee)
      };
      const response = await withShipmentBaseFallback((client) => client.put('/pricing-config', {
        ...requestBody
      }));
      return {
        ...defaultPricingConfig(),
        ...(response?.data || {}),
        sameDayMultiplier: 2
      };
    } catch (error) {
      if (isUnavailableError(error)) {
        endpointAvailability.pricing = false;
        return {
          ...defaultPricingConfig(),
          ...(payload || {}),
          sameDayMultiplier: 2
        };
      }
      throw new Error(getErrorMessage(error, 'Failed to save pricing configuration'));
    }
  }
};
