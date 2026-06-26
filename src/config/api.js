const stripTrailingSlash = (value = '') => String(value || '').replace(/\/+$/, '');
export const DEFAULT_GATEWAY_URL = 'https://shipfast-gateway-7ake.onrender.com';
export const LOCAL_GATEWAY_URL = 'http://localhost:8088';

export const isLocalFrontend = () => {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
};

const resolveGatewayUrl = () => {
  if (isLocalFrontend()) {
    return stripTrailingSlash(import.meta.env.VITE_LOCAL_API_BASE_URL || '');
  }
  return stripTrailingSlash(import.meta.env.VITE_API_BASE_URL || DEFAULT_GATEWAY_URL);
};

export const API_GATEWAY_URL = resolveGatewayUrl();
export const API_ENDPOINTS = {
  AUTH: API_GATEWAY_URL,
  ADMIN: API_GATEWAY_URL,
  OPERATIONS: API_GATEWAY_URL,
  COMMUNICATIONS: API_GATEWAY_URL,
  REPORTING: API_GATEWAY_URL,
  SHIPMENT: API_GATEWAY_URL,
};

export const API_BASE_PATHS = {
  AUTH: '/api/auth',
  ROLES: '/api/v1/roles',
  SHIPMENT: '/api/v1/shipments',
  ADMIN: '/api/admin',
  OPERATIONS: '/api/operations',
  NOTIFICATIONS: '/api/notifications',
  SUPPORT: '/api/support',
  REPORTING: '/api/reports'
};

export const NORMALIZED_API_ENDPOINTS = Object.freeze(
  Object.entries(API_ENDPOINTS).reduce((accumulator, [key, value]) => {
    accumulator[key] = stripTrailingSlash(value);
    return accumulator;
  }, {})
);
