import axios from 'axios';
import { API_BASE_PATHS, API_ENDPOINTS } from '../config/api';
import { authStorage } from './authService';
import { shipmentService } from './shipmentService';
import { resolveServiceBaseUrls, toServiceBaseUrl, shouldRetryWithFallback } from './apiConfig';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://shipfast-gateway.onrender.com',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json'
  }
});

const OPERATIONS_BASE_URLS = resolveServiceBaseUrls(import.meta.env.VITE_OPERATIONS_BASE_URL, {
  defaultBaseUrl: API_ENDPOINTS.OPERATIONS
})
  .map((base) => toServiceBaseUrl(base, API_BASE_PATHS.OPERATIONS))
  .filter((value, index, list) => list.indexOf(value) === index);

let activeOperationsBaseIndex = 0;
const setActiveOperationsBase = (index) => {
  activeOperationsBaseIndex = index;
  api.defaults.baseURL = OPERATIONS_BASE_URLS[index] || OPERATIONS_BASE_URLS[0];
};

const withOperationsFallback = async (requestFactory, options = {}) => {
  const { retryOnFailure = true } = options;
  let lastError;
  for (let offset = 0; offset < OPERATIONS_BASE_URLS.length; offset += 1) {
    const index = (activeOperationsBaseIndex + offset) % OPERATIONS_BASE_URLS.length;
    setActiveOperationsBase(index);
    try {
      return await requestFactory(api);
    } catch (error) {
      lastError = error;
      const shouldRetry = retryOnFailure && shouldRetryWithFallback(error) && offset < OPERATIONS_BASE_URLS.length - 1;
      if (!shouldRetry) throw error;
    }
  }
  throw lastError;
};

api.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback
);

const getPayload = (response) => response?.data?.data ?? response?.data ?? {};

export const operationsService = {
  async generateInvoice(invoiceRequest) {
    try {
      const response = await withOperationsFallback((client) => client.post('/invoice', invoiceRequest));
      return getPayload(response);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to generate invoice'));
    }
  },

  async createRunSheet(payload) {
    try {
      const response = await withOperationsFallback((client) => client.post('/runsheet', {
        agentId: payload.agentId,
        hubId: payload.hubId,
        shipmentTrackingNumbers: payload.shipmentTrackingNumbers || []
      }));
      const runSheetId = getPayload(response)?.runSheetId || null;
      const shipmentIds = payload.shipmentTrackingNumbers || [];
      if (shipmentIds.length > 0 && payload.agentId) {
        await Promise.allSettled(
          shipmentIds.map((shipmentId) => shipmentService.assignShipment(shipmentId, payload.agentId, runSheetId))
        );
      }
      return getPayload(response);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to create run sheet'));
    }
  },

  async getRunSheetsByAgent(agentId) {
    try {
      const response = await withOperationsFallback((client) => client.get(`/runsheet/${encodeURIComponent(agentId)}`));
      const payload = getPayload(response);
      return Array.isArray(payload) ? payload : payload.content || [];
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load run sheets'));
    }
  },

  async getCashCollections() {
    return [];
  },

  async getAgents() {
    try {
      const response = await withOperationsFallback((client) => client.get('/agents'));
      const payload = getPayload(response);
      return Array.isArray(payload) ? payload : payload.content || [];
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load agents'));
    }
  },

  async getAgentProfile(userId) {
    if (!userId) return null;
    try {
      const response = await withOperationsFallback((client) => client.get(`/agents/profile/${encodeURIComponent(userId)}`));
      return getPayload(response);
    } catch {
      return null;
    }
  },

  async upsertAgentProfile(userId, payload) {
    if (!userId) throw new Error('Agent user id is required');
    try {
      const response = await withOperationsFallback((client) => client.put(`/agents/profile/${encodeURIComponent(userId)}`, payload));
      return getPayload(response);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to save agent profile'));
    }
  },

  async verifyAgentProfile(userId, payload) {
    if (!userId) throw new Error('Agent user id is required');
    try {
      const response = await withOperationsFallback((client) => client.put(`/agents/profile/${encodeURIComponent(userId)}/verify`, payload));
      return getPayload(response);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to verify agent profile'));
    }
  },

  /**
   * Checks the real agent request status from the DB for the given userId.
   * Returns { status: "PENDING"|"VERIFIED"|"REJECTED"|"CANCELLED"|"NONE", hasPending: "true"|"false" }
   * Returns null if the backend is unreachable.
   */
  async getAgentRequestStatus(userId) {
    if (!userId) return null;
    try {
      const response = await withOperationsFallback((client) =>
        client.get(`/agents/profile/${encodeURIComponent(userId)}/request-status`)
      );
      return getPayload(response);
    } catch {
      return null;
    }
  },

  async deleteAgentProfile(userId) {
    if (!userId) throw new Error('Agent user id is required');
    try {
      const response = await withOperationsFallback((client) => client.delete(`/agents/profile/${encodeURIComponent(userId)}`));
      return getPayload(response);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to delete agent profile'));
    }
  }
};
