import { createModel } from '../db/mongo.js';

const RunSheetMethods = {
  toDto: function () {
    return {
      id: this.runSheetId,
      runSheetId: this.runSheetId,
      agentId: this.agentId,
      hubId: this.hubId,
      shipmentTrackingNumbers: this.shipmentTrackingNumbers || [],
      shipmentIds: this.shipmentIds || this.shipmentTrackingNumbers || [],
      status: this.status || 'CREATED',
      date: this.date || this.createdAt,
      completedAt: this.completedAt || null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
};

const RunSheetDefaults = {
  shipmentTrackingNumbers: [],
  shipmentIds: [],
  status: 'CREATED',
  date: null,
  completedAt: null
};

export const RunSheet = createModel('runsheets', RunSheetMethods, RunSheetDefaults);
