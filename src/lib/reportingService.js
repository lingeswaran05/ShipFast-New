import axios from 'axios';
import { resolveServiceBaseUrls, toServiceBaseUrl, shouldRetryWithFallback } from './apiConfig';

const REPORTING_BASE_URLS = resolveServiceBaseUrls(import.meta.env.VITE_REPORTING_BASE_URL, {
  localDirectBase: 'http://localhost:8088'
})
  .filter((value, index, list) => list.indexOf(value) === index);
const REPORTING_API_BASE_URLS = REPORTING_BASE_URLS.map((base) => toServiceBaseUrl(base, '/api/reports'));
let activeReportingBaseIndex = 0;

const api = axios.create({
  baseURL: REPORTING_API_BASE_URLS[0],
  timeout: 15000
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
    return toServiceBaseUrl(base, '/api/reports/export/shipments.csv');
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
          timeout: 20000
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
