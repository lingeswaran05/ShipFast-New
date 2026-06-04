import axios from 'axios';
import { authStorage } from './authService';
import { resolveServiceBaseUrls, toServiceBaseUrl, shouldRetryWithFallback } from './apiConfig';

const COMM_BASE_URLS = resolveServiceBaseUrls(import.meta.env.VITE_COMM_BASE_URL, {
  localDirectBase: 'http://localhost:8088'
})
  .filter((value, index, list) => list.indexOf(value) === index);
const LOCAL_NOTIFICATIONS_KEY = 'sf_local_notifications';
const LOCAL_TICKETS_KEY = 'sf_local_tickets';
const endpointAvailability = {
  notifications: true,
  supportCreate: true,
  supportUser: true,
  supportAll: true
};

const notificationsApi = axios.create({
  baseURL: toServiceBaseUrl(COMM_BASE_URLS[0], '/api/notifications'),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

const supportApi = axios.create({
  baseURL: toServiceBaseUrl(COMM_BASE_URLS[0], '/api/support'),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

const notificationsBaseUrls = COMM_BASE_URLS.map((base) => toServiceBaseUrl(base, '/api/notifications'));
const supportBaseUrls = COMM_BASE_URLS.map((base) => toServiceBaseUrl(base, '/api/support'));
let activeNotificationsBaseIndex = 0;
let activeSupportBaseIndex = 0;
const setNotificationsBase = (index) => {
  activeNotificationsBaseIndex = index;
  notificationsApi.defaults.baseURL = notificationsBaseUrls[index] || notificationsBaseUrls[0];
};
const setSupportBase = (index) => {
  activeSupportBaseIndex = index;
  supportApi.defaults.baseURL = supportBaseUrls[index] || supportBaseUrls[0];
};
const withNotificationsFallback = async (requestFactory, options = {}) => {
  const { retryOnFailure = true } = options;
  let lastError;
  for (let offset = 0; offset < notificationsBaseUrls.length; offset += 1) {
    const index = (activeNotificationsBaseIndex + offset) % notificationsBaseUrls.length;
    setNotificationsBase(index);
    try {
      return await requestFactory(notificationsApi);
    } catch (error) {
      lastError = error;
      const shouldRetry = retryOnFailure && shouldRetryWithFallback(error) && offset < notificationsBaseUrls.length - 1;
      if (!shouldRetry) throw error;
    }
  }
  throw lastError;
};
const withSupportFallback = async (requestFactory, options = {}) => {
  const { retryOnFailure = true } = options;
  let lastError;
  for (let offset = 0; offset < supportBaseUrls.length; offset += 1) {
    const index = (activeSupportBaseIndex + offset) % supportBaseUrls.length;
    setSupportBase(index);
    try {
      return await requestFactory(supportApi);
    } catch (error) {
      lastError = error;
      const shouldRetry = retryOnFailure && shouldRetryWithFallback(error) && offset < supportBaseUrls.length - 1;
      if (!shouldRetry) throw error;
    }
  }
  throw lastError;
};

const authInterceptor = (config) => {
  const token = authStorage.getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

notificationsApi.interceptors.request.use(authInterceptor);
supportApi.interceptors.request.use(authInterceptor);

const getPayload = (response) => response?.data?.data ?? response?.data ?? {};

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback
);
const isUnavailable = (error) => Number(error?.response?.status || 0) === 404 || error?.message === 'Network Error';

const normalizeStatus = (status) => String(status || 'OPEN').replace(/_/g, ' ').toUpperCase();

const mapNotification = (notification = {}) => ({
  id: notification.id || notification.notificationId || `n-${Date.now()}`,
  userId: notification.userId,
  type: notification.type || 'INFO',
  message: notification.message || '',
  status: notification.status || 'SENT',
  isRead: Boolean(notification.isRead),
  timestamp: notification.createdAt ? new Date(notification.createdAt).toLocaleString() : new Date().toLocaleString(),
  role: String(notification.role || '').toLowerCase() || undefined
});

const mapTicketMessage = (message = {}) => ({
  id: message.messageId || message.id || `msg-${Date.now()}`,
  senderId: message.senderId || '',
  senderName: message.senderName || 'Support',
  senderRole: String(message.senderRole || 'admin').toLowerCase(),
  message: message.message || '',
  createdAt: message.createdAt || new Date().toISOString(),
  createdLabel: message.createdAt ? new Date(message.createdAt).toLocaleString() : 'Just now'
});

const mapTicket = (ticket = {}) => ({
  id: ticket.id || ticket.ticketId || `TKT-${Date.now()}`,
  userId: ticket.userId,
  subject: ticket.subject || 'Support Ticket',
  category: ticket.category || 'General',
  message: ticket.description || ticket.message || '',
  priority: ticket.priority || 'Medium',
  status: normalizeStatus(ticket.status),
  assignedToRole: ticket.assignedToRole || 'ADMIN',
  assignedToUserId: ticket.assignedToUserId || '',
  lastUpdate: ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : 'Just now',
  createdAt: ticket.createdAt || new Date().toISOString(),
  updatedAt: ticket.updatedAt || ticket.createdAt || new Date().toISOString(),
  messages: Array.isArray(ticket.messages) ? ticket.messages.map(mapTicketMessage) : []
});

const readLocalNotifications = () => {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalNotifications = (list) => {
  try {
    localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {
    // ignore storage failures
  }
};

const saveLocalNotification = (notification) => {
  const current = readLocalNotifications();
  writeLocalNotifications([notification, ...current]);
};

const readLocalTickets = () => {
  try {
    const raw = localStorage.getItem(LOCAL_TICKETS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalTickets = (list) => {
  try {
    localStorage.setItem(LOCAL_TICKETS_KEY, JSON.stringify(list.slice(0, 300)));
  } catch {
    // ignore storage failures
  }
};

export const communicationService = {
  async sendNotification(userId, type, message) {
    if (!endpointAvailability.notifications) {
      const fallbackNotification = mapNotification({
        id: `local-${Date.now()}`,
        userId,
        type: type || 'INFO',
        message,
        status: 'LOCAL',
        isRead: false,
        createdAt: new Date().toISOString()
      });
      saveLocalNotification(fallbackNotification);
      return fallbackNotification;
    }
    try {
      const response = await withNotificationsFallback((client) => client.post('/send', null, {
        params: { userId, type, message }
      }));
      const mapped = mapNotification(getPayload(response));
      saveLocalNotification(mapped);
      return mapped;
    } catch (error) {
      if (isUnavailable(error)) endpointAvailability.notifications = false;
      const fallbackNotification = mapNotification({
        id: `local-${Date.now()}`,
        userId,
        type: type || 'INFO',
        message,
        status: 'LOCAL',
        isRead: false,
        createdAt: new Date().toISOString()
      });
      saveLocalNotification(fallbackNotification);
      return fallbackNotification;
    }
  },

  async getUserNotifications(userId) {
    if (!endpointAvailability.notifications) {
      const local = readLocalNotifications().filter((item) => !item.userId || item.userId === userId);
      return local.map(mapNotification);
    }
    try {
      const response = await withNotificationsFallback((client) => client.get(`/${encodeURIComponent(userId)}`));
      const payload = getPayload(response);
      const list = Array.isArray(payload) ? payload : payload.notifications || payload.content || [];
      const mapped = list.map(mapNotification);
      const local = readLocalNotifications().filter((item) => !item.userId || item.userId === userId);
      return [...mapped, ...local].slice(0, 200);
    } catch (error) {
      if (isUnavailable(error)) endpointAvailability.notifications = false;
      const local = readLocalNotifications().filter((item) => !item.userId || item.userId === userId);
      return local.map(mapNotification);
    }
  },

  async createTicket(ticketData) {
    if (!endpointAvailability.supportCreate) {
      const fallback = mapTicket({
        id: `LOCAL-TKT-${Date.now()}`,
        userId: ticketData.userId,
        subject: ticketData.subject,
        category: ticketData.category,
        description: ticketData.message || ticketData.description,
        priority: ticketData.priority || 'Medium',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: `LOCAL-MSG-${Date.now()}`,
            senderId: ticketData.userId,
            senderName: ticketData.senderName || 'Customer',
            senderRole: ticketData.senderRole || 'customer',
            message: ticketData.message || ticketData.description || '',
            createdAt: new Date().toISOString()
          }
        ]
      });
      const current = readLocalTickets();
      writeLocalTickets([fallback, ...current]);
      return fallback;
    }
    try {
      const response = await withSupportFallback((client) => client.post('/create', {
        userId: ticketData.userId,
        subject: ticketData.subject,
        description: ticketData.message || ticketData.description,
        priority: ticketData.priority,
        category: ticketData.category,
        senderName: ticketData.senderName,
        senderRole: ticketData.senderRole || 'customer'
      }));
      return mapTicket(getPayload(response));
    } catch (error) {
      if (isUnavailable(error)) endpointAvailability.supportCreate = false;
      const fallback = mapTicket({
        id: `LOCAL-TKT-${Date.now()}`,
        userId: ticketData.userId,
        subject: ticketData.subject,
        category: ticketData.category,
        description: ticketData.message || ticketData.description,
        priority: ticketData.priority || 'Medium',
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: `LOCAL-MSG-${Date.now()}`,
            senderId: ticketData.userId,
            senderName: ticketData.senderName || 'Customer',
            senderRole: ticketData.senderRole || 'customer',
            message: ticketData.message || ticketData.description || '',
            createdAt: new Date().toISOString()
          }
        ]
      });
      const current = readLocalTickets();
      writeLocalTickets([fallback, ...current]);
      return fallback;
    }
  },

  async getUserTickets(userId) {
    if (!endpointAvailability.supportUser) {
      const local = readLocalTickets().filter((ticket) => ticket.userId === userId);
      return local.map(mapTicket);
    }
    try {
      const response = await withSupportFallback((client) => client.get(`/user/${encodeURIComponent(userId)}`));
      const payload = getPayload(response);
      const list = Array.isArray(payload) ? payload : payload.tickets || payload.content || [];
      const remote = list.map(mapTicket);
      const local = readLocalTickets().filter((ticket) => ticket.userId === userId);
      return [...remote, ...local].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
    } catch (error) {
      if (isUnavailable(error)) endpointAvailability.supportUser = false;
      const local = readLocalTickets().filter((ticket) => ticket.userId === userId);
      return local.map(mapTicket);
    }
  },

  async getAllTickets(status = '') {
    if (!endpointAvailability.supportAll) {
      return readLocalTickets().map(mapTicket);
    }
    try {
      const response = await withSupportFallback((client) => client.get('', {
        params: status ? { status: normalizeStatus(status).replace(/ /g, '_') } : undefined
      }));
      const payload = getPayload(response);
      const list = Array.isArray(payload) ? payload : payload.tickets || payload.content || [];
      const remote = list.map(mapTicket);
      const local = readLocalTickets().map(mapTicket);
      return [...remote, ...local];
    } catch (error) {
      if (isUnavailable(error)) endpointAvailability.supportAll = false;
      return readLocalTickets().map(mapTicket);
    }
  },

  async replyTicket(ticketId, replyData) {
    try {
      const response = await withSupportFallback((client) => client.put(`/${encodeURIComponent(ticketId)}/reply`, {
        senderId: replyData.senderId,
        senderName: replyData.senderName,
        senderRole: replyData.senderRole,
        message: replyData.message
      }));
      return mapTicket(getPayload(response));
    } catch (error) {
      const existing = readLocalTickets();
      const updated = existing.map((ticket) => {
        if (ticket.id !== ticketId && ticket.ticketId !== ticketId) return mapTicket(ticket);
        const messages = Array.isArray(ticket.messages) ? [...ticket.messages] : [];
        messages.push({
          id: `LOCAL-MSG-${Date.now()}`,
          senderId: replyData.senderId,
          senderName: replyData.senderName,
          senderRole: replyData.senderRole,
          message: replyData.message,
          createdAt: new Date().toISOString()
        });
        return mapTicket({ ...ticket, messages, updatedAt: new Date().toISOString() });
      });
      writeLocalTickets(updated);
      const next = updated.find((ticket) => ticket.id === ticketId || ticket.ticketId === ticketId);
      if (!next) throw new Error(getErrorMessage(error, 'Failed to send reply'));
      return next;
    }
  },

  async updateTicketStatus(ticketId, statusData) {
    try {
      const response = await withSupportFallback((client) => client.put(`/${encodeURIComponent(ticketId)}/status`, {
        status: normalizeStatus(statusData.status).replace(/ /g, '_'),
        assignedToRole: statusData.assignedToRole,
        assignedToUserId: statusData.assignedToUserId
      }));
      return mapTicket(getPayload(response));
    } catch (error) {
      const existing = readLocalTickets();
      const updated = existing.map((ticket) => {
        if (ticket.id !== ticketId && ticket.ticketId !== ticketId) return mapTicket(ticket);
        return mapTicket({
          ...ticket,
          status: normalizeStatus(statusData.status),
          assignedToRole: statusData.assignedToRole || ticket.assignedToRole,
          assignedToUserId: statusData.assignedToUserId || ticket.assignedToUserId,
          updatedAt: new Date().toISOString()
        });
      });
      writeLocalTickets(updated);
      const next = updated.find((ticket) => ticket.id === ticketId || ticket.ticketId === ticketId);
      if (!next) throw new Error(getErrorMessage(error, 'Failed to update ticket status'));
      return next;
    }
  },

  async closeTicket(ticketId) {
    try {
      const response = await withSupportFallback((client) => client.put(`/close/${encodeURIComponent(ticketId)}`));
      return mapTicket(getPayload(response));
    } catch (error) {
      return this.updateTicketStatus(ticketId, { status: 'CLOSED' });
    }
  },

  async deleteTicket(ticketId) {
    try {
      await withSupportFallback((client) => client.delete(`/${encodeURIComponent(ticketId)}`));
      return true;
    } catch {
      const existing = readLocalTickets();
      writeLocalTickets(existing.filter((ticket) => ticket.id !== ticketId && ticket.ticketId !== ticketId));
      return true;
    }
  }
};
