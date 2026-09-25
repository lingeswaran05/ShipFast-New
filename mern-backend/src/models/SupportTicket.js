import { createModel } from '../db/mongo.js';

const SupportTicketMethods = {
  toDto: function () {
    return {
      id: this.ticketId,
      ticketId: this.ticketId,
      userId: this.userId,
      subject: this.subject || 'Support Ticket',
      category: this.category || 'General',
      description: this.description || '',
      message: this.description || '',
      priority: this.priority || 'Medium',
      status: this.status || 'OPEN',
      assignedToRole: this.assignedToRole || 'ADMIN',
      assignedToUserId: this.assignedToUserId || '',
      messages: this.messages || [],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
};

const SupportTicketDefaults = {
  subject: 'Support Ticket',
  category: 'General',
  description: '',
  priority: 'Medium',
  status: 'OPEN',
  assignedToRole: 'ADMIN',
  assignedToUserId: '',
  messages: []
};

export const SupportTicket = createModel('supporttickets', SupportTicketMethods, SupportTicketDefaults);
