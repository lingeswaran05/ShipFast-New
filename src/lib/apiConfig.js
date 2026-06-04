const DEFAULT_API_BASE_URL = 'http://localhost:8088';

const stripTrailingSlash = (value = '') => String(value || '').replace(/\/+$/, '');
const toLower = (value = '') => String(value || '').trim().toLowerCase();
const isHttpLocal = (value = '') => {
  const normalized = toLower(value);
  return normalized.includes('localhost') || normalized.includes('127.0.0.1');
};
const FALLBACK_ENABLED = String(import.meta.env.VITE_ENABLE_OLD_BACKEND_FALLBACK ?? 'false').toLowerCase() === 'true';

export const API_BASE_URL = stripTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
);

export const resolveServiceBaseUrl = (envValue) => {
  const explicit = stripTrailingSlash(envValue || '');
  if (explicit) return explicit;
  return API_BASE_URL;
};

export const resolveServiceBaseUrls = (envValue, options = {}) => {
  const { localDirectBase = '', includeProxyFallback = true } = options;
  const primary = resolveServiceBaseUrl(envValue);
  const primaryClean = stripTrailingSlash(primary);
  const candidates = [];
  const localDirect = stripTrailingSlash(localDirectBase);

  // Always keep the explicit local service first for stable development behavior.
  if (localDirect) {
    candidates.push(localDirect);
  }

  // In default local multi-service mode we intentionally avoid jumping to a different base.
  if (primaryClean && primaryClean !== localDirect && (!localDirect || FALLBACK_ENABLED)) {
    candidates.push(primaryClean);
  }

  if (FALLBACK_ENABLED && includeProxyFallback && primaryClean && !isHttpLocal(primaryClean)) {
    candidates.push('');
  }

  return candidates.filter((value, index, list) => list.indexOf(value) === index);
};

export const toServiceBaseUrl = (baseUrl, apiPath) => {
  const cleanedPath = String(apiPath || '').startsWith('/') ? String(apiPath) : `/${String(apiPath || '')}`;
  const cleanedBase = stripTrailingSlash(baseUrl || '');
  if (!cleanedBase) return cleanedPath;
  return `${cleanedBase}${cleanedPath}`;
};

export const shouldRetryWithFallback = (error) => {
  if (!error?.response) return true;
  const status = Number(error?.response?.status || 0);
  // Retry fallback only for transient/server failures.
  return [408, 429, 500, 502, 503, 504].includes(status);
};
