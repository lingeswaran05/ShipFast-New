import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockService } from '../mock/mockService';
import { authService, authStorage } from '../lib/authService';
import { adminService } from '../lib/adminService';
import { communicationService } from '../lib/communicationService';
import { shipmentService } from '../lib/shipmentService';
import { reportingService } from '../lib/reportingService';
import { operationsService } from '../lib/operationsService';
import { roleService } from '../lib/roleService';

const ShipmentContext = createContext();
const ROLE_REQUESTS_KEY = 'sf_role_requests';
const ACTIVE_ROLE_KEY = 'sf_active_role';
const ROLE_OVERRIDES_KEY = 'sf_role_overrides';
const USERS_DIRECTORY_KEY = 'sf_users_directory';
const PRICING_CONFIG_KEY = 'sf_pricing_config';
const DISMISSED_NOTIFICATIONS_KEY = 'sf_dismissed_notifications';
const MAX_ROLE_REQUESTS = 200;
const AGENT_ONBOARDING_KEY_PREFIX = 'sf_agent_onboarding_';
const LEGACY_AGENT_ONBOARDING_KEY_PREFIX = 'agent_onboarding_';
const DEFAULT_PRICING_CONFIG = {
  profitPercentage: 20,
  standardRatePerKg: 80,
  expressMultiplier: 1.75,
  sameDayMultiplier: 2,
  distanceSurcharge: 40,
  fuelSurchargePct: 9,
  gstPct: 5,
  codHandlingFee: 50
};

const parseStored = (key, fallback = []) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const normalizeRole = (value) => {
  const normalized = String(value || 'customer').toLowerCase();
  if (['driver', 'manager', 'sorter'].includes(normalized)) return 'agent';
  return normalized;
};

const toIdentityValue = (value) => String(value || '').trim().toLowerCase();
const normalizeRoleRequestStatus = (value) => String(value || 'PENDING').toUpperCase();
const isPendingRoleRequestStatus = (value) => ['PENDING', 'PENDING_VERIFICATION'].includes(normalizeRoleRequestStatus(value));
const getRoleRequestIdentityValues = (request = {}) => (
  [request?.userId, request?.email, request?.id]
    .map(toIdentityValue)
    .filter(Boolean)
);
const roleRequestMatchesAnyIdentity = (request = {}, identities = []) => {
  const requestIdentities = getRoleRequestIdentityValues(request);
  return requestIdentities.some((identity) => identities.includes(identity));
};
const getStableUserIdentityValues = (user = {}) => (
  [user?.userId, user?.id]
    .map(toIdentityValue)
    .filter(Boolean)
);
const getUserEmailIdentityValue = (user = {}) => toIdentityValue(user?.email);
const roleRequestBelongsToUser = (request = {}, user = {}) => {
  const stableUserIdentities = getStableUserIdentityValues(user);
  const requestUserIdentity = toIdentityValue(request?.userId);
  const requestEmailIdentity = toIdentityValue(request?.email);
  const userEmailIdentity = getUserEmailIdentityValue(user);

  if (stableUserIdentities.length > 0) {
    if (requestUserIdentity) {
      const stableMatch = stableUserIdentities.includes(requestUserIdentity);
      if (!stableMatch) return false;
      if (requestEmailIdentity && userEmailIdentity) {
        return requestEmailIdentity === userEmailIdentity;
      }
      return true;
    }
    return Boolean(userEmailIdentity) && requestEmailIdentity === userEmailIdentity;
  }

  return Boolean(userEmailIdentity) && requestEmailIdentity === userEmailIdentity;
};
const getUserIdentityValues = (user = {}) => (
  [...new Set([
    ...getStableUserIdentityValues(user),
    getUserEmailIdentityValue(user)
  ].filter(Boolean))]
);
const agentProfileBelongsToUser = (profile = {}, user = {}, requestedIdentity = '') => {
  const expectedIdentities = [...new Set([
    ...getUserIdentityValues(user),
    toIdentityValue(requestedIdentity)
  ].filter(Boolean))];
  if (expectedIdentities.length === 0) return false;

  const profileIdentities = [profile?.userId, profile?.email, profile?.id]
    .map(toIdentityValue)
    .filter(Boolean);
  if (profileIdentities.length === 0) return false;

  return profileIdentities.some((identity) => expectedIdentities.includes(identity));
};
const getRoleRequestEventTime = (record = {}) => (
  new Date(record?.reviewedAt || record?.verifiedAt || record?.updatedAt || record?.createdAt || record?.joinDate || 0).getTime()
);
const buildIdentityCandidates = (...values) => (
  [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))]
);
const toStorageSafeDocValue = (value) => {
  const text = String(value || '').trim();
  if (!text) return null;
  // Avoid persisting large inline base64 data in role-request index storage.
  if (text.startsWith('data:')) return null;
  return text;
};
const getShipmentOwnerIdentifiers = (user = {}) => {
  const stableIds = buildIdentityCandidates(user?.userId, user?.id);
  if (stableIds.length > 0) return stableIds;
  return buildIdentityCandidates(user?.email);
};
const filterCustomerShipments = (shipments = [], user = {}) => {
  const allowedStableIds = new Set(getShipmentOwnerIdentifiers(user).map((value) => String(value || '').trim().toLowerCase()).filter(Boolean));
  const fallbackEmail = String(user?.email || '').trim().toLowerCase();

  const filteredShipments = (shipments || []).filter((shipment) => {
    const customerIdIdentity = String(shipment?.customerId || shipment?.userId || shipment?.ownerId || '').trim().toLowerCase();
    if (allowedStableIds.size > 0) {
      return customerIdIdentity ? allowedStableIds.has(customerIdIdentity) : false;
    }

    const emailIdentity = String(shipment?.customerEmail || shipment?.email || '').trim().toLowerCase();
    return Boolean(fallbackEmail) && emailIdentity === fallbackEmail;
  });
  console.log('filterCustomerShipments', {
    user,
    allowedStableIds: [...allowedStableIds],
    fallbackEmail,
    inputCount: (shipments || []).length,
    outputCount: filteredShipments.length,
    shipments,
    filteredShipments
  });
  return filteredShipments;
};

const isQuotaExceededError = (error) => (
  error?.name === 'QuotaExceededError' ||
  error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
  error?.code === 22 ||
  error?.code === 1014
);

const safeSetLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.warn(`Storage quota exceeded while saving ${key}`);
    } else {
      console.warn(`Failed to save ${key} in localStorage`, error);
    }
    return false;
  }
};

const normalizePricingConfig = (next = {}, fallback = DEFAULT_PRICING_CONFIG) => {
  const source = { ...fallback, ...(next || {}) };
  const toNumber = (value, defaultValue) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : defaultValue;
  };
  const normalizeNonNegative = (value, defaultValue) => Math.max(0, toNumber(value, defaultValue));
  const normalizePositive = (value, defaultValue) => {
    const numeric = toNumber(value, defaultValue);
    return numeric > 0 ? numeric : defaultValue;
  };

  return {
    profitPercentage: Math.min(100, normalizeNonNegative(source.profitPercentage, fallback.profitPercentage)),
    standardRatePerKg: normalizePositive(source.standardRatePerKg, fallback.standardRatePerKg),
    expressMultiplier: normalizePositive(source.expressMultiplier, fallback.expressMultiplier),
    sameDayMultiplier: 2,
    distanceSurcharge: normalizeNonNegative(source.distanceSurcharge, fallback.distanceSurcharge),
    fuelSurchargePct: normalizeNonNegative(source.fuelSurchargePct, fallback.fuelSurchargePct),
    gstPct: normalizeNonNegative(source.gstPct, fallback.gstPct),
    codHandlingFee: normalizeNonNegative(source.codHandlingFee, fallback.codHandlingFee)
  };
};

const readRoleRequestDocuments = (request = {}) => ({
  profilePhoto: request?.documents?.profilePhoto || request?.agentDetails?.profilePhoto || null,
  aadharCopy: request?.documents?.aadharCopy || null,
  licenseCopy: request?.documents?.licenseCopy || null,
  rcBookCopy: request?.documents?.rcBookCopy || null
});

const hasAgentProfileRequestSignal = (profile = {}) => {
  if (!profile) return false;
  const hasDocs = Boolean(
    profile?.profileImage ||
    profile?.aadharCopy ||
    profile?.licenseCopy ||
    profile?.rcBookCopy
  );
  const hasDetails = Boolean(
    profile?.licenseNumber ||
    profile?.aadharNumber ||
    profile?.vehicleNumber ||
    profile?.rcBookNumber
  );
  const hasNotes = Boolean(String(profile?.verificationNotes || '').trim());
  return hasDocs || hasDetails || hasNotes;
};

const prepareRoleRequestsForStorage = (requests = []) => (
  Array.isArray(requests)
    ? requests.slice(0, MAX_ROLE_REQUESTS).map((request = {}) => {
      const docs = readRoleRequestDocuments(request);
      const documentFlags = {
        profilePhoto: Boolean(docs.profilePhoto),
        aadharCopy: Boolean(docs.aadharCopy),
        licenseCopy: Boolean(docs.licenseCopy),
        rcBookCopy: Boolean(docs.rcBookCopy)
      };
      return {
        ...request,
        currentRole: normalizeRole(request?.currentRole || 'customer'),
        requestedRole: normalizeRole(request?.requestedRole || 'agent'),
        agentDetails: {
          ...(request?.agentDetails || {}),
          profilePhoto: null
        },
        documents: {
          profilePhoto: toStorageSafeDocValue(docs.profilePhoto),
          aadharCopy: toStorageSafeDocValue(docs.aadharCopy),
          licenseCopy: toStorageSafeDocValue(docs.licenseCopy),
          rcBookCopy: toStorageSafeDocValue(docs.rcBookCopy)
        },
        documentFlags
      };
    })
    : []
);

const clearLegacyOnboardingCopies = () => {
  try {
    const keysToRemove = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(LEGACY_AGENT_ONBOARDING_KEY_PREFIX)) continue;
      const identity = key.slice(LEGACY_AGENT_ONBOARDING_KEY_PREFIX.length);
      const primaryKey = `${AGENT_ONBOARDING_KEY_PREFIX}${identity}`;
      if (localStorage.getItem(primaryKey)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // non-blocking cleanup
      }
    });
  } catch {
    // non-blocking cleanup
  }
};

const isProtectedAdmin = (user) => normalizeRole(user?.role) === 'admin';

export function useShipment() {
  return useContext(ShipmentContext);
}

export function ShipmentProvider({ children }) {
  const [shipments, setShipments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(parseStored(USERS_DIRECTORY_KEY, []));
  const [branches, setBranches] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [staff, setStaff] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState(
    parseStored(DISMISSED_NOTIFICATIONS_KEY, []).map((value) => String(value).trim()).filter(Boolean)
  );
  const [reportSummary, setReportSummary] = useState(null);
  const [lastDataSyncAt, setLastDataSyncAt] = useState(null);
  const [roleRequests, setRoleRequests] = useState(() => {
    const stored = parseStored(ROLE_REQUESTS_KEY, []);
    return Array.isArray(stored) ? stored.slice(0, MAX_ROLE_REQUESTS) : [];
  });
  const [roleOverrides, setRoleOverrides] = useState(parseStored(ROLE_OVERRIDES_KEY, []));
  const [activeRole, setActiveRole] = useState(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_ROLE_KEY);
      if (!stored) return null;
      try {
        return normalizeRole(JSON.parse(stored));
      } catch {
        return normalizeRole(stored);
      }
    } catch {
      return null;
    }
  });
  const [pricingConfig, setPricingConfig] = useState(
    normalizePricingConfig(parseStored(PRICING_CONFIG_KEY, DEFAULT_PRICING_CONFIG), DEFAULT_PRICING_CONFIG)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const normalizeNotification = (notification = {}) => {
    const id = String(notification?.id ?? `${Date.now()}-${Math.random()}`).trim();
    const createdAt = notification?.createdAt || new Date().toISOString();
    const role = String(notification?.role || 'all').toLowerCase();
    return {
      ...notification,
      id,
      role,
      createdAt,
      timestamp: notification?.timestamp || new Date(createdAt).toLocaleString()
    };
  };

  const mergeNotifications = (...collections) => {
    const seen = new Set();
    const merged = [];
    collections.flat().forEach((item) => {
      if (!item) return;
      const normalized = normalizeNotification(item);
      const dedupeKey = normalized.id || `${normalized.message}|${normalized.timestamp}|${normalized.role}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      merged.push(normalized);
    });
    return merged
      .sort((a, b) => new Date(b.createdAt || b.timestamp || 0).getTime() - new Date(a.createdAt || a.timestamp || 0).getTime())
      .slice(0, 200);
  };

  const persistRoleRequestDocuments = (request = {}, fallbackIdentifiers = []) => {
    const docs = readRoleRequestDocuments(request);
    const hasAnyDoc = Object.values(docs).some(Boolean);
    if (!hasAnyDoc) return;

    const identities = [
      request?.userId,
      request?.email,
      ...fallbackIdentifiers
    ].map((value) => String(value || '').trim()).filter(Boolean);
    const unique = [...new Set(identities)];
    unique.forEach((identity) => {
      const primaryKey = `${AGENT_ONBOARDING_KEY_PREFIX}${identity}`;
      const legacyKey = `${LEGACY_AGENT_ONBOARDING_KEY_PREFIX}${identity}`;
      const payload = JSON.stringify(docs);
      const saved = safeSetLocalStorage(primaryKey, payload);
      if (saved) {
        try {
          localStorage.removeItem(legacyKey);
        } catch {
          // non-blocking cleanup
        }
      } else {
        safeSetLocalStorage(legacyKey, payload);
      }
    });
  };

  useEffect(() => {
    safeSetLocalStorage(USERS_DIRECTORY_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    safeSetLocalStorage(ROLE_REQUESTS_KEY, JSON.stringify(prepareRoleRequestsForStorage(roleRequests)));
  }, [roleRequests]);

  useEffect(() => {
    safeSetLocalStorage(ROLE_OVERRIDES_KEY, JSON.stringify(roleOverrides));
  }, [roleOverrides]);

  useEffect(() => {
    const handleStorageSync = (event) => {
      if (event.key === ROLE_REQUESTS_KEY) {
        const latest = parseStored(ROLE_REQUESTS_KEY, []);
        setRoleRequests(Array.isArray(latest) ? latest.slice(0, MAX_ROLE_REQUESTS) : []);
        return;
      }
      if (event.key === ROLE_OVERRIDES_KEY) {
        const latest = parseStored(ROLE_OVERRIDES_KEY, []);
        setRoleOverrides(Array.isArray(latest) ? latest : []);
      }
    };

    window.addEventListener('storage', handleStorageSync);
    return () => {
      window.removeEventListener('storage', handleStorageSync);
    };
  }, []);

  useEffect(() => {
    if (!activeRole) return;
    safeSetLocalStorage(ACTIVE_ROLE_KEY, String(activeRole));
  }, [activeRole]);

  useEffect(() => {
    safeSetLocalStorage(PRICING_CONFIG_KEY, JSON.stringify(pricingConfig));
  }, [pricingConfig]);

  useEffect(() => {
    safeSetLocalStorage(DISMISSED_NOTIFICATIONS_KEY, JSON.stringify(dismissedNotificationIds));
  }, [dismissedNotificationIds]);

  useEffect(() => {
    clearLegacyOnboardingCopies();
  }, []);

  useEffect(() => {
    if (!currentUser?.role) return;
    const normalized = normalizeRole(currentUser.role);
    if (normalized === 'agent') {
      setActiveRole((prev) => (prev === 'customer' || prev === 'agent' ? prev : 'agent'));
      return;
    }
    setActiveRole(normalized);
  }, [currentUser?.role]);

  const switchActiveRole = (nextRole) => {
    if (!currentUser?.role) return;
    const normalized = normalizeRole(nextRole);
    if (normalizeRole(currentUser.role) !== 'agent') {
      setActiveRole(normalizeRole(currentUser.role));
      return;
    }
    if (!['agent', 'customer'].includes(normalized)) return;
    setActiveRole(normalized);
  };

  const clearStaleSessionRoleArtifacts = (user) => {
    if (!user) return;

    const stableIdentitySet = new Set(getStableUserIdentityValues(user));
    const emailIdentity = getUserEmailIdentityValue(user);

    // Remove stale role requests for the same email that belong to a different account id.
    if (emailIdentity) {
      setRoleRequests((prev) => (
        (prev || []).filter((request) => {
          const requestEmailIdentity = toIdentityValue(request?.email);
          if (requestEmailIdentity !== emailIdentity) return true;
          if (stableIdentitySet.size === 0) return false;
          const requestUserIdentity = toIdentityValue(request?.userId);
          if (!requestUserIdentity) return false;
          return stableIdentitySet.has(requestUserIdentity);
        })
      ));

      setRoleOverrides((prev) => (
        (prev || []).filter((override) => {
          const overrideEmailIdentity = toIdentityValue(override?.email);
          if (overrideEmailIdentity !== emailIdentity) return true;
          if (stableIdentitySet.size === 0) return false;
          const overrideUserIdentity = toIdentityValue(override?.userId || override?.id);
          return Boolean(overrideUserIdentity) && stableIdentitySet.has(overrideUserIdentity);
        })
      ));
    }

    // Email-keyed onboarding payload can belong to an old deleted account.
    const staleOnboardingKeys = buildIdentityCandidates(
      user?.email,
      String(user?.email || '').toLowerCase()
    ).flatMap((identity) => [
      `${AGENT_ONBOARDING_KEY_PREFIX}${identity}`,
      `${LEGACY_AGENT_ONBOARDING_KEY_PREFIX}${identity}`
    ]);
    staleOnboardingKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // non-blocking cleanup
      }
    });
  };

  const syncUserDirectory = (user) => {
    if (!user?.email) return;
    setUsers(prev => {
      const existingIndex = prev.findIndex(u => u.email === user.email);
      const mergedUser = {
        id: user.id || user.userId || user.email,
        userId: user.userId || user.id,
        name: user.name || user.fullName || '',
        email: user.email,
        phone: user.phone || user.phoneNumber || '',
        role: normalizeRole(user.role),
        status: user.status || 'active',
        updatedAt: new Date().toISOString()
      };

      if (existingIndex === -1) return [...prev, mergedUser];
      const next = [...prev];
      next[existingIndex] = { ...next[existingIndex], ...mergedUser };
      return next;
    });
  };

  const getUserOverride = (user) => {
    if (!user) return null;
    const stableUserIdentities = getStableUserIdentityValues(user);
    const userEmailIdentity = getUserEmailIdentityValue(user);

    // If the authenticated profile has a stable user id, never match overrides
    // only by email. This prevents old-account local overrides from leaking
    // into a newly re-created account with the same email.
    if (stableUserIdentities.length > 0) {
      return roleOverrides.find((override) => {
        const overrideStableIdentities = [override?.userId, override?.id]
          .map(toIdentityValue)
          .filter(Boolean);
        return overrideStableIdentities.some((identity) => stableUserIdentities.includes(identity));
      }) || null;
    }

    if (!userEmailIdentity) return null;
    return roleOverrides.find((override) => (
      toIdentityValue(override?.email) === userEmailIdentity
    )) || null;
  };

  const applyRoleOverride = (user) => {
    const override = getUserOverride(user);
    if (!override) return user;
    return {
      ...user,
      role: normalizeRole(override.role),
      blocked: Boolean(override.blocked),
      agentType: override.agentType || user.agentType || null
    };
  };

  const loadUsersFromDb = async () => {
    try {
      const dbUsers = await authService.getAllUsers();
      const nextUsers = (dbUsers || []).map((user) => applyRoleOverride(user));
      setUsers(nextUsers);
      return nextUsers;
    } catch (error) {
      console.error('Failed to fetch users from DB', error);
      return users;
    }
  };

  const loadAdminOperationalData = async () => {
    try {
      const [branchesData, vehiclesData] = await Promise.all([
        adminService.getBranches(),
        adminService.getVehicles()
      ]);
      setBranches(branchesData);
      setVehicles(vehiclesData);
      return { branchesData, vehiclesData };
    } catch (error) {
      console.error('Failed to fetch admin operational data from backend', error);
      const [branchesData, fleetData] = await Promise.all([
        mockService.getBranches(),
        mockService.getFleet()
      ]);
      setBranches(branchesData);
      setVehicles(fleetData);
      return { branchesData, vehiclesData: fleetData };
    }
  };

  const refreshShipments = async () => {
    if (!currentUser) return [];
    let userShipments = [];
    let didLoadSuccessfully = false;
    try {
      setIsRefreshing(true);
      const role = normalizeRole(currentUser.role);
      console.log('refreshShipments start', { currentUser, role });
      if (role === 'admin' || role === 'agent') {
        userShipments = await shipmentService.getAllShipments();
      } else {
        const ownerIdentifiers = getShipmentOwnerIdentifiers(currentUser);
        console.log('refreshShipments ownerIdentifiers', ownerIdentifiers);
        userShipments = ownerIdentifiers.length > 0 ? await shipmentService.getShipments(ownerIdentifiers) : [];
      }
      console.log('refreshShipments result', userShipments);
      didLoadSuccessfully = true;
    } catch (error) {
      console.warn('Failed to load shipments from backend, preserving last known shipment state', error);
      return shipments;
    } finally {
      setIsRefreshing(false);
    }
    if (didLoadSuccessfully) {
      setShipments(userShipments || []);
      setLastDataSyncAt(new Date().toISOString());
    }
    return userShipments;
  };

  const refreshPricingConfig = async () => {
    try {
      const backendConfig = await shipmentService.getPricingConfig();
      const merged = normalizePricingConfig(
        { ...pricingConfig, ...backendConfig, sameDayMultiplier: 2 },
        DEFAULT_PRICING_CONFIG
      );
      setPricingConfig(merged);
      return merged;
    } catch (error) {
      console.warn('Failed to load pricing config from backend, using local/default config', error);
      const fallback = normalizePricingConfig(pricingConfig, DEFAULT_PRICING_CONFIG);
      setPricingConfig(fallback);
      return fallback;
    }
  };

  const refreshOperationalData = async () => {
    setIsRefreshing(true);
    try {
      if (currentUser?.role === 'admin') {
        await loadAdminOperationalData();
        await loadUsersFromDb();
        try {
          const summary = await reportingService.getSummary();
          setReportSummary(summary);
        } catch {
          // non-blocking
        }
      }
      await refreshShipments();
      await refreshPricingConfig();
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshUserNotifications = async (userId = null) => {
    const effectiveUserId = userId || currentUser?.userId || currentUser?.id;
    if (!effectiveUserId) return [];
    try {
      const latestNotifications = await communicationService.getUserNotifications(effectiveUserId);
      const dismissed = new Set(dismissedNotificationIds.map((value) => String(value).trim()));
      const filteredLatest = (latestNotifications || []).filter((item) => !dismissed.has(String(item?.id || '').trim()));
      setNotifications((prev) => mergeNotifications(filteredLatest, prev));

      return filteredLatest;
    } catch (error) {
      console.error('Failed to fetch notifications from backend', error);
      return notifications;
    }
  };

  // Initial Data Fetch & Auth Persistence
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const hasAccessToken = Boolean(authStorage.getAccessToken());
        if (hasAccessToken) {
            try {
              const baseUser = await authService.getProfile();
              clearStaleSessionRoleArtifacts(baseUser);
              const user = applyRoleOverride(baseUser);

              if (user.blocked) {
                await authService.logout();
                setCurrentUser(null);
                setShipments([]);
              } else {
                setCurrentUser(user);
                syncUserDirectory(user);
              let userShipments = [];
              try {
                  const role = normalizeRole(user.role);
                  if (role === 'admin' || role === 'agent') {
                    userShipments = await shipmentService.getAllShipments();
                  } else {
                    const ownerIdentifiers = getShipmentOwnerIdentifiers(user);
                    userShipments = ownerIdentifiers.length > 0 ? await shipmentService.getShipments(ownerIdentifiers) : [];
                  }
              } catch {
                  userShipments = [];
              }
                setShipments(userShipments);
                if (user.role === 'admin') {
                  await loadUsersFromDb();
                  await loadAdminOperationalData();
                }
              }
            } catch {
              await authService.logout();
              setCurrentUser(null);
              setShipments([]);
            }
        } else {
            const localUser = authStorage.getCurrentUser();
            if (localUser) {
              clearStaleSessionRoleArtifacts(localUser);
              const user = applyRoleOverride(localUser);
              if (!user.blocked) {
                setCurrentUser(user);
                syncUserDirectory(user);
              }
            }
        }

        const isAdminSession = (authStorage.getCurrentUser()?.role || '').toLowerCase() === 'admin';
        if (isAdminSession) {
          await loadAdminOperationalData();
        } else {
          const [branchesData, fleetData] = await Promise.all([
            mockService.getBranches(),
            mockService.getFleet()
          ]);
          setBranches(branchesData);
          setVehicles(fleetData);
        }

        const staffData = await mockService.getStaff();
        setStaff(staffData);
        await refreshPricingConfig();
        setLastDataSyncAt(new Date().toISOString());
      } catch (error) {
        console.error("Failed to load initial data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const login = async (email, password) => {
    try {
      const baseUser = await authService.login(email, password);
      clearStaleSessionRoleArtifacts(baseUser);
      const user = applyRoleOverride(baseUser);

      if (user.blocked) {
        await authService.logout();
        throw new Error('Access removed by admin. Please contact support.');
      }

      setCurrentUser(user);
      authStorage.setCurrentUser(user);
      syncUserDirectory(user);

      if (user.role === 'admin') {
        await loadUsersFromDb();
        await loadAdminOperationalData();
      }

      let userShipments = [];
      try {
        const role = normalizeRole(user.role);
        if (role === 'admin' || role === 'agent') {
          userShipments = await shipmentService.getAllShipments();
        } else {
          const ownerIdentifiers = getShipmentOwnerIdentifiers(user);
          userShipments = ownerIdentifiers.length > 0 ? await shipmentService.getShipments(ownerIdentifiers) : [];
        }
      } catch {
        userShipments = [];
      }
      setShipments(userShipments);
      await refreshPricingConfig();
      setLastDataSyncAt(new Date().toISOString());

      await refreshUserNotifications(user.userId || user.id);

      addNotification(`Welcome back, ${user.name}!`, user.role);
      return user;
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const register = async (userData) => {
      try {
          const baseUser = await authService.register({
            fullName: userData.name,
            email: userData.email,
            password: userData.password,
            phoneNumber: userData.phone,
            address: userData.address,
            city: userData.city,
            state: userData.state,
            pincode: userData.pincode
          });

          clearStaleSessionRoleArtifacts(baseUser);
          const user = applyRoleOverride(baseUser);
          syncUserDirectory(user);
          // Registration should always redirect to login and start a fresh session.
          await authService.logout();
          setCurrentUser(null);
          setShipments([]);
          addNotification('Registration successful. Please login to continue.', 'customer');
          return { ...user, requiresLogin: true };
      } catch (error) {
          console.error("Registration failed", error);
          throw error;
      }
  };

  const logout = async () => {
      await authService.logout();
      setCurrentUser(null);
      setShipments([]);
      setNotifications([]);
      setActiveRole(null);
      try {
        localStorage.removeItem(ACTIVE_ROLE_KEY);
        // Clear local notifications so next login starts fresh
        localStorage.removeItem('sf_local_notifications');
        localStorage.removeItem(DISMISSED_NOTIFICATIONS_KEY);
        setDismissedNotificationIds([]);
      } catch {
        // non-blocking cleanup
      }
  };

  const forgotPassword = async (email) => {
      return authService.forgotPassword(email);
  };

  const verifyOtp = async (email, otp) => {
      return authService.verifyOtp(email, otp);
  };

  const resetPassword = async (email, newPassword) => {
      return authService.resetPassword(email, newPassword);
  };

  const addShipment = async (shipmentData) => {
      try {
        let newShipment;
        try {
          newShipment = await shipmentService.createShipment(shipmentData, currentUser?.userId || currentUser?.id || currentUser?.email);
        } catch {
          newShipment = await mockService.createShipment(shipmentData);
        }
        setShipments(prev => [newShipment, ...prev]);
        return newShipment;
      } catch (error) {
          console.error("Create shipment failed", error);
          throw error;
      }
  };

  const updateShipmentStatus = async (id, status, metadata = {}) => {
      try {
          const normalizedMeta = typeof metadata === 'string' ? { remarks: metadata } : (metadata || {});
          const idValue = String(id || '').trim();
          const targetShipment = shipments.find((shipment) => (
            [shipment.shipmentId, shipment.id, shipment.trackingId, shipment.trackingNumber]
              .filter(Boolean)
              .map((value) => String(value))
              .includes(idValue)
          ));
          const mutationId = targetShipment?.shipmentId || idValue;
          let updatedShipment;
          updatedShipment = await shipmentService.updateStatus(
            mutationId,
            status,
            currentUser?.userId || currentUser?.id || currentUser?.email,
            normalizedMeta
          );
          const mergedShipment = {
            ...(updatedShipment || {}),
            ...(normalizedMeta.paymentStatus ? { paymentStatus: normalizedMeta.paymentStatus } : {}),
            ...(normalizedMeta.paymentCollectedAt ? { paymentCollectedAt: normalizedMeta.paymentCollectedAt } : {}),
            ...(Object.prototype.hasOwnProperty.call(normalizedMeta, 'assignedAgentId') ? { assignedAgentId: normalizedMeta.assignedAgentId || null } : {}),
            ...(Object.prototype.hasOwnProperty.call(normalizedMeta, 'reassignedToAgentId') ? { assignedAgentId: normalizedMeta.reassignedToAgentId || null } : {})
          };
          setShipments(prev => prev.map(s => (
            s.shipmentId === idValue ||
            s.id === idValue ||
            s.trackingId === idValue ||
            s.trackingNumber === idValue ||
            s.shipmentId === updatedShipment?.shipmentId ||
            s.id === updatedShipment?.id
              ? mergedShipment
              : s
          )));
          return mergedShipment;
      } catch (error) {
          console.error("Update status failed", error);
          throw error;
      }
  };

  const resolveShipmentCandidateIds = (shipmentOrId) => {
      const requestedId = typeof shipmentOrId === 'string' || typeof shipmentOrId === 'number'
        ? String(shipmentOrId || '').trim()
        : '';
      const shipmentObject = shipmentOrId && typeof shipmentOrId === 'object' ? shipmentOrId : null;
      const targetShipment = shipmentObject || shipments.find((shipment) => (
        [shipment.shipmentId, shipment.id, shipment.trackingId, shipment.trackingNumber]
          .filter(Boolean)
          .map((value) => String(value))
          .includes(requestedId)
      ));
      return [...new Set([
        targetShipment?.shipmentId,
        requestedId,
        targetShipment?.id,
        targetShipment?.trackingId,
        targetShipment?.trackingNumber
      ].filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
  };

  const assignShipmentToAgent = async (id, agentId, runSheetId = null) => {
      const targetAgentId = String(agentId || '').trim();
      if (!targetAgentId) throw new Error('Agent id is required');
      const candidateIds = resolveShipmentCandidateIds(id);
      if (candidateIds.length === 0) throw new Error('Shipment id is required');

      let assignedShipment = null;
      let lastError = null;
      for (const candidateId of candidateIds) {
        try {
          assignedShipment = await shipmentService.assignShipment(candidateId, targetAgentId, runSheetId);
          break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!assignedShipment) {
        throw lastError || new Error('Failed to assign shipment');
      }

      const updatedIdentifiers = new Set([
        ...candidateIds,
        assignedShipment?.shipmentId,
        assignedShipment?.id,
        assignedShipment?.trackingId,
        assignedShipment?.trackingNumber
      ].filter(Boolean).map((value) => String(value)));
      const assignedAgentValue = assignedShipment?.assignedAgentId || targetAgentId;
      setShipments((prev) => prev.map((shipment) => {
        const identifiers = [shipment.shipmentId, shipment.id, shipment.trackingId, shipment.trackingNumber]
          .filter(Boolean)
          .map((value) => String(value));
        if (!identifiers.some((value) => updatedIdentifiers.has(value))) return shipment;
        return {
          ...shipment,
          ...assignedShipment,
          assignedAgentId: assignedAgentValue
        };
      }));

      addNotification(`Shipment ${assignedShipment?.trackingNumber || assignedShipment?.shipmentId || candidateIds[0]} assigned to agent.`, 'admin');
      return assignedShipment;
  };

  const deleteShipment = async (id) => {
      const requestedId = String(id || '').trim();
      if (!requestedId) {
        throw new Error('Shipment id is required');
      }

      const candidateIds = resolveShipmentCandidateIds(requestedId);

      let deleted = false;
      let lastError = null;
      for (const candidateId of candidateIds) {
        try {
          await shipmentService.deleteShipment(candidateId);
          deleted = true;
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!deleted) {
        throw lastError || new Error('Failed to delete shipment from database');
      }

      const removedIds = new Set(candidateIds);
      setShipments((prev) => prev.filter((shipment) => {
        const identifiers = [shipment.shipmentId, shipment.id, shipment.trackingId, shipment.trackingNumber]
          .filter(Boolean)
          .map((value) => String(value));
        return !identifiers.some((value) => removedIds.has(value));
      }));
      const latestShipments = await refreshShipments();
      const stillExists = (latestShipments || []).some((shipment) => {
        const identifiers = [shipment.shipmentId, shipment.id, shipment.trackingId, shipment.trackingNumber]
          .filter(Boolean)
          .map((value) => String(value));
        return identifiers.some((value) => removedIds.has(value));
      });
      if (stillExists) {
        throw new Error('Shipment delete did not persist in database. Please try again.');
      }
      addNotification('Shipment deleted permanently.', 'customer');
      return true;
  };

  const deleteAllShipments = async (targetShipments = null) => {
      const sourceShipments = Array.isArray(targetShipments) ? targetShipments : shipments;
      const queue = Array.isArray(sourceShipments) ? sourceShipments.filter(Boolean) : [];
      if (queue.length === 0) {
        return { deletedCount: 0, failedCount: 0, failures: [] };
      }

      let deletedCount = 0;
      const failures = [];
      const deletedIdentifiers = new Set();

      for (const shipment of queue) {
        const candidateIds = resolveShipmentCandidateIds(shipment);
        if (candidateIds.length === 0) {
          failures.push({ id: 'UNKNOWN', message: 'Missing shipment identifiers' });
          continue;
        }

        let deleted = false;
        let lastError = null;
        for (const candidateId of candidateIds) {
          try {
            await shipmentService.deleteShipment(candidateId);
            deleted = true;
            deletedCount += 1;
            candidateIds.forEach((value) => deletedIdentifiers.add(String(value)));
            break;
          } catch (error) {
            lastError = error;
          }
        }

        if (!deleted) {
          failures.push({
            id: candidateIds[0],
            message: lastError?.message || 'Failed to delete shipment'
          });
        }
      }

      if (deletedIdentifiers.size > 0) {
        setShipments((prev) => prev.filter((shipment) => {
          const identifiers = [shipment.shipmentId, shipment.id, shipment.trackingId, shipment.trackingNumber]
            .filter(Boolean)
            .map((value) => String(value));
          return !identifiers.some((value) => deletedIdentifiers.has(value));
        }));
      }

      const latestShipments = await refreshShipments();
      if ((latestShipments || []).length > 0 && failures.length === 0) {
        throw new Error(`Shipment purge incomplete. ${latestShipments.length} shipment(s) still in database.`);
      }
      if (failures.length > 0) {
        throw new Error(`Deleted ${deletedCount} shipment(s). Failed to delete ${failures.length} shipment(s).`);
      }

      addNotification('All shipment records deleted permanently.', 'admin');
      return { deletedCount, failedCount: 0, failures: [] };
  };

  const rateShipment = async (id, rating, comment = '') => {
      try {
        const updatedShipment = await shipmentService.addShipmentRating(id, rating, comment);
        setShipments(prev => prev.map(s => (
          s.id === id || s.trackingId === id || s.trackingNumber === id || s.id === updatedShipment?.id
            ? updatedShipment
            : s
        )));
        addNotification(`Thanks for rating shipment ${updatedShipment?.trackingNumber || id}.`, 'customer');
        return updatedShipment;
      } catch (error) {
        console.error('Rate shipment failed', error);
        throw error;
      }
  };

  const cancelShipment = (id) => {
      updateShipmentStatus(id, 'Cancelled');
  };

  const getShipment = (id) => {
      return shipments.find(s => s.id === id || s.trackingId === id || s.trackingNumber === id);
  };

  const requestRoleUpgrade = async (requestedRole, reason = '', details = {}) => {
      if (!currentUser) throw new Error('Please login first');
      if (normalizeRole(currentUser.role) !== 'customer') {
        throw new Error('Only customers can request role upgrade');
      }

      const myRoleRequests = (roleRequests || [])
        .filter((request) => roleRequestBelongsToUser(request, currentUser))
        .sort((a, b) => getRoleRequestEventTime(b) - getRoleRequestEventTime(a));
      const latestLocalRoleRequest = myRoleRequests[0] || null;
      const latestLocalStatus = latestLocalRoleRequest
        ? normalizeRoleRequestStatus(latestLocalRoleRequest?.status)
        : '';
      if (['REJECTED', 'CANCELLED'].includes(latestLocalStatus)) {
        const reviewedAt = new Date().toISOString();
        setRoleRequests((prev) => prev.map((request) => {
          if (!roleRequestBelongsToUser(request, currentUser)) return request;
          if (!isPendingRoleRequestStatus(request?.status)) return request;
          return {
            ...request,
            status: 'REJECTED',
            reviewedAt,
            reviewedBy: 'system-sync'
          };
        }));
      }

      const stableIdentityCandidates = buildIdentityCandidates(
        currentUser?.userId,
        currentUser?.id
      );
      const customerIdentityCandidates = buildIdentityCandidates(
        ...stableIdentityCandidates,
        currentUser?.email
      );
      const primaryProfileUserId = stableIdentityCandidates[0] || '';

      const backendRequestStatus = primaryProfileUserId
        ? await operationsService.getAgentRequestStatus(primaryProfileUserId)
        : null;
      const hasBackendStatus = Boolean(backendRequestStatus && typeof backendRequestStatus === 'object');
      const normalizedBackendStatus = normalizeRoleRequestStatus(backendRequestStatus?.status || 'NONE');
      const effectiveBackendStatus = normalizedBackendStatus === 'VERIFIED' ? 'APPROVED' : normalizedBackendStatus;
      const backendHasPending = hasBackendStatus
        && (backendRequestStatus?.hasPending === 'true' || isPendingRoleRequestStatus(effectiveBackendStatus));

      if (backendHasPending) {
        throw new Error('You already have a pending request');
      }

      // If backend says request is no longer pending, reconcile stale local pending state.
      if (hasBackendStatus && isPendingRoleRequestStatus(latestLocalStatus)) {
        const reviewedAt = new Date().toISOString();
        const reviewedBy = 'system-sync';
        if (effectiveBackendStatus === 'NONE') {
          setRoleRequests((prev) => prev.filter((request) => {
            const isMine = roleRequestBelongsToUser(request, currentUser);
            const isPending = isPendingRoleRequestStatus(request?.status);
            return !(isMine && isPending);
          }));
        } else {
          const targetStatus = ['APPROVED', 'REJECTED', 'CANCELLED'].includes(effectiveBackendStatus)
            ? effectiveBackendStatus
            : 'CANCELLED';
          setRoleRequests((prev) => prev.map((request) => {
            if (!roleRequestBelongsToUser(request, currentUser)) return request;
            if (!isPendingRoleRequestStatus(request?.status)) return request;
            return {
              ...request,
              status: targetStatus,
              reviewedAt,
              reviewedBy
            };
          }));
        }
      } else if (!hasBackendStatus && isPendingRoleRequestStatus(latestLocalStatus)) {
        // Backend status unavailable: fall back to local pending guard.
        throw new Error('You already have a pending request');
      }

      const requestPayload = {
        currentRole: normalizeRole(currentUser.role),
        requestedRole: normalizeRole(requestedRole || 'agent'),
        reason: String(reason || '').trim(),
        agentDetails: {
          licenseNumber: String(details?.licenseNumber || '').trim(),
          aadharNumber: String(details?.aadharNumber || '').trim(),
          vehicleNumber: String(details?.vehicleNumber || '').trim(),
          rcBookNumber: String(details?.rcBookNumber || '').trim(),
          bloodType: String(details?.bloodType || '').trim(),
          organDonor: Boolean(details?.organDonor),
          bankAccountHolder: String(details?.bankAccountHolder || '').trim(),
          bankAccountNumber: String(details?.bankAccountNumber || '').trim(),
          bankIfsc: String(details?.bankIfsc || '').trim().toUpperCase(),
          bankName: String(details?.bankName || '').trim(),
          shiftTiming: String(details?.shiftTiming || 'Day').trim(),
          profilePhoto: details?.profilePhoto || null
        },
        documents: {
          profilePhoto: details?.profilePhoto || null,
          aadharCopy: details?.aadharCopy || null,
          licenseCopy: details?.licenseCopy || null,
          rcBookCopy: details?.rcBookCopy || null
        }
      };

      const request = {
        id: `rr-${Date.now()}`,
        userId: primaryProfileUserId || currentUser.userId || currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        ...requestPayload,
        status: 'PENDING',
        createdAt: new Date().toISOString()
      };

      try {
        const backendRequest = await roleService.requestRoleUpgrade(
          request.requestedRole,
          request.reason,
          {
            userId: request.userId,
            email: request.email,
            name: request.name,
            agentDetails: request.agentDetails,
            documents: request.documents
          }
        );
        if (backendRequest) {
          request.id = backendRequest.id || backendRequest.requestId || request.id;
          request.status = normalizeRoleRequestStatus(backendRequest.status || request.status);
          request.createdAt = backendRequest.createdAt || request.createdAt;
        }
      } catch (error) {
        console.warn('Role request API unavailable. Continuing with local request flow.', error);
      }

      try {
        if (primaryProfileUserId) {
          await operationsService.upsertAgentProfile(primaryProfileUserId, {
            licenseNumber: request.agentDetails.licenseNumber || undefined,
            aadharNumber: request.agentDetails.aadharNumber || undefined,
            vehicleNumber: request.agentDetails.vehicleNumber || undefined,
            rcBookNumber: request.agentDetails.rcBookNumber || undefined,
            bloodType: request.agentDetails.bloodType || undefined,
            organDonor: request.agentDetails.organDonor ?? false,
            shiftTiming: request.agentDetails.shiftTiming || 'Day',
            profileImage: request.documents.profilePhoto || undefined,
            aadharCopy: request.documents.aadharCopy || undefined,
            licenseCopy: request.documents.licenseCopy || undefined,
            rcBookCopy: request.documents.rcBookCopy || undefined,
            bankAccountHolder: request.agentDetails.bankAccountHolder || undefined,
            bankAccountNumber: request.agentDetails.bankAccountNumber || undefined,
            bankIfsc: request.agentDetails.bankIfsc || undefined,
            bankName: request.agentDetails.bankName || undefined,
            salaryBalance: 0,
            totalSalaryCredited: 0,
            totalSalaryDebited: 0,
            verificationStatus: 'PENDING',
            verificationNotes: request.reason || 'Role upgrade request submitted by customer',
            availabilityStatus: 'OFFLINE',
            deliveredCount: 0,
            failedCount: 0,
            inTransitCount: 0
          });
        }
      } catch (error) {
        // Keep local role-request flow available even when operations service is down.
        console.warn('Failed to persist role request in operations profile store', error);
      }

      setRoleRequests(prev => [request, ...prev].slice(0, MAX_ROLE_REQUESTS));
      persistRoleRequestDocuments(request, [primaryProfileUserId]);
      addNotification('Role upgrade request submitted to admin.', 'customer');
      addNotification(`New agent access request from ${request.name || request.email}.`, 'admin');
      return request;
  };

  const markRoleRequestPending = async (requestInput) => {
      const inputRequest = typeof requestInput === 'object' ? requestInput : null;
      const inputId = typeof requestInput === 'string' ? requestInput : requestInput?.id;
      const inputIdentity = toIdentityValue(
        inputRequest?.userId ||
        inputRequest?.email ||
        inputId
      );
      const inputIdentitySet = [...new Set([
        ...getRoleRequestIdentityValues(inputRequest || {}),
        inputIdentity
      ].filter(Boolean))];

      const existingRequest = (roleRequests || []).find((request) => {
        if (inputId && request.id === inputId) return true;
        return inputIdentitySet.length > 0 && roleRequestMatchesAnyIdentity(request, inputIdentitySet);
      }) || null;

      const source = inputRequest || existingRequest;
      if (!source) {
        throw new Error('Role request not found');
      }

      const now = new Date().toISOString();
      const normalizedRequest = {
        id: source.id || `rr-${Date.now()}`,
        userId: source.userId || source.id || source.email || '',
        email: source.email || '',
        name: source.name || source.fullName || source.email || 'User',
        currentRole: normalizeRole(source.currentRole || 'customer'),
        requestedRole: normalizeRole(source.requestedRole || 'agent'),
        reason: source.reason || '',
        agentDetails: source.agentDetails || {},
        documents: source.documents || {},
        status: 'PENDING_VERIFICATION',
        createdAt: source.createdAt || now,
        reviewedAt: now,
        reviewedBy: currentUser?.email || currentUser?.userId || 'admin'
      };

      setRoleRequests((prev) => {
        const next = [...prev];
        const existingIndex = next.findIndex((request) => {
          if (normalizedRequest.id && request.id === normalizedRequest.id) return true;
          const requestIdentity = toIdentityValue(request.userId || request.email || request.id);
          const normalizedIdentity = toIdentityValue(
            normalizedRequest.userId ||
            normalizedRequest.email ||
            normalizedRequest.id
          );
          return Boolean(normalizedIdentity) && requestIdentity === normalizedIdentity;
        });

        if (existingIndex >= 0) {
          next[existingIndex] = { ...next[existingIndex], ...normalizedRequest };
        } else {
          next.unshift(normalizedRequest);
        }
        return next.slice(0, MAX_ROLE_REQUESTS);
      });

      const profileUserId = normalizedRequest.userId || normalizedRequest.email;
      if (profileUserId) {
        try {
          await operationsService.upsertAgentProfile(profileUserId, {
            licenseNumber: normalizedRequest.agentDetails?.licenseNumber || undefined,
            aadharNumber: normalizedRequest.agentDetails?.aadharNumber || undefined,
            vehicleNumber: normalizedRequest.agentDetails?.vehicleNumber || undefined,
            rcBookNumber: normalizedRequest.agentDetails?.rcBookNumber || undefined,
            bloodType: normalizedRequest.agentDetails?.bloodType || undefined,
            organDonor: normalizedRequest.agentDetails?.organDonor ?? false,
            profileImage: normalizedRequest.documents?.profilePhoto || undefined,
            aadharCopy: normalizedRequest.documents?.aadharCopy || undefined,
            licenseCopy: normalizedRequest.documents?.licenseCopy || undefined,
            rcBookCopy: normalizedRequest.documents?.rcBookCopy || undefined,
            verificationStatus: 'PENDING',
            verificationNotes: 'Moved to admin document verification queue'
          });
        } catch (error) {
          console.warn('Failed to persist pending verification state', error);
        }
      }

      addNotification('Agent request moved to verification queue.', 'admin');
      return normalizedRequest;
  };

  const approveRoleRequest = async (requestInput) => {
      const requestId = typeof requestInput === 'string' ? requestInput : requestInput?.id;
      const requestIdentity = toIdentityValue(
        requestInput?.userId ||
        requestInput?.email ||
        requestId
      );
      const requestIdentitySet = [...new Set([
        ...getRoleRequestIdentityValues(requestInput || {}),
        requestIdentity
      ].filter(Boolean))];
      const requestRecord = typeof requestInput === 'object'
        ? requestInput
        : (roleRequests || []).find((request) => {
          const sameId = requestId && String(request?.id || '') === String(requestId);
          const sameIdentity = requestIdentitySet.length > 0 && roleRequestMatchesAnyIdentity(request, requestIdentitySet);
          return sameId || sameIdentity;
        });

      if (!requestRecord) {
        throw new Error("Invalid request object provided.");
      }

      if (requestId && !String(requestId).startsWith('rr-')) {
        try {
          await roleService.approveRequest(requestId);
        } catch (error) {
          console.warn('Role approval API unavailable. Continuing with local approval flow.', error);
        }
      }

      // Build all possible account identities (never role-request ids like rr-*).
      const requestIdentityCandidates = buildIdentityCandidates(
        requestRecord?.userId,
        requestRecord?.email,
        requestRecord?.requestRecord?.userId,
        requestRecord?.requestRecord?.email
      );

      const matchedUserByIdentity = (users || []).find((user) => {
        const userIdentities = [user?.userId, user?.id, user?.email].map(toIdentityValue).filter(Boolean);
        return requestIdentityCandidates
          .map(toIdentityValue)
          .filter(Boolean)
          .some((identity) => userIdentities.includes(identity));
      }) || null;

      const identityCandidates = buildIdentityCandidates(
        ...requestIdentityCandidates,
        matchedUserByIdentity?.userId,
        matchedUserByIdentity?.id,
        matchedUserByIdentity?.email
      );

      const userIdentifier =
        matchedUserByIdentity?.userId ||
        matchedUserByIdentity?.id ||
        requestRecord?.userId ||
        requestRecord?.requestRecord?.userId ||
        requestRecord?.email ||
        requestRecord?.requestRecord?.email ||
        identityCandidates[0];
      if (!userIdentifier) {
          throw new Error("No user identifier found in the request.");
      }
      
      const roleToAssign = 'agent';

      const fallbackUser = matchedUserByIdentity;

      const profileUserId =
        fallbackUser?.userId ||
        fallbackUser?.id ||
        requestRecord?.userId ||
        requestRecord?.requestRecord?.userId ||
        requestRecord?.email ||
        requestRecord?.requestRecord?.email;

      const requestedAgentDetails = requestRecord.agentDetails || {};
      const requestedDocs = readRoleRequestDocuments(requestRecord);

      if (roleToAssign === 'agent') {
        try {
          await operationsService.upsertAgentProfile(profileUserId, {
            licenseNumber: requestedAgentDetails.licenseNumber || undefined,
            aadharNumber: requestedAgentDetails.aadharNumber || undefined,
            vehicleNumber: requestedAgentDetails.vehicleNumber || undefined,
            rcBookNumber: requestedAgentDetails.rcBookNumber || undefined,
            bloodType: requestedAgentDetails.bloodType || undefined,
            organDonor: requestedAgentDetails.organDonor ?? false,
            shiftTiming: requestedAgentDetails.shiftTiming || 'Day',
            profileImage: requestedDocs.profilePhoto || undefined,
            aadharCopy: requestedDocs.aadharCopy || undefined,
            licenseCopy: requestedDocs.licenseCopy || undefined,
            rcBookCopy: requestedDocs.rcBookCopy || undefined,
            bankAccountHolder: requestedAgentDetails.bankAccountHolder || undefined,
            bankAccountNumber: requestedAgentDetails.bankAccountNumber || undefined,
            bankIfsc: requestedAgentDetails.bankIfsc || undefined,
            bankName: requestedAgentDetails.bankName || undefined,
            salaryBalance: 0,
            totalSalaryCredited: 0,
            totalSalaryDebited: 0,
            verificationStatus: 'VERIFIED',
            verifiedBy: currentUser?.name || currentUser?.email || 'Admin',
            verificationNotes: requestRecord.reason ? `Approved request: ${requestRecord.reason}` : 'Approved role request',
            availabilityStatus: 'AVAILABLE',
            deliveredCount: 0,
            failedCount: 0,
            inTransitCount: 0
          });
        } catch (error) {
          console.warn('Failed to save agent profile during approval. Proceeding with role update.', error);
        }
      }

      // Call the backend service to update the user's role.
      // Only allow local fallback for synthetic/local-only role requests.
      let roleUpdateFailed = false;
      let roleUpdateSucceeded = false;
      let lastRoleUpdateError = null;
      const isSyntheticRequest = Boolean(requestId && String(requestId).startsWith('rr-'));
      try {
          for (const identity of identityCandidates) {
            try {
              await authService.updateUserRole(identity, roleToAssign);
              roleUpdateSucceeded = true;
              break;
            } catch (error) {
              lastRoleUpdateError = error;
            }
          }
          if (!roleUpdateSucceeded) {
            if (isSyntheticRequest) {
              const reason = lastRoleUpdateError?.message || 'User does not exist in auth DB';
              console.warn('Backend role update not available for synthetic/local request. Applying locally:', reason);
              roleUpdateFailed = true;
            } else {
              throw (lastRoleUpdateError || new Error('Failed to update user role in DB'));
            }
          }
      } catch (error) {
          if (isSyntheticRequest) {
            const reason = error?.message || 'Unknown role update error';
            console.warn('Backend role update failed for synthetic/local request. Applying locally:', reason);
            roleUpdateFailed = true;
          } else {
            throw error;
          }
      }

      // Remove stale overrides for this identity set first.
      setRoleOverrides(prev => {
        const identitySet = new Set(identityCandidates.map(toIdentityValue).filter(Boolean));
        const filtered = prev.filter((override) => {
          const overrideIdentities = [override?.userId, override?.id, override?.email]
            .map(toIdentityValue)
            .filter(Boolean);
          return !overrideIdentities.some((identity) => identitySet.has(identity));
        });

        if (roleUpdateFailed) {
          filtered.push({
            userId: requestRecord?.userId || requestRecord?.requestRecord?.userId || matchedUserByIdentity?.userId || matchedUserByIdentity?.id || userIdentifier,
            id: matchedUserByIdentity?.id || requestRecord?.userId || requestRecord?.requestRecord?.userId || undefined,
            email: requestRecord?.email || matchedUserByIdentity?.email || '',
            role: normalizeRole(roleToAssign),
            blocked: false,
            updatedAt: new Date().toISOString()
          });
        }

        return filtered;
      });

      // Immediately update in-memory user directory so UI moves user to agent list now.
      setUsers((prev) => {
        const identitySet = new Set(identityCandidates.map(toIdentityValue).filter(Boolean));
        return (prev || []).map((user) => {
          const userIdentities = [user?.userId, user?.id, user?.email]
            .map(toIdentityValue)
            .filter(Boolean);
          if (!userIdentities.some((identity) => identitySet.has(identity))) return user;
          return {
            ...user,
            role: normalizeRole(roleToAssign),
            updatedAt: new Date().toISOString()
          };
        });
      });

      // Update the local state for role requests
      const reviewedAt = new Date().toISOString();
      const reviewedBy = currentUser?.email || currentUser?.userId || 'admin';
      setRoleRequests((prev) => {
        let matched = false;
        const next = prev.map((item) => {
          const sameId = requestId && String(item?.id || '') === String(requestId);
          const sameIdentity = requestIdentitySet.length > 0 && roleRequestMatchesAnyIdentity(item, requestIdentitySet);
          if (!sameId && !sameIdentity) return item;
          matched = true;
          return {
            ...item,
            status: 'APPROVED',
            reviewedAt,
            reviewedBy
          };
        });
        if (matched) return next;
        return [{
          ...requestRecord,
          id: requestRecord.id || requestId || `rr-${Date.now()}`,
          status: 'APPROVED',
          reviewedAt,
          reviewedBy
        }, ...next].slice(0, MAX_ROLE_REQUESTS);
      });

      if (roleToAssign === 'agent') {
        persistRoleRequestDocuments(requestRecord, [profileUserId]);
      }

      await loadUsersFromDb();

      const targetUserId = requestRecord.userId || requestRecord.email || matchedUserByIdentity?.userId || matchedUserByIdentity?.email;
      if (targetUserId) {
        try {
          await communicationService.sendNotification(targetUserId, 'IN_APP', 'Your agent access request was approved by admin. Please logout and login again to continue as agent.');
        } catch {
          // non-blocking notification
        }
      }
      addNotification('Agent request approved successfully.', 'admin');

  };

  const rejectRoleRequest = async (requestInput, rejectionReason = '') => {
      const requestId = typeof requestInput === 'string' ? requestInput : requestInput?.id;
      const requestIdentity = toIdentityValue(
        requestInput?.userId ||
        requestInput?.email ||
        requestId
      );
      const requestIdentitySet = [...new Set([
        ...getRoleRequestIdentityValues(requestInput || {}),
        requestIdentity
      ].filter(Boolean))];
      const requestRecord = typeof requestInput === 'object'
        ? requestInput
        : (roleRequests || []).find((request) => {
          const sameId = requestId && String(request?.id || '') === String(requestId);
          const sameIdentity = requestIdentitySet.length > 0 && roleRequestMatchesAnyIdentity(request, requestIdentitySet);
          return sameId || sameIdentity;
        });
      if (!requestRecord) {
        throw new Error('Role request not found');
      }

      if (requestId && !String(requestId).startsWith('rr-')) {
        try {
          await roleService.rejectRequest(requestId);
        } catch (error) {
          console.warn('Role rejection API unavailable. Continuing with local rejection flow.', error);
        }
      }

      const adminReason = String(rejectionReason || '').trim();
      const finalReason = adminReason || 'Request rejected by admin due to incomplete or invalid details.';
      const matchedUser = (users || []).find((user) => {
        const requestIdentities = getRoleRequestIdentityValues(requestRecord);
        const userIdentities = [user?.userId, user?.id, user?.email].map(toIdentityValue).filter(Boolean);
        return requestIdentities.some((identity) => userIdentities.includes(identity));
      }) || null;
      const targetIdentityCandidates = buildIdentityCandidates(
        requestRecord?.userId,
        requestRecord?.email,
        requestRecord?.id,
        matchedUser?.userId,
        matchedUser?.id,
        matchedUser?.email
      );

      for (const identity of targetIdentityCandidates) {
        try {
          await authService.updateUserRole(identity, 'customer');
          break;
        } catch {
          // try next identity
        }
      }

      for (const identity of targetIdentityCandidates) {
        try {
          await operationsService.verifyAgentProfile(identity, {
            verified: false,
            verifiedBy: currentUser?.name || currentUser?.email || 'Admin',
            verificationNotes: `Rejected by admin: ${finalReason}`,
            verificationStatus: 'REJECTED'
          });
        } catch {
          // non-blocking backend verification update
        }
      }

      const reviewedAt = new Date().toISOString();
      const reviewedBy = currentUser?.email || currentUser?.userId || 'admin';
      setRoleRequests((prev) => {
        let matched = false;
        const next = prev.map((request) => {
          const sameId = requestId && String(request?.id || '') === String(requestId);
          const sameIdentity = requestIdentitySet.length > 0 && roleRequestMatchesAnyIdentity(request, requestIdentitySet);
          if (!sameId && !sameIdentity) return request;
          matched = true;
          return {
            ...request,
            status: 'REJECTED',
            rejectionReason: finalReason,
            reviewedAt,
            reviewedBy
          };
        });
        if (matched) return next;
        if (!requestRecord) return next;
        return [{
          ...requestRecord,
          id: requestRecord.id || requestId || `rr-${Date.now()}`,
          status: 'REJECTED',
          rejectionReason: finalReason,
          reviewedAt,
          reviewedBy
        }, ...next].slice(0, MAX_ROLE_REQUESTS);
      });

      const targetUserId = targetIdentityCandidates[0] || requestRecord?.userId || requestRecord?.email;
      if (targetUserId) {
        try {
          await communicationService.sendNotification(targetUserId, 'IN_APP', `Your agent request was rejected: ${finalReason}`);
        } catch {
          // non-blocking notification
        }
        try {
          await communicationService.createTicket({
            userId: targetUserId,
            subject: 'Agent Request Rejected',
            category: 'Role Request',
            priority: 'Medium',
            message: finalReason,
            senderName: currentUser?.name || currentUser?.email || 'Admin',
            senderRole: 'admin'
          });
        } catch {
          // non-blocking ticket creation
        }
      }
      addNotification('Agent request rejected. User remains customer.', 'admin');
  };

  const cancelRoleRequest = async (requestInput) => {
      const requestId = typeof requestInput === 'string' ? requestInput : requestInput?.id;
      const requestIdentity = toIdentityValue(
        requestInput?.userId ||
        requestInput?.email ||
        requestId
      );
      const requestIdentitySet = [...new Set([
        ...getRoleRequestIdentityValues(requestInput || {}),
        requestIdentity
      ].filter(Boolean))];

      const requestRecord = typeof requestInput === 'object'
        ? requestInput
        : (roleRequests || []).find((request) => {
          const sameId = requestId && String(request?.id || '') === String(requestId);
          const sameIdentity = requestIdentitySet.length > 0 && roleRequestMatchesAnyIdentity(request, requestIdentitySet);
          return sameId || sameIdentity;
        });

      if (!requestRecord) {
        throw new Error('Role request not found');
      }

      if (requestId) {
        await roleService.cancelRequest(requestId);
      }

      const reviewedAt = new Date().toISOString();
      setRoleRequests((prev) => prev.filter((request) => {
        const sameId = requestId && String(request?.id || '') === String(requestId);
        const sameIdentity = requestIdentitySet.length > 0 && roleRequestMatchesAnyIdentity(request, requestIdentitySet);
        const sameUserPending = roleRequestBelongsToUser(request, currentUser) && isPendingRoleRequestStatus(request?.status);
        return !(sameId || sameIdentity || sameUserPending);
      }));

      const identityCandidates = buildIdentityCandidates(
        requestRecord?.userId,
        requestRecord?.email,
        requestRecord?.id
      );
      for (const identity of identityCandidates) {
        try {
          await operationsService.verifyAgentProfile(identity, {
            verified: false,
            verificationNotes: 'Cancelled by customer',
            verificationStatus: 'CANCELLED'
          });
        } catch {
          // non-blocking cleanup
        }
      }

      addNotification('Role request cancelled.', 'customer');
      return { ...requestRecord, status: 'CANCELLED', reviewedAt };
  };

  const updatePricingConfig = async (nextConfig = {}) => {
      const localDraft = normalizePricingConfig(
        { ...pricingConfig, ...(nextConfig || {}), sameDayMultiplier: 2 },
        DEFAULT_PRICING_CONFIG
      );
      setPricingConfig(localDraft);

      try {
        const backendSaved = await shipmentService.updatePricingConfig(localDraft);
        const merged = normalizePricingConfig(
          { ...localDraft, ...(backendSaved || {}), sameDayMultiplier: 2 },
          DEFAULT_PRICING_CONFIG
        );
        setPricingConfig(merged);
        return merged;
      } catch (error) {
        console.warn('Failed to persist pricing config to backend. Keeping local config.', error);
        return localDraft;
      }
  };

  const updateUserRole = async (targetUser, role) => {
      const target = typeof targetUser === 'string'
        ? users.find(u => u.email === targetUser || u.userId === targetUser || u.id === targetUser)
        : targetUser;
      if (!target) return;

      if (isProtectedAdmin(target) && normalizeRole(role) !== 'admin') {
        throw new Error('Default admin role cannot be changed.');
      }

      const nextRole = normalizeRole(role);

      try {
        await authService.updateUserRole(target.userId || target.id || target.email, nextRole);
      } catch (error) {
        if (String(error.message).includes('found') || String(error.message).includes('Failed to update') || String(error.message).includes('404')) {
          console.warn("Backend update failed (likely mock user). Applying locally:", error.message);
        } else {
          throw error;
        }
      }

      setRoleOverrides(prev => {
        const next = prev.filter(o => !(o.email === target.email || (o.userId && o.userId === target.userId)));
        next.push({
          userId: target.userId || target.id,
          email: target.email,
          role: nextRole,
          blocked: false,
          updatedAt: new Date().toISOString()
        });
        return next;
      });

      await loadUsersFromDb();

      if (currentUser?.email === target.email) {
        const updatedUser = { ...currentUser, role: nextRole, blocked: false };
        setCurrentUser(updatedUser);
        authStorage.setCurrentUser(updatedUser);
      }

      if (nextRole === 'customer') {
        const targetIdentitySet = new Set(
          [target?.userId, target?.id, target?.email]
            .map(toIdentityValue)
            .filter(Boolean)
        );
        if (targetIdentitySet.size > 0) {
          const reviewedAt = new Date().toISOString();
          setRoleRequests((prev) => prev.map((request) => {
            const requestIds = [request?.userId, request?.email, request?.id]
              .map(toIdentityValue)
              .filter(Boolean);
            const belongsToTarget = requestIds.some((id) => targetIdentitySet.has(id));
            if (!belongsToTarget) return request;
            const status = normalizeRoleRequestStatus(request?.status);
            if (status !== 'APPROVED') return request;
            return {
              ...request,
              status: 'CANCELLED',
              reviewedAt,
              reviewedBy: currentUser?.email || 'admin-role-downgrade',
              rejectionReason: request?.rejectionReason || 'Role changed back to customer by admin'
            };
          }));
        }
      }
  };

  const removeUserAccess = async (targetUser) => {
      const target = typeof targetUser === 'string'
        ? users.find(u => u.email === targetUser || u.userId === targetUser || u.id === targetUser)
        : targetUser;
      if (!target) return;

      if (isProtectedAdmin(target)) {
        throw new Error('Default admin access cannot be removed.');
      }

      await authService.removeUserAccess(target.userId || target.id || target.email);

      const rawIdentityCandidates = buildIdentityCandidates(
        target.userId,
        target.id,
        target.email,
        String(target.email || '').toLowerCase()
      );
      const identityCandidates = rawIdentityCandidates.map(toIdentityValue).filter(Boolean);

      setRoleOverrides(prev => (
        prev.filter((o) => {
          const overrideIds = [o.userId, o.email].map(toIdentityValue).filter(Boolean);
          return !overrideIds.some((id) => identityCandidates.includes(id));
        })
      ));

      setRoleRequests((prev) => (
        prev.filter((request) => !roleRequestMatchesAnyIdentity(request, identityCandidates))
      ));

      setUsers((prev) => (
        prev.filter((user) => {
          const userIds = [user.userId, user.id, user.email].map(toIdentityValue).filter(Boolean);
          return !userIds.some((id) => identityCandidates.includes(id));
        })
      ));

      rawIdentityCandidates.forEach((identity) => {
        try {
          localStorage.removeItem(`${AGENT_ONBOARDING_KEY_PREFIX}${identity}`);
          localStorage.removeItem(`${LEGACY_AGENT_ONBOARDING_KEY_PREFIX}${identity}`);
        } catch {
          // non-blocking cleanup
        }
      });

      try {
        const pendingPayload = await roleService.getPendingRequests();
        const pendingRequests = Array.isArray(pendingPayload)
          ? pendingPayload
          : pendingPayload?.requests || pendingPayload?.content || [];
        await Promise.allSettled(
          (pendingRequests || []).map(async (request) => {
            const requestId = request?.id || request?.requestId || request?._id;
            const requestIdentity = toIdentityValue(request?.userId || request?.user?.id || request?.email || request?.user?.email || requestId);
            if (!requestId) return;
            if (!requestIdentity || !identityCandidates.includes(requestIdentity)) return;
            await roleService.cancelRequest(requestId);
          })
        );
      } catch {
        // non-blocking: backend cleanup best-effort
      }

      for (const identity of rawIdentityCandidates) {
        try {
          await operationsService.deleteAgentProfile(identity);
        } catch {
          // non-blocking cleanup
        }
      }

      await loadUsersFromDb();

      if (currentUser?.email === target.email) {
        await logout();
      }
  };

  // Helper for admin/agent actions
    const addBranch = async (branchData) => {
      const newBranch = await adminService.createBranch(branchData);
      setBranches(prev => [newBranch, ...prev]);
      addNotification(`Branch "${branchData.name}" added successfully.`, 'admin');
      setLastDataSyncAt(new Date().toISOString());
      return newBranch;
  };
  
  const removeBranch = async (branchId) => {
      await adminService.deleteBranch(branchId);
      setBranches(prev => prev.filter(b => b.id !== branchId && b.branchId !== branchId));
      addNotification('Branch removed successfully.', 'admin');
      setLastDataSyncAt(new Date().toISOString());
  };

    const updateBranch = async (updatedBranch) => {
      const savedBranch = await adminService.updateBranch(updatedBranch.id || updatedBranch.branchId, updatedBranch);
      setBranches(prev => prev.map(b => (b.id === savedBranch.id || b.branchId === savedBranch.branchId) ? savedBranch : b));
      addNotification(`Branch "${updatedBranch.name}" updated successfully.`, 'admin');
      setLastDataSyncAt(new Date().toISOString());
      return savedBranch;
  };

  const addVehicle = async (vehicleData) => {
      const newVehicle = await adminService.createVehicle(vehicleData);
      setVehicles(prev => [newVehicle, ...prev]);
      addNotification(`Vehicle ${vehicleData.number || vehicleData.vehicleNumber} added to fleet.`, 'admin');
      setLastDataSyncAt(new Date().toISOString());
      return newVehicle;
  };

  const updateVehicle = async (updatedVehicle) => {
      const savedVehicle = await adminService.updateVehicle(updatedVehicle.id || updatedVehicle.vehicleId || updatedVehicle.number, updatedVehicle);
      setVehicles(prev => prev.map(v => (v.id === savedVehicle.id || v.vehicleId === savedVehicle.vehicleId) ? savedVehicle : v));
      addNotification(`Vehicle ${savedVehicle.number || savedVehicle.id} updated successfully.`, 'admin');
      setLastDataSyncAt(new Date().toISOString());
      return savedVehicle;
  };

  const removeVehicle = async (vehicleId) => {
      await adminService.deleteVehicle(vehicleId);
      setVehicles(prev => prev.filter(v => v.id !== vehicleId && v.vehicleId !== vehicleId));
      addNotification('Vehicle removed successfully.', 'admin');
      setLastDataSyncAt(new Date().toISOString());
  };

  const updateBranchStatus = async (branchId, status) => {
      const existing = branches.find((b) => b.id === branchId || b.branchId === branchId);
      if (!existing) {
        throw new Error('Branch not found');
      }
      const savedBranch = await adminService.updateBranch(branchId, {
        ...existing,
        status
      });
      setBranches(prev => prev.map(b => (b.id === savedBranch.id || b.branchId === savedBranch.branchId) ? savedBranch : b));
      setLastDataSyncAt(new Date().toISOString());
      return savedBranch;
  };

  const updateVehicleStatus = async (vehicleId, status) => {
      const existing = vehicles.find((v) => v.id === vehicleId || v.vehicleId === vehicleId);
      if (!existing) {
        throw new Error('Vehicle not found');
      }
      const savedVehicle = await adminService.updateVehicle(vehicleId, {
        ...existing,
        status
      });
      setVehicles(prev => prev.map(v => (v.id === savedVehicle.id || v.vehicleId === savedVehicle.vehicleId) ? savedVehicle : v));
      setLastDataSyncAt(new Date().toISOString());
      return savedVehicle;
  };

  const addStaff = (staffData) => {
      const newStaff = { ...staffData, id: Date.now(), status: 'Active', performance: { deliveries: 0, rating: 5.0, shift: 'Day' } };
      setStaff(prev => [...prev, newStaff]);
      addNotification(`Staff member "${staffData.name}" added successfully.`, 'admin');
  };

  const removeStaff = (staffId) => {
      setStaff(prev => prev.filter(s => s.id !== staffId));
      addNotification('Staff member removed.', 'admin');
  };

  const updateStaff = (updatedStaff) => {
      setStaff(prev => prev.map(s => s.id === updatedStaff.id ? updatedStaff : s));
      addNotification(`Staff member "${updatedStaff.name}" updated successfully.`, 'admin');
  };
  
    const updateProfile = async (updatedData) => {
      if (!currentUser) return;

      const onlyPictureUpdate = Object.keys(updatedData).every(key => key === 'profilePic');
      const hasExtendedData = Boolean(updatedData.documents || updatedData.agentDetails);
      const hasCoreProfileUpdates = ['name', 'fullName', 'phone', 'phoneNumber', 'address', 'city', 'state', 'pincode']
        .some((key) => Object.prototype.hasOwnProperty.call(updatedData, key));

      if (onlyPictureUpdate) {
        const userWithPicture = { ...currentUser, profilePic: updatedData.profilePic ?? null };
        setCurrentUser(userWithPicture);
        authStorage.setCurrentUser(userWithPicture);
          syncUserDirectory(userWithPicture);
        return userWithPicture;
      }

      // Keep agent onboarding/documents usable even if backend profile API does not support those fields.
      if (hasExtendedData && !hasCoreProfileUpdates) {
        const mergedLocalUser = {
          ...currentUser,
          ...updatedData,
          name: updatedData.name ?? updatedData.fullName ?? currentUser.name,
          fullName: updatedData.fullName ?? updatedData.name ?? currentUser.fullName
        };
        setCurrentUser(mergedLocalUser);
        authStorage.setCurrentUser(mergedLocalUser);
        syncUserDirectory(mergedLocalUser);
        addNotification('Agent verification details saved locally.', 'agent', 'SUCCESS');
        return mergedLocalUser;
      }

      const profilePayload = {
        fullName: updatedData.name ?? updatedData.fullName ?? currentUser.name,
        phoneNumber: updatedData.phone ?? updatedData.phoneNumber ?? currentUser.phone,
        address: updatedData.address ?? currentUser.address,
        city: updatedData.city ?? currentUser.city,
        state: updatedData.state ?? currentUser.state,
        pincode: updatedData.pincode ?? currentUser.pincode
      };

      const updatedUser = await authService.updateProfile(profilePayload);
      const mergedUser = {
        ...updatedUser,
        profilePic: currentUser.profilePic || null,
        ...(hasExtendedData ? { documents: updatedData.documents, agentDetails: updatedData.agentDetails } : {})
      };
      setCurrentUser(mergedUser);
      authStorage.setCurrentUser(mergedUser);
        syncUserDirectory(mergedUser);
      addNotification('Profile updated successfully.', 'all');
      return mergedUser;
  };

  const addNotification = (message, role = 'all', status = 'INFO') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const createdAt = new Date().toISOString();
      setNotifications(prev => {
        const next = mergeNotifications([
          {
            id,
            message,
            role: String(role || 'all').toLowerCase(),
            status,
            createdAt,
            timestamp: new Date(createdAt).toLocaleString()
          }
        ], prev);
        return next.slice(0, 100);
      });
  };

  const getRoleNotifications = (role) => {
      const dismissed = new Set(dismissedNotificationIds.map((value) => String(value).trim()));
      return notifications.filter((n) => {
        const roleName = String(n?.role || 'all').toLowerCase();
        const notificationId = String(n?.id || '').trim();
        if (notificationId && dismissed.has(notificationId)) return false;
        return !roleName || roleName === String(role || '').toLowerCase() || roleName === 'all';
      });
  };

  const dismissNotification = (notificationId) => {
    const normalizedId = String(notificationId || '').trim();
    if (!normalizedId) return;
    setDismissedNotificationIds((prev) => (
      prev.includes(normalizedId) ? prev : [normalizedId, ...prev].slice(0, 500)
    ));
    setNotifications((prev) => prev.filter((item) => String(item?.id || '').trim() !== normalizedId));
  };

  const notifyAdminFromAgent = async (message) => {
      const text = String(message || '').trim();
      if (!text) throw new Error('Message is required');

      const senderName = currentUser?.name || currentUser?.email || currentUser?.userId || 'Agent';
      const senderId = currentUser?.userId || currentUser?.id || currentUser?.email || senderName;
      const composed = `Agent message from ${senderName}: ${text}`;

      const ticket = await communicationService.createTicket({
        userId: senderId,
        subject: `Agent Operational Message - ${senderName}`,
        category: 'Operations',
        priority: 'Medium',
        message: text,
        senderName,
        senderRole: 'agent'
      });

      try {
        await communicationService.sendNotification('ADMIN', 'IN_APP', composed);
      } catch {
        // Non-blocking: fallback to in-app notification state
      }

      addNotification(composed, 'admin', 'INFO');
      return ticket;
  };

    const getSupportTickets = async (userId = null) => {
      const effectiveUserId = userId || currentUser?.userId || currentUser?.id;
      return communicationService.getUserTickets(effectiveUserId);
    };

    const getAllSupportTickets = async (status = '') => {
      return communicationService.getAllTickets(status);
    };

    const createSupportTicket = async (ticketData) => {
      const effectiveUserId = ticketData.userId || currentUser?.userId || currentUser?.id;
      const created = await communicationService.createTicket({
        ...ticketData,
        userId: effectiveUserId,
        senderName: currentUser?.name || ticketData.senderName || 'Customer',
        senderRole: currentUser?.role || ticketData.senderRole || 'customer'
      });
      const actorName = currentUser?.name || currentUser?.email || 'User';
      const ticketRef = created?.id || 'Ticket';
      addNotification(`${ticketRef} created by ${actorName}: ${created?.subject || ticketData?.subject || 'Support Ticket'}`, 'all', 'INFO');
      try {
        await Promise.allSettled([
          communicationService.sendNotification(effectiveUserId, 'IN_APP', `Ticket created: ${created.subject}`),
          communicationService.sendNotification('ADMIN', 'IN_APP', `Ticket ${ticketRef} created by ${actorName}`)
        ]);
      } catch {
        // Non-blocking notification call
      }
      return created;
    };

    const replySupportTicket = async (ticketId, message) => {
      const updated = await communicationService.replyTicket(ticketId, {
        senderId: currentUser?.userId || currentUser?.id || currentUser?.email,
        senderName: currentUser?.name || currentUser?.email || 'Support',
        senderRole: currentUser?.role || 'customer',
        message
      });
      const actorName = currentUser?.name || currentUser?.email || 'User';
      const ticketRef = updated?.id || ticketId;
      addNotification(`${ticketRef} replied by ${actorName}`, 'all', 'INFO');
      try {
        if (updated?.userId) {
          await communicationService.sendNotification(updated.userId, 'IN_APP', `New reply on ${ticketRef}`);
        }
      } catch {
        // Non-blocking notification call
      }
      return updated;
    };

    const updateSupportTicketStatus = async (ticketId, status, assignment = {}) => {
      const updated = await communicationService.updateTicketStatus(ticketId, {
        status,
        assignedToRole: assignment.assignedToRole,
        assignedToUserId: assignment.assignedToUserId
      });
      const readableStatus = String(updated?.status || status || '').replace(/_/g, ' ').trim();
      const ticketRef = updated?.id || ticketId;
      addNotification(`${ticketRef} status updated to ${readableStatus}`, 'all', 'INFO');
      try {
        if (updated?.userId) {
          await communicationService.sendNotification(updated.userId, 'IN_APP', `${ticketRef} status: ${readableStatus}`);
        }
      } catch {
        // Non-blocking notification call
      }
      return updated;
    };

    const closeSupportTicket = async (ticketId) => {
      return communicationService.closeTicket(ticketId);
    };

    const deleteSupportTicket = async (ticketId) => {
      const deleted = await communicationService.deleteTicket(ticketId);
      addNotification(`${ticketId} was deleted`, 'all', 'INFO');
      return deleted;
    };
  
  const calculateRate = (weight, serviceType) => {
      const w = Number(weight) || 0;
      const normalizedService = String(serviceType || 'Standard').toLowerCase().replace(/[_-]/g, ' ').trim();
      let baseRate = Math.max(0, w * Number(pricingConfig?.standardRatePerKg || DEFAULT_PRICING_CONFIG.standardRatePerKg));
      if (normalizedService === 'express') {
        baseRate *= Number(pricingConfig?.expressMultiplier || DEFAULT_PRICING_CONFIG.expressMultiplier);
      } else if (normalizedService === 'same day' || normalizedService === 'sameday') {
        baseRate *= Number(pricingConfig?.expressMultiplier || DEFAULT_PRICING_CONFIG.expressMultiplier) * 2;
      }
      const fuel = (baseRate * Number(pricingConfig?.fuelSurchargePct || DEFAULT_PRICING_CONFIG.fuelSurchargePct)) / 100;
      const gst = (baseRate * Number(pricingConfig?.gstPct || DEFAULT_PRICING_CONFIG.gstPct)) / 100;
      return Math.round(baseRate + fuel + gst);
  };

  const clearAllData = () => {
    setShipments([]);
    setUsers([]);
    setBranches([]);
    setVehicles([]);
    setStaff([]);
    setNotifications([]);
    setDismissedNotificationIds([]);
  };

  useEffect(() => {
    if (!currentUser) return;

    refreshUserNotifications(currentUser.userId || currentUser.id);
    const interval = setInterval(() => {
      refreshUserNotifications(currentUser.userId || currentUser.id);
    }, 20000);

    return () => clearInterval(interval);
  }, [currentUser?.userId, currentUser?.id, dismissedNotificationIds]);

  useEffect(() => {
    if (!currentUser) return;

    refreshShipments();
    const interval = setInterval(() => {
      refreshShipments();
    }, 10000);

    const onFocus = () => {
      refreshShipments();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [currentUser?.userId, currentUser?.id, currentUser?.role]);

  return (
    <ShipmentContext.Provider value={{
      shipments,
      currentUser,
      users,
      roleRequests,
      roleOverrides,
      branches,
      vehicles,
      staff,
      notifications,
      reportSummary,
      pricingConfig,
      lastDataSyncAt,
      isLoading,
      isRefreshing,
      login,
      logout,
      register,
      addShipment,
      updateShipmentStatus,
      assignShipmentToAgent,
      deleteShipment,
      deleteAllShipments,
      rateShipment,
      cancelShipment,
      getShipment,
      refreshShipments,
      refreshOperationalData,
      refreshPricingConfig,
      addBranch,
      removeBranch,
      updateBranch,
      addVehicle,
      updateVehicle,
      removeVehicle,
      updateBranchStatus,
      updateVehicleStatus,
      addStaff,
      removeStaff,
      updateStaff,
      updateProfile,
      requestRoleUpgrade,
      markRoleRequestPending,
      approveRoleRequest,
      rejectRoleRequest,
      cancelRoleRequest,
      updateUserRole,
      removeUserAccess,
      forgotPassword,
      verifyOtp,
      resetPassword,
      getSupportTickets,
      getAllSupportTickets,
      createSupportTicket,
      replySupportTicket,
      updateSupportTicketStatus,
      closeSupportTicket,
      deleteSupportTicket,
      refreshUserNotifications,
      getRoleNotifications,
      activeRole,
      switchActiveRole,
      dismissNotification,
      notifyAdminFromAgent,
      updatePricingConfig,
      calculateRate,
      clearAllData
    }}>
      {children}
    </ShipmentContext.Provider>
  );
}
