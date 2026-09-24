import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    notificationId: {
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
    type: {
      type: String,
      default: 'INFO'
    },
    message: {
      type: String,
      required: true
    },
    status: {
      type: String,
      default: 'SENT'
    },
    isRead: {
      type: Boolean,
      default: false
    },
    role: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

NotificationSchema.methods.toDto = function () {
  return {
    id: this.notificationId,
    notificationId: this.notificationId,
    userId: this.userId,
    type: this.type,
    message: this.message,
    status: this.status,
    isRead: this.isRead,
    role: this.role,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
