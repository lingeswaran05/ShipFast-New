import axios from 'axios';
import { resolveServiceBaseUrls, toServiceBaseUrl, shouldRetryWithFallback } from './apiConfig';

const ADMIN_BASE_URLS = resolveServiceBaseUrls(import.meta.env.VITE_ADMIN_BASE_URL, {
  localDirectBase: 'http://localhost:8088'
})
  .map((base) => toServiceBaseUrl(base, '/api/admin'))
  .filter((value, index, list) => list.indexOf(value) === index);

const api = axios.create({
  baseURL: ADMIN_BASE_URLS[0],
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

let activeAdminBaseIndex = 0;
const setActiveAdminBase = (index) => {
  activeAdminBaseIndex = index;
  api.defaults.baseURL = ADMIN_BASE_URLS[index] || ADMIN_BASE_URLS[0];
};

const withAdminFallback = async (requestFactory, options = {}) => {
  const { retryOnFailure = true } = options;
  let lastError;
  for (let offset = 0; offset < ADMIN_BASE_URLS.length; offset += 1) {
    const index = (activeAdminBaseIndex + offset) % ADMIN_BASE_URLS.length;
    setActiveAdminBase(index);
    try {
      return await requestFactory(api);
    } catch (error) {
      lastError = error;
      const shouldRetry = retryOnFailure && shouldRetryWithFallback(error) && offset < ADMIN_BASE_URLS.length - 1;
      if (!shouldRetry) throw error;
    }
  }
  throw lastError;
};

const getPayload = (response) => response?.data?.data ?? response?.data ?? {};

const mapBranch = (branch = {}) => ({
  id: branch.branchId || branch.id,
  branchId: branch.branchId || branch.id,
  name: branch.name || 'Unnamed Branch',
  type: branch.type || 'Branch',
  location: branch.address || branch.location || '',
  state: branch.state || '',
  manager: branch.managerName || branch.manager || branch.managerUserId || '',
  managerUserId: branch.managerUserId || '',
  contact: branch.contact || '',
  description: branch.description || '',
  status: branch.status || 'Active',
  staffCount: Number(branch.staffCount || 0),
  stats: {
    staffCount: Number(branch.staffCount || 0),
    shipmentVolume: Number(branch.shipmentVolume || 0),
    revenue: Number(branch.revenue || 0),
    performanceScore: Number(branch.performanceScore || 0)
  }
});

const mapVehicle = (vehicle = {}) => ({
  id: vehicle.vehicleId || vehicle.id,
  vehicleId: vehicle.vehicleId || vehicle.id,
  number: vehicle.vehicleNumber || vehicle.number || '',
  vehicleNumber: vehicle.vehicleNumber || vehicle.number || '',
  type: vehicle.type || 'Van',
  capacity: vehicle.capacity || 0,
  driverUserId: vehicle.driverUserId || '',
  driverName: vehicle.driverName || '',
  driver: vehicle.driverName || vehicle.driverUserId || vehicle.driver || 'N/A',
  seats: Number(vehicle.seats || 0),
  rcBook: vehicle.rcBook || '',
  photo: vehicle.photo || null,
  status: vehicle.status || 'Available'
});

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback
);

export const adminService = {
  async createBranch(branchData) {
    try {
      const response = await withAdminFallback((client) => client.post('/branches', {
        name: branchData.name,
        type: branchData.type,
        address: branchData.location || branchData.address || '',
        state: branchData.state || '',
        managerName: branchData.manager || branchData.managerName || '',
        managerUserId: branchData.managerUserId || '',
        contact: branchData.contact || '',
        staffCount: Number(branchData.staffCount || 0),
        status: branchData.status || 'Active',
        description: branchData.description || ''
      }));
      return mapBranch(getPayload(response));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to create branch'));
    }
  },

  async getBranches() {
    try {
      const response = await withAdminFallback((client) => client.get('/branches'));
      const payload = getPayload(response);
      const list = Array.isArray(payload) ? payload : payload.content || [];
      return list.map(mapBranch);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load branches'));
    }
  },

  async updateBranch(branchId, branchData) {
    try {
      const response = await withAdminFallback((client) => client.put(`/branches/${encodeURIComponent(branchId)}`, {
        name: branchData.name,
        type: branchData.type,
        address: branchData.location ?? branchData.address,
        state: branchData.state,
        managerName: branchData.manager ?? branchData.managerName,
        managerUserId: branchData.managerUserId,
        contact: branchData.contact,
        staffCount:
          branchData.staffCount === undefined || branchData.staffCount === null
            ? undefined
            : Number(branchData.staffCount),
        status: branchData.status,
        description: branchData.description
      }));
      return mapBranch(getPayload(response));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to update branch'));
    }
  },

  async updateBranchStatus(branchId, status) {
    const branches = await this.getBranches();
    const current = branches.find((branch) => branch.id === branchId || branch.branchId === branchId) || {};
    return this.updateBranch(branchId, { ...current, status });
  },

  async deleteBranch(branchId) {
    try {
      await withAdminFallback((client) => client.delete(`/branches/${encodeURIComponent(branchId)}`));
      return true;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to delete branch'));
    }
  },

  async createVehicle(vehicleData) {
    try {
      const response = await withAdminFallback((client) => client.post('/vehicles', {
        vehicleNumber: vehicleData.number || vehicleData.vehicleNumber,
        type: vehicleData.type || 'Van',
        driverUserId: vehicleData.driverUserId || vehicleData.driver || '',
        driverName: vehicleData.driverName || '',
        seats: Number(vehicleData.seats || 0),
        rcBook: vehicleData.rcBook || '',
        photo: vehicleData.photo || null,
        status: vehicleData.status || 'Available'
      }));
      return mapVehicle(getPayload(response));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to create vehicle'));
    }
  },

  async getVehicles() {
    try {
      const response = await withAdminFallback((client) => client.get('/vehicles'));
      const payload = getPayload(response);
      const list = Array.isArray(payload) ? payload : payload.content || [];
      return list.map(mapVehicle);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load vehicles'));
    }
  },

  async updateVehicle(vehicleId, vehicleData) {
    try {
      const response = await withAdminFallback((client) => client.put(`/vehicles/${encodeURIComponent(vehicleId)}`, {
        vehicleNumber: vehicleData.number ?? vehicleData.vehicleNumber,
        type: vehicleData.type,
        driverUserId: vehicleData.driverUserId ?? vehicleData.driver,
        driverName: vehicleData.driverName,
        seats:
          vehicleData.seats === undefined || vehicleData.seats === null
            ? undefined
            : Number(vehicleData.seats),
        rcBook: vehicleData.rcBook,
        photo: vehicleData.photo,
        status: vehicleData.status
      }));
      return mapVehicle(getPayload(response));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to update vehicle'));
    }
  },

  async updateVehicleStatus(vehicleId, status) {
    const vehicles = await this.getVehicles();
    const current = vehicles.find((vehicle) => vehicle.id === vehicleId || vehicle.vehicleId === vehicleId) || {};
    return this.updateVehicle(vehicleId, { ...current, status });
  },

  async deleteVehicle(vehicleId) {
    try {
      await withAdminFallback((client) => client.delete(`/vehicles/${encodeURIComponent(vehicleId)}`));
      return true;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to delete vehicle'));
    }
  }
};
