import mongoose from 'mongoose';

const BranchSchema = new mongoose.Schema(
  {
    branchId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      default: 'Branch'
    },
    address: {
      type: String,
      default: ''
    },
    location: {
      type: String,
      default: ''
    },
    state: {
      type: String,
      default: ''
    },
    managerName: {
      type: String,
      default: ''
    },
    managerUserId: {
      type: String,
      default: ''
    },
    contact: {
      type: String,
      default: ''
    },
    staffCount: {
      type: Number,
      default: 0
    },
    shipmentVolume: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    },
    performanceScore: {
      type: Number,
      default: 100
    },
    status: {
      type: String,
      default: 'Active'
    },
    description: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

BranchSchema.methods.toDto = function () {
  return {
    id: this.branchId,
    branchId: this.branchId,
    name: this.name,
    type: this.type,
    location: this.address || this.location,
    address: this.address || this.location,
    state: this.state,
    manager: this.managerName || this.managerUserId,
    managerName: this.managerName,
    managerUserId: this.managerUserId,
    contact: this.contact,
    staffCount: this.staffCount,
    shipmentVolume: this.shipmentVolume,
    revenue: this.revenue,
    performanceScore: this.performanceScore,
    status: this.status,
    description: this.description,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const Branch = mongoose.models.Branch || mongoose.model('Branch', BranchSchema);
