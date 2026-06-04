import axios from 'axios';
import { authStorage } from './authService';
import { resolveServiceBaseUrls, toServiceBaseUrl, shouldRetryWithFallback } from './apiConfig';

const ROLE_BASE_URLS = resolveServiceBaseUrls(import.meta.env.VITE_AUTH_BASE_URL, {
  localDirectBase: 'http://localhost:8088'
})
  .map((base) => toServiceBaseUrl(base, '/api/v1/roles'))
  .filter((value, index, list) => list.indexOf(value) === index);

const api = axios.create({
  baseURL: ROLE_BASE_URLS[0],
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

let activeRoleBaseIndex = 0;
const setActiveRoleBase = (index) => {
  activeRoleBaseIndex = index;
  api.defaults.baseURL = ROLE_BASE_URLS[index] || ROLE_BASE_URLS[0];
};

const withRoleFallback = async (requestFactory, options = {}) => {
  const { retryOnFailure = true } = options;
  let lastError;
  for (let offset = 0; offset < ROLE_BASE_URLS.length; offset += 1) {
    const index = (activeRoleBaseIndex + offset) % ROLE_BASE_URLS.length;
    setActiveRoleBase(index);
    try {
      return await requestFactory(api);
    } catch (error) {
      lastError = error;
      const shouldRetry = retryOnFailure && shouldRetryWithFallback(error) && offset < ROLE_BASE_URLS.length - 1;
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

/**
 * Service to handle all role-related API interactions.
 */
const getPayload = (response) => response?.data?.data ?? response?.data ?? response ?? null;

export const roleService = {
  /**
   * Submits a request for a role upgrade for the current user.
   * @param {string} requestedRole - The role being requested (e.g., 'agent').
   * @param {string} reason - The reason for the request.
   * @returns {Promise<object>} The created role request object from the backend.
   */
  requestRoleUpgrade: async (requestedRole, reason, payload = {}) => {
    const response = await withRoleFallback((client) => client.post('/requests', {
      requestedRole,
      reason,
      ...payload
    }));
    return getPayload(response);
  },

  /**
   * Fetches all pending role requests.
   * @returns {Promise<Array<object>>} A list of pending role request objects.
   */
  getPendingRequests: async () => {
    const response = await withRoleFallback((client) => client.get('/requests/pending'));
    return getPayload(response);
  },

  /**
   * Approves a role request.
   * This triggers a backend process that should update the user's role.
   * @param {string} requestId - The ID of the role request to approve.
   * @returns {Promise<object>} The updated role request object.
   */
  approveRequest: async (requestId) => {
    const response = await withRoleFallback((client) => client.post(`/requests/${requestId}/approve`));
    return getPayload(response);
  },

  /**
   * Rejects a role request.
   * @param {string} requestId - The ID of the role request to reject.
   * @returns {Promise<object>} The updated role request object.
   */
  rejectRequest: async (requestId) => {
    const response = await withRoleFallback((client) => client.post(`/requests/${requestId}/reject`));
    return getPayload(response);
  },

  cancelRequest: async (requestId) => {
    const response = await withRoleFallback((client) => client.delete(`/requests/${requestId}`));
    return getPayload(response);
  },
};
