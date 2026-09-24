import mongoose from 'mongoose';

const AgentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    agentId: {
      type: String,
      index: true
    },
    fullName: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: ''
    },
    state: {
      type: String,
      default: ''
    },
    pincode: {
      type: String,
      default: ''
    },
    vehicleType: {
      type: String,
      default: 'Bike'
    },
    vehicleNumber: {
      type: String,
      default: ''
    },
    licenseNumber: {
      type: String,
      default: ''
    },
    experience: {
      type: String,
      default: ''
    },
    hubId: {
      type: String,
      default: ''
    },
    assignedZone: {
      type: String,
      default: ''
    },
    rating: {
      type: Number,
      default: 5.0
    },
    ratingCount: {
      type: Number,
      default: 1
    },
    totalDeliveries: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED', 'INACTIVE', 'ACTIVE'],
      default: 'PENDING',
      index: true
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    verifiedBy: {
      type: String,
      default: null
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    isAvailable: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

AgentProfileSchema.methods.toDto = function () {
  return {
    id: this.agentId || this.userId,
    agentId: this.agentId || this.userId,
    userId: this.userId,
    name: this.fullName,
    fullName: this.fullName,
    email: this.email,
    phone: this.phoneNumber,
    phoneNumber: this.phoneNumber,
    address: this.address,
    city: this.city,
    state: this.state,
    pincode: this.pincode,
    vehicleType: this.vehicleType,
    vehicleNumber: this.vehicleNumber,
    licenseNumber: this.licenseNumber,
    experience: this.experience,
    hubId: this.hubId,
    assignedZone: this.assignedZone,
    rating: this.rating,
    ratingCount: this.ratingCount,
    totalDeliveries: this.totalDeliveries,
    status: this.status,
    verifiedAt: this.verifiedAt,
    verifiedBy: this.verifiedBy,
    rejectionReason: this.rejectionReason,
    isAvailable: this.isAvailable,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const AgentProfile = mongoose.models.AgentProfile || mongoose.model('AgentProfile', AgentProfileSchema);
