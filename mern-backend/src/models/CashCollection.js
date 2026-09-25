import { createModel } from '../db/mongo.js';

const CashCollectionMethods = {
  toDto: function () {
    return {
      id: this.collectionId,
      collectionId: this.collectionId,
      agentId: this.agentId,
      shipmentTrackingNumber: this.shipmentTrackingNumber,
      amount: this.amount,
      paymentMode: this.paymentMode || 'CASH',
      isVerified: this.isVerified === true,
      collectedAt: this.collectedAt || this.createdAt,
      verifiedAt: this.verifiedAt || null,
      verifiedBy: this.verifiedBy || null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
};

const CashCollectionDefaults = {
  paymentMode: 'CASH',
  isVerified: false,
  verifiedAt: null,
  verifiedBy: null
};

export const CashCollection = createModel('cashcollections', CashCollectionMethods, CashCollectionDefaults);
