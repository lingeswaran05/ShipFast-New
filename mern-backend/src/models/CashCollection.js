import mongoose from 'mongoose';

const CashCollectionSchema = new mongoose.Schema(
  {
    collectionId: {
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
    shipmentTrackingNumber: {
      type: String,
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true
    },
    paymentMode: {
      type: String,
      enum: ['CASH', 'UPI', 'CARD', 'ONLINE'],
      default: 'CASH'
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    collectedAt: {
      type: Date,
      default: Date.now
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    verifiedBy: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

CashCollectionSchema.methods.toDto = function () {
  return {
    id: this.collectionId,
    collectionId: this.collectionId,
    agentId: this.agentId,
    shipmentTrackingNumber: this.shipmentTrackingNumber,
    amount: this.amount,
    paymentMode: this.paymentMode,
    isVerified: this.isVerified,
    collectedAt: this.collectedAt,
    verifiedAt: this.verifiedAt,
    verifiedBy: this.verifiedBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const CashCollection = mongoose.models?.CashCollection || mongoose.model('CashCollection', CashCollectionSchema);
