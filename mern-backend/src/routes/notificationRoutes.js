import express from 'express';
import { sendNotification, getUserNotifications } from '../controllers/communicationsController.js';

const router = express.Router();

router.post('/send', sendNotification);
router.get('/:userId', getUserNotifications);

export default router;
