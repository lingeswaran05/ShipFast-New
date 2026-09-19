import { Hono } from 'hono';
import { Env } from '../types';
import { getAuthenticatedUser } from './auth';

const roleRouter = new Hono<{ Bindings: Env }>();

// Request role upgrade
roleRouter.post('/requests', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();
  const { requestedRole, reason } = body;

  if (!requestedRole) {
    return c.json({ success: false, message: 'Requested role is required' }, 400);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO role_requests (user_id, user_email, user_name, requested_role, reason, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
  ).bind(user.id, user.email, user.name, String(requestedRole).toUpperCase(), reason || '').run();

  return c.json({
    success: true,
    message: 'Role upgrade request submitted successfully',
    data: {
      id: result.meta?.last_row_id,
      user_id: user.id,
      requested_role: requestedRole,
      status: 'PENDING'
    }
  }, 201);
});

// Get pending role requests (Admin)
roleRouter.get('/requests/pending', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user || user.role !== 'ADMIN') {
    return c.json({ success: false, message: 'Admin privileges required' }, 403);
  }

  const result = await c.env.DB.prepare(
    'SELECT * FROM role_requests WHERE status = "PENDING" ORDER BY id DESC'
  ).all();

  return c.json({
    success: true,
    data: result.results || []
  });
});

// My role request status
roleRouter.get('/requests/status', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401);
  }

  const result = await c.env.DB.prepare(
    'SELECT * FROM role_requests WHERE user_email = ? ORDER BY id DESC LIMIT 1'
  ).bind(user.email).first();

  return c.json({
    success: true,
    data: result || null
  });
});

// Approve role request (Admin)
roleRouter.post('/requests/:id/approve', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user || user.role !== 'ADMIN') {
    return c.json({ success: false, message: 'Admin privileges required' }, 403);
  }

  const id = c.req.param('id');
  const reqRecord: any = await c.env.DB.prepare('SELECT * FROM role_requests WHERE id = ?').bind(id).first();
  if (!reqRecord) {
    return c.json({ success: false, message: 'Request not found' }, 404);
  }

  await c.env.DB.prepare('UPDATE role_requests SET status = "APPROVED", updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run();
  await c.env.DB.prepare('UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?').bind(reqRecord.requested_role, reqRecord.user_email).run();

  return c.json({
    success: true,
    message: `Role request approved. User promoted to ${reqRecord.requested_role}`
  });
});

// Reject role request (Admin)
roleRouter.post('/requests/:id/reject', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user || user.role !== 'ADMIN') {
    return c.json({ success: false, message: 'Admin privileges required' }, 403);
  }

  const id = c.req.param('id');
  await c.env.DB.prepare('UPDATE role_requests SET status = "REJECTED", updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(id).run();

  return c.json({
    success: true,
    message: 'Role request rejected'
  });
});

// Cancel role request
roleRouter.delete('/requests/:id', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401);
  }

  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM role_requests WHERE id = ? AND user_email = ?').bind(id, user.email).run();

  return c.json({
    success: true,
    message: 'Request cancelled'
  });
});

export default roleRouter;
