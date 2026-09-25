import mongoose from 'mongoose';

const RunSheetSchema = new mongoose.Schema(
  {
    runSheetId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    agentId: {
      type: String,
      required: true,
      index: true
    },
    hubId: {
      type: String,
      required: true,
      index: true
    },
    shipmentTrackingNumbers: [
      {
        type: String
      }
    ],
    shipmentIds: [
      {
        type: String
      }
    ],
    status: {
      type: String,
      enum: ['CREATED', 'IN_PROGRESS', 'COMPLETED'],
      default: 'CREATED'
    },
    date: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

RunSheetSchema.methods.toDto = function () {
  return {
    id: this.runSheetId,
    runSheetId: this.runSheetId,
    agentId: this.agentId,
    hubId: this.hubId,
    shipmentTrackingNumbers: this.shipmentTrackingNumbers,
    shipmentIds: this.shipmentIds || this.shipmentTrackingNumbers,
    status: this.status,
    date: this.date,
    completedAt: this.completedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const RunSheet = mongoose.models?.RunSheet || mongoose.model('RunSheet', RunSheetSchema);
