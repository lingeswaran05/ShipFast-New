import { createModel } from '../db/mongo.js';

const RoleRequestMethods = {
  toDto: function () {
    return {
      id: this.requestId,
      requestId: this.requestId,
      userId: this.userId,
      userEmail: this.userEmail || '',
      userName: this.userName || '',
      requestedRole: this.requestedRole,
      reason: this.reason || '',
      status: this.status || 'PENDING',
      reviewedBy: this.reviewedBy || null,
      reviewedAt: this.reviewedAt || null,
      comments: this.comments || '',
      phone: this.phone || '',
      vehicleType: this.vehicleType || '',
      vehicleNumber: this.vehicleNumber || '',
      licenseNumber: this.licenseNumber || '',
      experience: this.experience || '',
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
};

const RoleRequestDefaults = {
  userEmail: '',
  userName: '',
  reason: '',
  status: 'PENDING',
  reviewedBy: null,
  reviewedAt: null,
  comments: '',
  phone: '',
  vehicleType: '',
  vehicleNumber: '',
  licenseNumber: '',
  experience: ''
};

export const RoleRequest = createModel('rolerequests', RoleRequestMethods, RoleRequestDefaults);
