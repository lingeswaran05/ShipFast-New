import { createModel } from '../db/mongo.js';

const NotificationMethods = {
  toDto: function () {
    return {
      id: this.notificationId,
      notificationId: this.notificationId,
      userId: this.userId,
      type: this.type || 'INFO',
      message: this.message,
      status: this.status || 'SENT',
      isRead: this.isRead === true,
      role: this.role || null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
};

const NotificationDefaults = {
  type: 'INFO',
  status: 'SENT',
  isRead: false,
  role: null
};

export const Notification = createModel('notifications', NotificationMethods, NotificationDefaults);
