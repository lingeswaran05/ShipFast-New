import express from 'express';
import {
  createAgent,
  getAllAgents,
  getAgentByIdentifier,
  getAgentProfileByUserId,
  upsertAgentProfile,
  verifyAgentProfile,
  checkAgentRequestStatus,
  deleteAgentProfile,
  recordAgentRating,
  createRunSheet,
  getRunSheetsByAgent,
  scanShipment,
  recordCash,
  verifyCash,
  generateInvoice
} from '../controllers/operationsController.js';

const router = express.Router();

router.post('/agents', createAgent);
router.get('/agents', getAllAgents);
router.get('/agents/:agentIdentifier', getAgentByIdentifier);
router.get('/agents/profile/:userId', getAgentProfileByUserId);
router.put('/agents/profile/:userId', upsertAgentProfile);
router.put('/agents/profile/:userId/verify', verifyAgentProfile);
router.get('/agents/profile/:userId/request-status', checkAgentRequestStatus);
router.delete('/agents/profile/:userId', deleteAgentProfile);
router.post('/agents/:agentIdentifier/rating', recordAgentRating);

router.post('/runsheet', createRunSheet);
router.get('/runsheet/:agentId', getRunSheetsByAgent);
router.post('/runsheets', (req, res, next) => {
  req.body.agentId = req.query.agentId || req.body.agentId;
  req.body.hubId = req.query.hubId || req.body.hubId;
  req.body.shipmentTrackingNumbers = Array.isArray(req.body) ? req.body : req.body.shipmentIds || [];
  return createRunSheet(req, res, next);
});
router.get('/runsheets/:agentId', getRunSheetsByAgent);

router.post('/scan', scanShipment);
router.post('/cash', recordCash);
router.put('/cash/:id/verify', verifyCash);
router.post('/invoice', generateInvoice);

export default router;
