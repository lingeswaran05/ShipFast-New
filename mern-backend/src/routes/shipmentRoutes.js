import express from 'express';
import {
  createShipment,
  getAllShipments,
  getMine,
  getByTrackingNumber,
  getById,
  updateShipment,
  deleteShipment,
  updateStatus,
  assignShipment,
  addRating,
  calculateRate,
  getPricingConfig,
  updatePricingConfig
} from '../controllers/shipmentController.js';
import { optionalAuth, verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/', optionalAuth, createShipment);
router.get('/', getAllShipments);
router.get('/mine', optionalAuth, getMine);
router.get('/track/:trackingNumber', getByTrackingNumber);
router.post('/calculate-rate', calculateRate);
router.get('/pricing-config', getPricingConfig);
router.put('/pricing-config', updatePricingConfig);

router.get('/:shipmentId', getById);
router.put('/:shipmentId', updateShipment);
router.delete('/:shipmentId', deleteShipment);
router.patch('/:shipmentId/status', optionalAuth, updateStatus);
router.patch('/:shipmentId/assign', assignShipment);
router.post('/:shipmentId/assign', assignShipment);
router.post('/:shipmentId/rating', addRating);

export default router;
