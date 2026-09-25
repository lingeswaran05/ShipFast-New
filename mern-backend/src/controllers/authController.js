import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { generateUserId } from '../utils/idGenerators.js';
import { generateOtp, getOtpExpiry } from '../utils/otpGenerator.js';
import { sendOtpEmail } from '../services/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'c2hpcGZhc3Qtc2VjcmV0LWtleS1zaGlwZmFzdC1rZXk=';
const JWT_EXPIRATION = parseInt(process.env.JWT_EXPIRATION || '3600000', 10);
const REFRESH_EXPIRATION_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRATION_DAYS || '7', 10);

const createToken = (user) => {
  return jwt.sign(
    {
      sub: user.email,
      userId: user.userId,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: Math.floor(JWT_EXPIRATION / 1000) }
  );
};

const createRefreshToken = () => {
  return jwt.sign({ timestamp: Date.now() }, JWT_SECRET, { expiresIn: `${REFRESH_EXPIRATION_DAYS}d` });
};

export const register = async (req, res, next) => {
  try {
    const { name, fullName, email, password, phoneNumber, address, doorAddress, city, state, pincode, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: 'Email and password are required.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      return res.status(400).json({
        status: false,
        message: 'Email is already registered.'
      });
    }

    const userId = generateUserId();
    const userRole = role ? String(role).toUpperCase() : 'CUSTOMER';

    const user = new User({
      userId,
      email: normalizedEmail,
      password,
      fullName: fullName || name || normalizedEmail.split('@')[0],
      phoneNumber: phoneNumber || '',
      address: address || doorAddress || '',
      doorAddress: doorAddress || address || '',
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      role: userRole,
      status: 'active',
      isActive: true
    });

    const accessToken = createToken(user);
    const refreshToken = createRefreshToken();

    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000)
    });

    await user.save();

    const profile = user.toProfileDto();

    return res.status(200).json({
      status: true,
      message: 'Registration successful',
      data: {
        accessToken,
        token: accessToken,
        refreshToken,
        user: profile,
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: 'Email and password are required.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: normalizedEmail }, { userId: normalizedEmail }]
    });

    if (!user) {
      return res.status(401).json({
        status: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: false,
        message: 'Invalid email or password.'
      });
    }

    const accessToken = createToken(user);
    const refreshToken = createRefreshToken();

    // Clean expired tokens & save new one
    user.refreshTokens = (user.refreshTokens || []).filter(
      (t) => t.expiresAt && new Date(t.expiresAt) > new Date()
    );
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000)
    });

    await user.save();

    const profile = user.toProfileDto();

    return res.status(200).json({
      status: true,
      message: 'Login successful',
      data: {
        accessToken,
        token: accessToken,
        refreshToken,
        user: profile,
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: incomingToken } = req.body;

    if (!incomingToken) {
      return res.status(400).json({
        status: false,
        message: 'Refresh token is required.'
      });
    }

    try {
      jwt.verify(incomingToken, JWT_SECRET);
    } catch {
      return res.status(401).json({
        status: false,
        message: 'Invalid or expired refresh token.'
      });
    }

    const user = await User.findOne({
      'refreshTokens.token': incomingToken
    });

    if (!user) {
      return res.status(401).json({
        status: false,
        message: 'Invalid refresh token.'
      });
    }

    const newAccessToken = createToken(user);
    const newRefreshToken = createRefreshToken();

    user.refreshTokens = user.refreshTokens.filter((t) => t.token !== incomingToken);
    user.refreshTokens.push({
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRATION_DAYS * 24 * 60 * 60 * 1000)
    });

    await user.save();

    const profile = user.toProfileDto();

    return res.status(200).json({
      status: true,
      message: 'Token refreshed',
      data: {
        accessToken: newAccessToken,
        token: newAccessToken,
        refreshToken: newRefreshToken,
        user: profile,
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { refreshToken: incomingToken } = req.body;
    if (incomingToken) {
      await User.updateOne(
        { 'refreshTokens.token': incomingToken },
        { $pull: { refreshTokens: { token: incomingToken } } }
      );
    }
    return res.status(200).json({
      status: true,
      message: 'Logged out successfully',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: false, message: 'Authentication required' });
    }
    return res.status(200).json({
      status: true,
      message: 'Profile fetched successfully',
      data: req.user.toProfileDto()
    });
  } catch (error) {
    next(error);
  }
};

export const getInternalUser = async (req, res, next) => {
  try {
    const { emailOrId } = req.params;
    const normalized = String(emailOrId || '').trim();
    const user = await User.findOne({
      $or: [{ email: normalized.toLowerCase() }, { userId: normalized }]
    });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      status: true,
      message: 'User fetched successfully',
      data: user.toProfileDto()
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ status: false, message: 'Authentication required' });
    }

    const { fullName, name, phoneNumber, address, doorAddress, city, state, pincode, profilePic, profileImage } = req.body;

    if (fullName || name) user.fullName = fullName || name;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (address !== undefined) user.address = address;
    if (doorAddress !== undefined) user.doorAddress = doorAddress;
    if (city !== undefined) user.city = city;
    if (state !== undefined) user.state = state;
    if (pincode !== undefined) user.pincode = pincode;
    if (profilePic !== undefined) user.profilePic = profilePic;
    if (profileImage !== undefined) user.profileImage = profileImage;

    await user.save();

    return res.status(200).json({
      status: true,
      message: 'Profile updated successfully',
      data: user.toProfileDto()
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const user = req.user;
    const { oldPassword, currentPassword, newPassword } = req.body;
    const current = oldPassword || currentPassword;

    if (!current || !newPassword) {
      return res.status(400).json({
        status: false,
        message: 'Current password and new password are required.'
      });
    }

    const isMatch = await user.comparePassword(current);
    if (!isMatch) {
      return res.status(400).json({
        status: false,
        message: 'Current password does not match.'
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      status: true,
      message: 'Password changed successfully',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: false, message: 'Email is required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: 'User with this email not found.'
      });
    }

    const otp = generateOtp();
    user.passwordResetOtp = {
      otp,
      expiresAt: getOtpExpiry(15)
    };

    await user.save();
    await sendOtpEmail(normalizedEmail, otp);

    return res.status(200).json({
      status: true,
      message: 'OTP sent successfully',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ status: false, message: 'Email and OTP are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !user.passwordResetOtp?.otp) {
      return res.status(400).json({ status: false, message: 'Invalid or expired OTP' });
    }

    if (user.passwordResetOtp.otp !== String(otp).trim()) {
      return res.status(400).json({ status: false, message: 'Incorrect OTP' });
    }

    if (new Date() > new Date(user.passwordResetOtp.expiresAt)) {
      return res.status(400).json({ status: false, message: 'OTP has expired' });
    }

    return res.status(200).json({
      status: true,
      message: 'OTP verified successfully',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword, password } = req.body;
    const finalPassword = newPassword || password;

    if (!email || !finalPassword) {
      return res.status(400).json({ status: false, message: 'Email and new password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    user.password = finalPassword;
    user.passwordResetOtp = { otp: null, expiresAt: null };
    await user.save();

    return res.status(200).json({
      status: true,
      message: 'Password reset successfully',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    return res.status(200).json({
      status: true,
      message: 'Users fetched successfully',
      data: users.map((u) => u.toProfileDto())
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { emailOrId } = req.params;
    const role = req.body.role || req.query.role;

    if (!role) {
      return res.status(400).json({ status: false, message: 'Role is required' });
    }

    const normalized = String(emailOrId || '').trim();
    const user = await User.findOne({
      $or: [{ email: normalized.toLowerCase() }, { userId: normalized }]
    });

    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    user.role = String(role).toUpperCase();
    await user.save();

    return res.status(200).json({
      status: true,
      message: 'User role updated successfully',
      data: user.toProfileDto()
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { emailOrId } = req.params;
    const normalized = String(emailOrId || '').trim();
    const result = await User.deleteOne({
      $or: [{ email: normalized.toLowerCase() }, { userId: normalized }]
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    return res.status(200).json({
      status: true,
      message: 'User deleted successfully',
      data: null
    });
  } catch (error) {
    next(error);
  }
};
