import { Notification } from '../models/Notification.js';
import { SupportTicket } from '../models/SupportTicket.js';
import { generateNotificationId, generateTicketId, generateMessageId } from '../utils/idGenerators.js';

export const sendNotification = async (req, res, next) => {
  try {
    const userId = req.query.userId || req.body.userId;
    const type = req.query.type || req.body.type || 'INFO';
    const message = req.query.message || req.body.message;
    const role = req.query.role || req.body.role;

    if (!userId || !message) {
      return res.status(400).json({ status: false, message: 'userId and message are required' });
    }

    const notification = new Notification({
      notificationId: generateNotificationId(),
      userId,
      type,
      message,
      status: 'SENT',
      isRead: false,
      role
    });

    await notification.save();

    return res.status(200).json({
      status: true,
      message: 'Notification sent successfully',
      data: notification.toDto()
    });
  } catch (error) {
    next(error);
  }
};

export const getUserNotifications = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(200);

    return res.status(200).json({
      status: true,
      message: 'Notifications fetched',
      data: notifications.map((n) => n.toDto())
    });
  } catch (error) {
    next(error);
  }
};

export const createTicket = async (req, res, next) => {
  try {
    const { userId, subject, description, message, category, priority, senderName, senderRole } = req.body;

    if (!userId) {
      return res.status(400).json({ status: false, message: 'userId is required' });
    }

    const ticketId = generateTicketId();
    const desc = description || message || '';
    const now = new Date();

    const initialMessage = {
      messageId: generateMessageId(),
      senderId: userId,
      senderName: senderName || 'Customer',
      senderRole: senderRole || 'customer',
      message: desc,
      createdAt: now
    };

    const ticket = new SupportTicket({
      ticketId,
      userId,
      subject: subject || 'Support Ticket',
      description: desc,
      category: category || 'General',
      priority: priority || 'Medium',
      status: 'OPEN',
      assignedToRole: 'ADMIN',
      messages: [initialMessage]
    });

    await ticket.save();

    return res.status(200).json({
      status: true,
      message: 'Ticket created successfully',
      data: ticket.toDto()
    });
  } catch (error) {
    next(error);
  }
};

export const getUserTickets = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const tickets = await SupportTicket.find({ userId }).sort({ updatedAt: -1 });

    return res.status(200).json({
      status: true,
      message: 'Tickets fetched',
      data: tickets.map((t) => t.toDto())
    });
  } catch (error) {
    next(error);
  }
};

export const getAllTickets = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) {
      filter.status = new RegExp(`^${status.replace(/_/g, ' ')}$`, 'i');
    }

    const tickets = await SupportTicket.find(filter).sort({ updatedAt: -1 });

    return res.status(200).json({
      status: true,
      message: 'Tickets fetched',
      data: tickets.map((t) => t.toDto())
    });
  } catch (error) {
    next(error);
  }
};

export const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findOne({
      $or: [{ ticketId: id }, { _id: id }]
    });

    if (!ticket) {
      return res.status(404).json({ status: false, message: 'Ticket not found' });
    }

    return res.status(200).json({
      status: true,
      message: 'Ticket fetched',
      data: ticket.toDto()
    });
  } catch (error) {
    next(error);
  }
};

export const replyTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { senderId, senderName, senderRole, message } = req.body;

    if (!message) {
      return res.status(400).json({ status: false, message: 'Reply message is required' });
    }

    const ticket = await SupportTicket.findOne({
      $or: [{ ticketId: id }, { _id: id }]
    });

    if (!ticket) {
      return res.status(404).json({ status: false, message: 'Ticket not found' });
    }

    ticket.messages.push({
      messageId: generateMessageId(),
      senderId: senderId || req.userId || 'Support',
      senderName: senderName || req.user?.fullName || 'Support',
      senderRole: senderRole || req.userRole || 'admin',
      message: message.trim(),
      createdAt: new Date()
    });

    if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
      ticket.status = 'OPEN';
    }

    await ticket.save();

    return res.status(200).json({
      status: true,
      message: 'Reply added successfully',
      data: ticket.toDto()
    });
  } catch (error) {
    next(error);
  }
};

export const updateTicketStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, assignedToRole, assignedToUserId } = req.body;

    if (!status) {
      return res.status(400).json({ status: false, message: 'status is required' });
    }

    const ticket = await SupportTicket.findOne({
      $or: [{ ticketId: id }, { _id: id }]
    });

    if (!ticket) {
      return res.status(404).json({ status: false, message: 'Ticket not found' });
    }

    ticket.status = String(status).toUpperCase();
    if (assignedToRole) ticket.assignedToRole = assignedToRole;
    if (assignedToUserId) ticket.assignedToUserId = assignedToUserId;

    await ticket.save();

    return res.status(200).json({
      status: true,
      message: 'Ticket status updated successfully',
      data: ticket.toDto()
    });
  } catch (error) {
    next(error);
  }
};

export const closeTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await SupportTicket.findOne({
      $or: [{ ticketId: id }, { _id: id }]
    });

    if (!ticket) {
      return res.status(404).json({ status: false, message: 'Ticket not found' });
    }

    ticket.status = 'CLOSED';
    await ticket.save();

    return res.status(200).json({
      status: true,
      message: 'Ticket closed successfully',
      data: ticket.toDto()
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await SupportTicket.deleteOne({
      $or: [{ ticketId: id }, { _id: id }]
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ status: false, message: 'Ticket not found' });
    }

    return res.status(200).json({
      status: true,
      message: 'Ticket deleted successfully',
      data: id
    });
  } catch (error) {
    next(error);
  }
};
