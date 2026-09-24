import express from 'express';
import { generateSummary, exportShipmentsCsv } from '../controllers/reportingController.js';

const router = express.Router();

router.get('/summary', generateSummary);
router.get('/export/shipments.csv', exportShipmentsCsv);

export default router;
