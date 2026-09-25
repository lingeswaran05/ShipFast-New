import { createModel } from '../db/mongo.js';

const BranchMethods = {
  toDto: function () {
    return {
      id: this.branchId,
      branchId: this.branchId,
      name: this.name,
      type: this.type || 'Branch',
      location: this.address || this.location || '',
      address: this.address || this.location || '',
      state: this.state || '',
      manager: this.managerName || this.managerUserId || '',
      managerName: this.managerName || '',
      managerUserId: this.managerUserId || '',
      contact: this.contact || '',
      staffCount: this.staffCount || 0,
      shipmentVolume: this.shipmentVolume || 0,
      revenue: this.revenue || 0,
      performanceScore: this.performanceScore || 100,
      status: this.status || 'Active',
      description: this.description || '',
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
};

const BranchDefaults = {
  type: 'Branch',
  address: '',
  location: '',
  state: '',
  managerName: '',
  managerUserId: '',
  contact: '',
  staffCount: 0,
  shipmentVolume: 0,
  revenue: 0,
  performanceScore: 100,
  status: 'Active',
  description: ''
};

export const Branch = createModel('branches', BranchMethods, BranchDefaults);
