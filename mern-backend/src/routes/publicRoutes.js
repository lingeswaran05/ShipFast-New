import express from 'express';
import { publicTrackHistory } from '../controllers/shipmentController.js';

const router = express.Router();

router.get('/track/:trackingNumber', publicTrackHistory);

export default router;
