import mongoose from 'mongoose';

const SupportMessageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true
    },
    senderId: {
      type: String,
      required: true
    },
    senderName: {
      type: String,
      default: 'Customer'
    },
    senderRole: {
      type: String,
      default: 'customer'
    },
    message: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const SupportTicketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    subject: {
      type: String,
      default: 'Support Ticket'
    },
    category: {
      type: String,
      default: 'General'
    },
    description: {
      type: String,
      default: ''
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium'
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true
    },
    assignedToRole: {
      type: String,
      default: 'ADMIN'
    },
    assignedToUserId: {
      type: String,
      default: ''
    },
    messages: [SupportMessageSchema]
  },
  {
    timestamps: true
  }
);

SupportTicketSchema.methods.toDto = function () {
  return {
    id: this.ticketId,
    ticketId: this.ticketId,
    userId: this.userId,
    subject: this.subject,
    category: this.category,
    description: this.description,
    message: this.description,
    priority: this.priority,
    status: this.status,
    assignedToRole: this.assignedToRole,
    assignedToUserId: this.assignedToUserId,
    messages: this.messages,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const SupportTicket = mongoose.models?.SupportTicket || mongoose.model('SupportTicket', SupportTicketSchema);
