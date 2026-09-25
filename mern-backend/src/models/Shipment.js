import { createModel } from '../db/mongo.js';

const ShipmentMethods = {
  toDto: function () {
    return {
      id: this.id || this.shipmentId || this.trackingNumber || this._id?.toString() || '',
      shipmentId: this.id || this.shipmentId || this.trackingNumber || this._id?.toString() || '',
      trackingNumber: this.trackingNumber || this.id || '',
      trackingId: this.trackingNumber || this.id || '',
      customerId: this.customerId || '',
      branchId: this.branchId || '',
      status: this.status || 'Booked',
      serviceType: this.serviceType || 'Standard',
      paymentMethod: this.paymentMethod || 'ONLINE',
      paymentStatus: this.paymentStatus || 'SUCCESS',
      paymentCollectedAt: this.paymentCollectedAt || null,
      cost: Number(this.cost || 0),
      estimatedDelivery: this.estimatedDelivery || null,
      deliveredAt: this.deliveredAt || null,
      deliveredBy: this.deliveredBy || null,
      deliveredByAgentId: this.deliveredByAgentId || null,
      assignedAgentId: this.assignedAgentId || null,
      runSheetId: this.runSheetId || null,
      proofOfDeliveryImage: this.proofOfDeliveryImage || null,
      rating: this.rating != null ? Number(this.rating) : null,
      ratingComment: this.ratingComment || '',
      sender: this.sender || {},
      recipient: this.recipient || {},
      packageDetails: this.packageDetails || {},
      history: Array.isArray(this.history) ? this.history : [],
      createdAt: this.createdAt || new Date(),
      updatedAt: this.updatedAt || new Date()
    };
  }
};

const ShipmentDefaults = {
  customerId: '',
  branchId: '',
  status: 'Booked',
  serviceType: 'Standard',
  paymentMethod: 'ONLINE',
  paymentStatus: 'SUCCESS',
  paymentCollectedAt: null,
  cost: 0,
  estimatedDelivery: null,
  deliveredAt: null,
  deliveredBy: null,
  deliveredByAgentId: null,
  assignedAgentId: null,
  runSheetId: null,
  proofOfDeliveryImage: null,
  rating: null,
  ratingComment: '',
  sender: {},
  recipient: {},
  packageDetails: {},
  history: []
};

export const Shipment = createModel('shipments', ShipmentMethods, ShipmentDefaults);
