import axios from 'axios';
import { API_BASE_PATHS, API_ENDPOINTS } from '../config/api';
import { authStorage } from './authService';
import { resolveServiceBaseUrls, toServiceBaseUrl, shouldRetryWithFallback } from './apiConfig';

const REPORTING_BASE_URLS = resolveServiceBaseUrls(import.meta.env.VITE_REPORTING_BASE_URL, {
  defaultBaseUrl: API_ENDPOINTS.REPORTING
})
  .filter((value, index, list) => list.indexOf(value) === index);
const REPORTING_API_BASE_URLS = REPORTING_BASE_URLS.map((base) => toServiceBaseUrl(base, API_BASE_PATHS.REPORTING));
let activeReportingBaseIndex = 0;

const api = axios.create({
  baseURL: REPORTING_API_BASE_URLS[0],
  timeout: 60000
});

api.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const setReportingBase = (index) => {
  activeReportingBaseIndex = index;
  api.defaults.baseURL = REPORTING_API_BASE_URLS[index] || REPORTING_API_BASE_URLS[0];
};

const withReportingFallback = async (requestFactory, options = {}) => {
  const { retryOnFailure = true } = options;
  let lastError;
  for (let offset = 0; offset < REPORTING_API_BASE_URLS.length; offset += 1) {
    const index = (activeReportingBaseIndex + offset) % REPORTING_API_BASE_URLS.length;
    setReportingBase(index);
    try {
      return await requestFactory(api);
    } catch (error) {
      lastError = error;
      const shouldRetry = retryOnFailure && shouldRetryWithFallback(error) && offset < REPORTING_API_BASE_URLS.length - 1;
      if (!shouldRetry) throw error;
    }
  }
  throw lastError;
};

const getPayload = (response) => response?.data?.data ?? response?.data ?? {};

export const reportingService = {
  async getSummary() {
    const response = await withReportingFallback((client) => client.get('/summary'));
    return getPayload(response);
  },

  getShipmentCsvUrl() {
    const base = REPORTING_BASE_URLS[activeReportingBaseIndex] || REPORTING_BASE_URLS[0] || '';
    return toServiceBaseUrl(base, `${API_BASE_PATHS.REPORTING}/export/shipments.csv`);
  },

  async downloadShipmentCsv() {
    let response;
    for (let offset = 0; offset < REPORTING_BASE_URLS.length; offset += 1) {
      const index = (activeReportingBaseIndex + offset) % REPORTING_BASE_URLS.length;
      activeReportingBaseIndex = index;
      const url = this.getShipmentCsvUrl();
      try {
        response = await axios.get(url, {
          responseType: 'blob',
          timeout: 60000,
          headers: (() => {
            const token = authStorage.getAccessToken();
            return token ? { Authorization: `Bearer ${token}` } : {};
          })()
        });
        break;
      } catch (error) {
        const shouldRetry = shouldRetryWithFallback(error) && offset < REPORTING_BASE_URLS.length - 1;
        if (!shouldRetry) throw error;
      }
    }
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `shipments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
