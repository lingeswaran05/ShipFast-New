import { createModel } from '../db/mongo.js';

const AgentProfileMethods = {
  toDto: function () {
    return {
      id: this.agentId || this.userId,
      agentId: this.agentId || this.userId,
      userId: this.userId,
      name: this.fullName,
      fullName: this.fullName,
      email: this.email || '',
      phone: this.phoneNumber || '',
      phoneNumber: this.phoneNumber || '',
      address: this.address || '',
      city: this.city || '',
      state: this.state || '',
      pincode: this.pincode || '',
      vehicleType: this.vehicleType || 'Bike',
      vehicleNumber: this.vehicleNumber || '',
      licenseNumber: this.licenseNumber || '',
      experience: this.experience || '',
      hubId: this.hubId || '',
      assignedZone: this.assignedZone || '',
      rating: this.rating || 5.0,
      ratingCount: this.ratingCount || 1,
      totalDeliveries: this.totalDeliveries || 0,
      status: this.status || 'PENDING',
      verifiedAt: this.verifiedAt || null,
      verifiedBy: this.verifiedBy || null,
      rejectionReason: this.rejectionReason || '',
      isAvailable: this.isAvailable !== false,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
};

const AgentProfileDefaults = {
  agentId: '',
  fullName: '',
  email: '',
  phoneNumber: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  vehicleType: 'Bike',
  vehicleNumber: '',
  licenseNumber: '',
  experience: '',
  hubId: '',
  assignedZone: '',
  rating: 5.0,
  ratingCount: 1,
  totalDeliveries: 0,
  status: 'PENDING',
  verifiedAt: null,
  verifiedBy: null,
  rejectionReason: '',
  isAvailable: true
};

export const AgentProfile = createModel('agentprofiles', AgentProfileMethods, AgentProfileDefaults);
