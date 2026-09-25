import bcrypt from 'bcryptjs';
import { createModel } from '../db/mongo.js';

const UserMethods = {
  comparePassword: async function (plainPassword) {
    if (!this.password || !plainPassword) return false;
    return bcrypt.compare(plainPassword, this.password);
  },
  toProfileDto: function () {
    return {
      id: this.userId,
      userId: this.userId,
      name: this.fullName,
      fullName: this.fullName,
      email: this.email,
      phone: this.phoneNumber || '',
      phoneNumber: this.phoneNumber || '',
      address: this.address || '',
      doorAddress: this.doorAddress || '',
      city: this.city || '',
      state: this.state || '',
      pincode: this.pincode || '',
      role: this.role || 'CUSTOMER',
      status: this.status || 'active',
      isActive: this.isActive !== false,
      profilePic: this.profilePic || this.profileImage || null,
      profileImage: this.profileImage || this.profilePic || null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
};

const UserDefaults = {
  role: 'CUSTOMER',
  status: 'active',
  isActive: true,
  phoneNumber: '',
  address: '',
  doorAddress: '',
  city: '',
  state: '',
  pincode: '',
  profilePic: null,
  profileImage: null,
  refreshTokens: [],
  passwordResetOtp: { otp: null, expiresAt: null }
};

export const User = createModel('users', UserMethods, UserDefaults);
