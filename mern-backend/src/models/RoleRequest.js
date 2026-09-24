import mongoose from 'mongoose';

const RoleRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    userEmail: {
      type: String,
      lowercase: true,
      trim: true
    },
    userName: {
      type: String,
      trim: true
    },
    requestedRole: {
      type: String,
      required: true,
      uppercase: true
    },
    reason: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
      index: true
    },
    reviewedBy: {
      type: String,
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    comments: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    vehicleType: {
      type: String,
      default: ''
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
    }
  },
  {
    timestamps: true
  }
);

RoleRequestSchema.methods.toDto = function () {
  return {
    id: this.requestId,
    requestId: this.requestId,
    userId: this.userId,
    userEmail: this.userEmail,
    userName: this.userName,
    requestedRole: this.requestedRole,
    reason: this.reason,
    status: this.status,
    reviewedBy: this.reviewedBy,
    reviewedAt: this.reviewedAt,
    comments: this.comments,
    phone: this.phone,
    vehicleType: this.vehicleType,
    vehicleNumber: this.vehicleNumber,
    licenseNumber: this.licenseNumber,
    experience: this.experience,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const RoleRequest = mongoose.models.RoleRequest || mongoose.model('RoleRequest', RoleRequestSchema);
