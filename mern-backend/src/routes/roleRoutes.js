import express from 'express';
import {
  createRequest,
  getPendingRequests,
  getMyRequestStatus,
  approveRequest,
  rejectRequest,
  cancelRequest
} from '../controllers/roleRequestController.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/requests', verifyToken, createRequest);
router.get('/requests/pending', verifyToken, requireAdmin, getPendingRequests);
router.get('/requests/status', verifyToken, getMyRequestStatus);
router.post('/requests/:requestId/approve', verifyToken, requireAdmin, approveRequest);
router.post('/requests/:requestId/reject', verifyToken, requireAdmin, rejectRequest);
router.delete('/requests/:requestId', verifyToken, cancelRequest);

export default router;
