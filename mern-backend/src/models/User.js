import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    password: {
      type: String,
      required: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    doorAddress: {
      type: String,
      trim: true,
      default: ''
    },
    city: {
      type: String,
      trim: true,
      default: ''
    },
    state: {
      type: String,
      trim: true,
      default: ''
    },
    pincode: {
      type: String,
      trim: true,
      default: ''
    },
    role: {
      type: String,
      enum: ['CUSTOMER', 'DRIVER', 'AGENT', 'ADMIN', 'OPERATIONS', 'MANAGER', 'SORTER'],
      default: 'CUSTOMER',
      uppercase: true,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    profilePic: {
      type: String,
      default: null
    },
    profileImage: {
      type: String,
      default: null
    },
    refreshTokens: [
      {
        token: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    passwordResetOtp: {
      otp: { type: String, default: null },
      expiresAt: { type: Date, default: null }
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving if modified
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare plain password with hash
UserSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

// Return standard safe DTO
UserSchema.methods.toProfileDto = function () {
  return {
    id: this.userId,
    userId: this.userId,
    name: this.fullName,
    fullName: this.fullName,
    email: this.email,
    phone: this.phoneNumber,
    phoneNumber: this.phoneNumber,
    address: this.address,
    doorAddress: this.doorAddress,
    city: this.city,
    state: this.state,
    pincode: this.pincode,
    role: this.role,
    status: this.status,
    isActive: this.isActive,
    profilePic: this.profilePic || this.profileImage || null,
    profileImage: this.profileImage || this.profilePic || null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
