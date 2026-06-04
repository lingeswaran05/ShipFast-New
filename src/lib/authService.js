import axios from 'axios';
import { resolveServiceBaseUrls, shouldRetryWithFallback } from './apiConfig';

const toAuthBaseUrl = (base = '') => {
  const cleaned = String(base || '').replace(/\/+$/, '');
  if (!cleaned) return '/api/auth';
  return cleaned.endsWith('/api/auth') ? cleaned : `${cleaned}/api/auth`;
};

const AUTH_BASE_URLS = resolveServiceBaseUrls(import.meta.env.VITE_AUTH_BASE_URL, {
  localDirectBase: 'http://localhost:8088'
})
  .map(toAuthBaseUrl)
  .filter((value, index, list) => list.indexOf(value) === index);

let activeAuthBaseIndex = 0;
const setActiveAuthBase = (index) => {
  activeAuthBaseIndex = index;
  api.defaults.baseURL = AUTH_BASE_URLS[index] || AUTH_BASE_URLS[0];
};
const ACCESS_TOKEN_KEY = 'sf_access_token';
const REFRESH_TOKEN_KEY = 'sf_refresh_token';
const CURRENT_USER_KEY = 'currentUser';

const api = axios.create({
  baseURL: AUTH_BASE_URLS[0],
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

let refreshPromise = null;

const withAuthFallback = async (requestFactory, options = {}) => {
  const { retryOnFailure = true } = options;
  let lastError;
  for (let offset = 0; offset < AUTH_BASE_URLS.length; offset += 1) {
    const index = (activeAuthBaseIndex + offset) % AUTH_BASE_URLS.length;
    setActiveAuthBase(index);
    try {
      return await requestFactory(api);
    } catch (error) {
      lastError = error;
      const shouldRetry = retryOnFailure && shouldRetryWithFallback(error) && offset < AUTH_BASE_URLS.length - 1;
      if (!shouldRetry) throw error;
    }
  }
  throw lastError;
};

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getResponsePayload = (response) => response?.data?.data ?? response?.data ?? {};
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const normalizeRole = (role) => {
  const normalized = String(role || 'CUSTOMER').toLowerCase();
  if (['driver', 'manager', 'sorter'].includes(normalized)) return 'agent';
  return normalized;
};

const toBackendRole = (role) => {
  const normalized = String(role || '').toLowerCase();
  if (!normalized) return 'CUSTOMER';
  if (normalized === 'agent') return 'AGENT';
  if (normalized === 'customer') return 'CUSTOMER';
  if (normalized === 'admin') return 'ADMIN';
  if (normalized === 'driver') return 'DRIVER';
  if (normalized === 'manager') return 'MANAGER';
  return normalized.toUpperCase();
};

const mapProfileToCurrentUser = (profile = {}) => {
  return {
    id: profile.userId || profile.id || profile.userAuthId || profile.authId || profile.email,
    userId: profile.userId || profile.id || profile.userAuthId || profile.authId,
    name: profile.fullName || profile.name || '',
    fullName: profile.fullName || profile.name || '',
    email: profile.email || '',
    phone: profile.phoneNumber || profile.phone || '',
    phoneNumber: profile.phoneNumber || profile.phone || '',
    address: profile.address || '',
    city: profile.city || '',
    state: profile.state || '',
    pincode: profile.pincode || '',
    role: normalizeRole(profile.role),
    status: String(profile.status || 'active').toLowerCase(),
    profilePic: safeJsonParse(localStorage.getItem(CURRENT_USER_KEY))?.profilePic || null
  };
};

const getErrorMessage = (error, fallback = 'Something went wrong') => {
  const serverMessage =
    error?.response?.data?.message ||
    error?.response?.data?.msg ||
    error?.response?.data?.error;

  if (serverMessage) return serverMessage;

  if (error?.response?.status === 403) {
    return 'Access denied (403). Please verify your role permissions or login again.';
  }

  if (error?.response?.status === 401) {
    return 'Session expired. Please login again.';
  }

  if (error?.message === 'Network Error') {
    return 'Unable to reach auth server. Please check backend connectivity.';
  }

  return error?.message || fallback;
};

export const authStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  getCurrentUser: () => safeJsonParse(localStorage.getItem(CURRENT_USER_KEY)),
  setTokens: ({ accessToken, refreshToken }) => {
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  setCurrentUser: (user) => {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

const extractTokens = (payload = {}) => {
  const accessToken = payload.accessToken || payload.token || payload.jwt || null;
  const refreshToken = payload.refreshToken || null;
  return { accessToken, refreshToken };
};

const mapAnyUserToCurrentUser = (user = {}) => ({
  // Auth DB exposes login presence via isActive / is_active.
  // Mirror it into sessionStatus for admin run-sheet filtering.
  ...(() => {
    const activeFlag = user?.isActive ?? user?.is_active ?? user?.active;
    const isActive = typeof activeFlag === 'boolean'
      ? activeFlag
      : String(user?.status || '').toLowerCase() === 'active';
    return {
      isActive,
      sessionStatus: isActive ? 'online' : 'offline'
    };
  })(),
  id: user.userId || user.id || user.userAuthId || user.authId || user.email,
  userId: user.userId || user.id || user.userAuthId || user.authId,
  name: user.fullName || user.name || '',
  fullName: user.fullName || user.name || '',
  email: user.email || '',
  phone: user.phoneNumber || user.phone || '',
  phoneNumber: user.phoneNumber || user.phone || '',
  address: user.address || '',
  city: user.city || '',
  state: user.state || '',
  pincode: user.pincode || '',
  role: normalizeRole(user.role),
  status: String(user.status || 'active').toLowerCase()
});

const isRefreshRoute = (url = '') => url.includes('/refresh-token');

api.interceptors.request.use((config) => {
  const token = authStorage.getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    if (!originalRequest) throw error;

    const status = error?.response?.status;
    if (status !== 401 || originalRequest._retry || isRefreshRoute(originalRequest.url)) {
      throw error;
    }

    const refreshToken = authStorage.getRefreshToken();
    if (!refreshToken) {
      authStorage.clear();
      throw error;
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = axios
        .post(`${api.defaults.baseURL}/refresh-token`, { refreshToken })
        .then((response) => {
          const payload = getResponsePayload(response);
          const tokens = extractTokens(payload);
          if (!tokens.accessToken) throw new Error('Session expired. Please login again.');
          authStorage.setTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken || refreshToken });
          return tokens.accessToken;
        })
        .catch((refreshError) => {
          authStorage.clear();
          throw refreshError;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const nextAccessToken = await refreshPromise;
    originalRequest.headers = originalRequest.headers || {};
    originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
    return api(originalRequest);
  }
);

export const authService = {
  getAxiosInstance() {
    return api;
  },

  async login(email, password) {
    try {
      const response = await withAuthFallback((client) => client.post('/login', {
        email: normalizeEmail(email),
        password
      }));
      const payload = getResponsePayload(response);
      const tokens = extractTokens(payload);
      authStorage.setTokens(tokens);

      const profileRaw = payload.user || payload.profile || payload.userProfile || null;
      const user = profileRaw ? mapProfileToCurrentUser(profileRaw) : await this.getProfile();
      authStorage.setCurrentUser(user);
      return user;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Login failed'));
    }
  },

  async register(userData) {
    try {
      const response = await withAuthFallback((client) => client.post('/register', {
        name: userData.fullName || userData.name,
        fullName: userData.fullName || userData.name,
        email: normalizeEmail(userData.email),
        password: userData.password,
        phoneNumber: userData.phoneNumber,
        address: userData.address,
        city: userData.city,
        state: userData.state,
        pincode: userData.pincode,
        role: 'CUSTOMER'
      }));

      const payload = getResponsePayload(response);
      const tokens = extractTokens(payload);
      if (tokens.accessToken || tokens.refreshToken) {
        authStorage.setTokens(tokens);
      }

      const profileRaw = payload.user || payload.profile || payload.userProfile || payload || null;
      const fallbackUser = mapProfileToCurrentUser({
        ...profileRaw,
        fullName: profileRaw?.fullName || profileRaw?.name || userData.fullName || userData.name,
        name: profileRaw?.name || profileRaw?.fullName || userData.name || userData.fullName,
        email: profileRaw?.email || normalizeEmail(userData.email),
        role: profileRaw?.role || 'CUSTOMER'
      });

      const user = tokens.accessToken
        ? (profileRaw ? mapProfileToCurrentUser(profileRaw) : await this.getProfile())
        : fallbackUser;

      if (tokens.accessToken) {
        authStorage.setCurrentUser(user);
      }

      return { ...user, requiresLogin: !tokens.accessToken };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Registration failed'));
    }
  },

  async getProfile() {
    try {
      const response = await withAuthFallback((client) => client.get('/profile'));
      const payload = getResponsePayload(response);
      const user = mapProfileToCurrentUser(payload);
      authStorage.setCurrentUser(user);
      return user;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load profile'));
    }
  },

  async updateProfile(profileData) {
    try {
      const response = await withAuthFallback((client) => client.put('/profile', {
        fullName: profileData.fullName,
        phoneNumber: profileData.phoneNumber,
        address: profileData.address,
        city: profileData.city,
        state: profileData.state,
        pincode: profileData.pincode
      }));
      const payload = getResponsePayload(response);
      const current = authStorage.getCurrentUser() || {};
      const updated = {
        ...mapProfileToCurrentUser({ ...current, ...payload }),
        profilePic: current.profilePic || null
      };
      authStorage.setCurrentUser(updated);
      return updated;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Profile update failed'));
    }
  },

  async forgotPassword(email) {
    try {
      await withAuthFallback((client) => client.post('/forgot-password', { email: normalizeEmail(email) }));
      return true;
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new Error('Forgot password is not available on this server. Please use login/registration flow.');
      }
      throw new Error(getErrorMessage(error, 'Unable to send OTP'));
    }
  },

  async verifyOtp(email, otp) {
    try {
      await withAuthFallback((client) => client.post('/verify-otp', { email: normalizeEmail(email), otp }));
      return true;
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new Error('OTP verification endpoint is not available on this server.');
      }
      throw new Error(getErrorMessage(error, 'OTP verification failed'));
    }
  },

  async resetPassword(email, newPassword) {
    try {
      await withAuthFallback((client) => client.post('/reset-password', { email: normalizeEmail(email), newPassword }));
      return true;
    } catch (error) {
      if (error?.response?.status === 404) {
        throw new Error('Password reset endpoint is not available on this server.');
      }
      throw new Error(getErrorMessage(error, 'Password reset failed'));
    }
  },

  async changePassword(oldPassword, newPassword) {
    try {
      await withAuthFallback((client) => client.put('/change-password', { oldPassword, newPassword }));
      return true;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Password change failed'));
    }
  },

  async logout() {
    const refreshToken = authStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await withAuthFallback((client) => client.post('/logout', { refreshToken }));
      }
    } catch {
      // ignore network/logout errors and clear local session anyway
    } finally {
      authStorage.clear();
    }
  },

  async getAllUsers() {
    try {
      const response = await withAuthFallback((client) => client.get('/admin/users'));
      const payload = getResponsePayload(response);
      const list = Array.isArray(payload) ? payload : payload.users || payload.content || [];
      return list.map(mapAnyUserToCurrentUser);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load users from DB'));
    }
  },

  async updateUserRole(userIdOrEmail, role) {
    const identifier = encodeURIComponent(userIdOrEmail);
    try {
      const response = await withAuthFallback((client) => client.put(`/admin/users/${identifier}/role`, {
        role: toBackendRole(role)
      }));
      const payload = getResponsePayload(response);
      return payload && Object.keys(payload).length > 0
        ? mapAnyUserToCurrentUser(payload)
        : { userId: userIdOrEmail, role: normalizeRole(role) };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to update user role in DB'));
    }
  },

  async removeUserAccess(userIdOrEmail) {
    const identifier = encodeURIComponent(userIdOrEmail);
    try {
      await withAuthFallback((client) => client.delete(`/admin/users/${identifier}`));
      return true;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to remove user access in DB'));
    }
  }
};
