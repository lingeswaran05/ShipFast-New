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
    currentRole: {
      type: String,
      default: 'customer'
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
    },
    agentDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    documents: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

RoleRequestSchema.methods.toDto = function () {
  const details = this.agentDetails || {};
  const docs = this.documents || {};

  return {
    id: this.requestId,
    requestId: this.requestId,
    userId: this.userId,
    userEmail: this.userEmail,
    email: this.userEmail,
    userName: this.userName,
    name: this.userName,
    currentRole: this.currentRole || 'customer',
    requestedRole: this.requestedRole,
    reason: this.reason,
    status: this.status,
    reviewedBy: this.reviewedBy,
    reviewedAt: this.reviewedAt,
    comments: this.comments,
    rejectionReason: this.comments || '',
    phone: this.phone || details.phone || '',
    vehicleType: this.vehicleType || details.vehicleType || '',
    vehicleNumber: this.vehicleNumber || details.vehicleNumber || '',
    licenseNumber: this.licenseNumber || details.licenseNumber || '',
    experience: this.experience || details.experience || '',
    agentDetails: {
      licenseNumber: details.licenseNumber || this.licenseNumber || '',
      aadharNumber: details.aadharNumber || '',
      vehicleNumber: details.vehicleNumber || this.vehicleNumber || '',
      rcBookNumber: details.rcBookNumber || '',
      bloodType: details.bloodType || '',
      organDonor: Boolean(details.organDonor),
      bankAccountHolder: details.bankAccountHolder || '',
      bankAccountNumber: details.bankAccountNumber || '',
      bankIfsc: details.bankIfsc || '',
      bankName: details.bankName || '',
      shiftTiming: details.shiftTiming || 'Day',
      ...details
    },
    documents: {
      profilePhoto: docs.profilePhoto || null,
      aadharCopy: docs.aadharCopy || null,
      licenseCopy: docs.licenseCopy || null,
      rcBookCopy: docs.rcBookCopy || null,
      ...docs
    },
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const RoleRequest = mongoose.models.RoleRequest || mongoose.model('RoleRequest', RoleRequestSchema);
