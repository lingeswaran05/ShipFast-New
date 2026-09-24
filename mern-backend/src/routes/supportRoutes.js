import express from 'express';
import {
  createTicket,
  getUserTickets,
  getAllTickets,
  getTicketById,
  replyTicket,
  updateTicketStatus,
  closeTicket,
  deleteTicket
} from '../controllers/communicationsController.js';

const router = express.Router();

router.post('/create', createTicket);
router.get('/user/:userId', getUserTickets);
router.get('/', getAllTickets);
router.get('/:id', getTicketById);
router.put('/:id/reply', replyTicket);
router.put('/:id/status', updateTicketStatus);
router.put('/close/:id', closeTicket);
router.delete('/:id', deleteTicket);

export default router;
