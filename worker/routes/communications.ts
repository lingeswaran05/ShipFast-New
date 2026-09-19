import { Hono } from 'hono';
import { Env } from '../types';
import { getAuthenticatedUser } from './auth';

const communicationRouter = new Hono<{ Bindings: Env }>();

// Notifications - List
communicationRouter.get('/notifications', async (c) => {
  const user = await getAuthenticatedUser(c);
  const emailParam = c.req.query('userEmail') || user?.email;

  if (!emailParam) {
    return c.json({ success: true, data: [] });
  }

  const result = await c.env.DB.prepare(
    'SELECT * FROM notifications WHERE user_email = ? ORDER BY created_at DESC LIMIT 50'
  ).bind(emailParam).all();

  const notifications = (result.results || []).map((row: any) => ({
    id: row.id,
    userEmail: row.user_email,
    title: row.title,
    message: row.message,
    type: row.type,
    isRead: Boolean(row.is_read),
    link: row.link,
    createdAt: row.created_at
  }));

  return c.json({
    success: true,
    data: notifications
  });
});

// Notifications - Create
communicationRouter.post('/notifications', async (c) => {
  const body = await c.req.json();
  const { userEmail, title, message, type = 'INFO', link } = body;

  const result = await c.env.DB.prepare(
    `INSERT INTO notifications (user_email, title, message, type, is_read, link, created_at)
     VALUES (?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)`
  ).bind(userEmail, title, message, type, link || null).run();

  return c.json({
    success: true,
    data: { id: result.meta?.last_row_id, userEmail, title, message, type, isRead: false }
  }, 201);
});

// Notifications - Mark Read
communicationRouter.put('/notifications/:id/read', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').bind(id).run();
  return c.json({ success: true, message: 'Notification marked as read' });
});

// Notifications - Read All
communicationRouter.put('/notifications/read-all', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (user) {
    await c.env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE user_email = ?').bind(user.email).run();
  }
  return c.json({ success: true, message: 'All notifications marked as read' });
});

// Support - Create Ticket
communicationRouter.post('/support', async (c) => {
  const user = await getAuthenticatedUser(c);
  const body = await c.req.json();
  const { userEmail, userName, subject, category, priority, trackingNumber, message, description } = body;

  const ticketNumber = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
  const id = crypto.randomUUID();
  const email = userEmail || user?.email || 'customer@shipfast.com';
  const name = userName || user?.name || 'Customer';
  const initialMessage = message || description || 'Ticket created.';

  const messages = [
    {
      id: crypto.randomUUID(),
      sender: name,
      senderEmail: email,
      isStaff: false,
      text: initialMessage,
      timestamp: new Date().toISOString()
    }
  ];

  await c.env.DB.prepare(
    `INSERT INTO support_tickets (id, ticket_number, user_email, user_name, subject, category, priority, status, tracking_number, messages_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  ).bind(
    id,
    ticketNumber,
    email,
    name,
    subject || 'Support Request',
    category || 'GENERAL',
    priority || 'MEDIUM',
    trackingNumber || null,
    JSON.stringify(messages)
  ).run();

  return c.json({
    success: true,
    data: {
      id,
      ticketNumber,
      userEmail: email,
      userName: name,
      subject,
      category,
      priority,
      status: 'OPEN',
      trackingNumber,
      messages
    }
  }, 201);
});

// Support - List Tickets
communicationRouter.get('/support', async (c) => {
  const user = await getAuthenticatedUser(c);
  const userEmail = c.req.query('userEmail') || (user?.role === 'CUSTOMER' ? user?.email : null);

  let query = 'SELECT * FROM support_tickets';
  const params: any[] = [];

  if (userEmail) {
    query += ' WHERE user_email = ?';
    params.push(userEmail);
  }

  query += ' ORDER BY created_at DESC';
  const result = await c.env.DB.prepare(query).bind(...params).all();

  const tickets = (result.results || []).map((row: any) => ({
    id: row.id,
    ticketNumber: row.ticket_number,
    userEmail: row.user_email,
    userName: row.user_name,
    subject: row.subject,
    category: row.category,
    priority: row.priority,
    status: row.status,
    trackingNumber: row.tracking_number,
    messages: JSON.parse(row.messages_json || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

  return c.json({
    success: true,
    data: tickets
  });
});

// Support - Get Ticket
communicationRouter.get('/support/:ticketNumber', async (c) => {
  const ticketNumber = c.req.param('ticketNumber');
  const row: any = await c.env.DB.prepare(
    'SELECT * FROM support_tickets WHERE ticket_number = ? OR id = ?'
  ).bind(ticketNumber, ticketNumber).first();

  if (!row) {
    return c.json({ success: false, message: 'Ticket not found' }, 404);
  }

  return c.json({
    success: true,
    data: {
      id: row.id,
      ticketNumber: row.ticket_number,
      userEmail: row.user_email,
      userName: row.user_name,
      subject: row.subject,
      category: row.category,
      priority: row.priority,
      status: row.status,
      trackingNumber: row.tracking_number,
      messages: JSON.parse(row.messages_json || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  });
});

// Support - Add Message
communicationRouter.post('/support/:ticketNumber/messages', async (c) => {
  const ticketNumber = c.req.param('ticketNumber');
  const user = await getAuthenticatedUser(c);
  const body = await c.req.json();
  const { text, message } = body;
  const content = text || message || '';

  const row: any = await c.env.DB.prepare(
    'SELECT * FROM support_tickets WHERE ticket_number = ? OR id = ?'
  ).bind(ticketNumber, ticketNumber).first();

  if (!row) {
    return c.json({ success: false, message: 'Ticket not found' }, 404);
  }

  const existingMessages = JSON.parse(row.messages_json || '[]');
  const newMessage = {
    id: crypto.randomUUID(),
    sender: user ? user.name : 'Support Agent',
    senderEmail: user ? user.email : 'support@shipfast.com',
    isStaff: user?.role === 'ADMIN' || user?.role === 'AGENT',
    text: content,
    timestamp: new Date().toISOString()
  };

  existingMessages.push(newMessage);

  await c.env.DB.prepare(
    'UPDATE support_tickets SET messages_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(JSON.stringify(existingMessages), row.id).run();

  return c.json({
    success: true,
    data: newMessage
  });
});

export default communicationRouter;
