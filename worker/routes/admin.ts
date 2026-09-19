import { Hono } from 'hono';
import { Env } from '../types';
import { getAuthenticatedUser } from './auth';

const adminRouter = new Hono<{ Bindings: Env }>();

// System Analytics Dashboard
adminRouter.get('/dashboard', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user || (user.role !== 'ADMIN' && user.role !== 'AGENT')) {
    return c.json({ success: false, message: 'Forbidden' }, 403);
  }

  const usersCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
  const shipmentsCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM shipments').first();
  const deliveredCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM shipments WHERE status = "DELIVERED"').first();
  const activeIssues = await c.env.DB.prepare('SELECT COUNT(*) as count FROM support_tickets WHERE status = "OPEN"').first();
  const revenueResult = await c.env.DB.prepare('SELECT SUM(total_amount) as total FROM shipments').first();

  return c.json({
    success: true,
    data: {
      totalUsers: Number(usersCount?.count || 0),
      totalShipments: Number(shipmentsCount?.count || 0),
      deliveredShipments: Number(deliveredCount?.count || 0),
      openTickets: Number(activeIssues?.count || 0),
      totalRevenue: Number(revenueResult?.total || 0),
      systemStatus: 'HEALTHY',
      edgeRegion: 'Cloudflare Global Edge Network'
    }
  });
});

// Admin System Logs / Audit Logs
adminRouter.get('/logs', async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50').all();
  return c.json({
    success: true,
    data: result.results || []
  });
});

export default adminRouter;
