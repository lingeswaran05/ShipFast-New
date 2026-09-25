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
    rcBookNumber: {
      type: String,
      default: ''
    },
    aadharNumber: {
      type: String,
      default: ''
    },
    bloodType: {
      type: String,
      default: ''
    },
    organDonor: {
      type: Boolean,
      default: false
    },
    bankAccountHolder: {
      type: String,
      default: ''
    },
    bankAccountNumber: {
      type: String,
      default: ''
    },
    bankIfsc: {
      type: String,
      default: ''
    },
    bankName: {
      type: String,
      default: ''
    },
    shiftTiming: {
      type: String,
      default: 'Day'
    },
    experience: {
      type: String,
      default: ''
    },
    profileImage: {
      type: String,
      default: null
    },
    aadharCopy: {
      type: String,
      default: null
    },
    licenseCopy: {
      type: String,
      default: null
    },
    rcBookCopy: {
      type: String,
      default: null
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
    averageRating: {
      type: Number,
      default: 5.0
    },
    ratingCount: {
      type: Number,
      default: 1
    },
    totalRatings: {
      type: Number,
      default: 1
    },
    totalDeliveries: {
      type: Number,
      default: 0
    },
    deliveredCount: {
      type: Number,
      default: 0
    },
    failedCount: {
      type: Number,
      default: 0
    },
    inTransitCount: {
      type: Number,
      default: 0
    },
    successRate: {
      type: Number,
      default: 100
    },
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED', 'INACTIVE', 'ACTIVE', 'CANCELLED'],
      default: 'PENDING',
      index: true
    },
    verificationStatus: {
      type: String,
      default: 'PENDING'
    },
    verificationNotes: {
      type: String,
      default: ''
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
    },
    availabilityStatus: {
      type: String,
      default: 'AVAILABLE'
    }
  },
  {
    timestamps: true
  }
);

AgentProfileSchema.methods.toDto = function () {
  const normStatus = this.verificationStatus || this.status || 'PENDING';
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
    rcBookNumber: this.rcBookNumber,
    aadharNumber: this.aadharNumber,
    bloodType: this.bloodType,
    organDonor: this.organDonor,
    bankAccountHolder: this.bankAccountHolder,
    bankAccountNumber: this.bankAccountNumber,
    bankIfsc: this.bankIfsc,
    bankName: this.bankName,
    shiftTiming: this.shiftTiming,
    experience: this.experience,
    profileImage: this.profileImage,
    profilePic: this.profileImage,
    aadharCopy: this.aadharCopy,
    licenseCopy: this.licenseCopy,
    rcBookCopy: this.rcBookCopy,
    hubId: this.hubId,
    assignedZone: this.assignedZone,
    rating: this.rating || this.averageRating || 5.0,
    averageRating: this.averageRating || this.rating || 5.0,
    ratingCount: this.ratingCount || this.totalRatings || 1,
    totalRatings: this.totalRatings || this.ratingCount || 1,
    totalDeliveries: this.totalDeliveries || this.deliveredCount || 0,
    deliveredCount: this.deliveredCount || this.totalDeliveries || 0,
    failedCount: this.failedCount || 0,
    inTransitCount: this.inTransitCount || 0,
    successRate: this.successRate || 100,
    status: this.status,
    verificationStatus: normStatus,
    verificationNotes: this.verificationNotes,
    verifiedAt: this.verifiedAt,
    verifiedBy: this.verifiedBy,
    rejectionReason: this.rejectionReason,
    isAvailable: this.isAvailable,
    availabilityStatus: this.availabilityStatus,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const AgentProfile = mongoose.models.AgentProfile || mongoose.model('AgentProfile', AgentProfileSchema);
