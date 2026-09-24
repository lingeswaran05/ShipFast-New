import express from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  getInternalUser,
  updateProfile,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
  getAllUsers,
  updateUserRole,
  deleteUser
} from '../controllers/authController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.put('/change-password', verifyToken, changePassword);

router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

router.get('/internal/users/:emailOrId', getInternalUser);

// Admin user management
router.get('/admin/users', verifyToken, requireAdmin, getAllUsers);
router.put(['/admin/users/:emailOrId/role', '/admin/users/:emailOrId/role/'], verifyToken, requireAdmin, updateUserRole);
router.delete('/admin/users/:emailOrId', verifyToken, requireAdmin, deleteUser);

export default router;
