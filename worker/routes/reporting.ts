import { Hono } from 'hono';
import { Env } from '../types';

const reportingRouter = new Hono<{ Bindings: Env }>();

reportingRouter.get('/summary', async (c) => {
  const totalShipments = await c.env.DB.prepare('SELECT COUNT(*) as count FROM shipments').first();
  const delivered = await c.env.DB.prepare('SELECT COUNT(*) as count FROM shipments WHERE status = "DELIVERED"').first();
  const inTransit = await c.env.DB.prepare('SELECT COUNT(*) as count FROM shipments WHERE status = "IN_TRANSIT" OR status = "OUT_FOR_DELIVERY"').first();
  const revenue = await c.env.DB.prepare('SELECT SUM(total_amount) as total FROM shipments').first();
  const activeUsers = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE status = "ACTIVE"').first();

  return c.json({
    success: true,
    data: {
      totalShipments: Number(totalShipments?.count || 0),
      deliveredShipments: Number(delivered?.count || 0),
      inTransitShipments: Number(inTransit?.count || 0),
      totalRevenue: Number(revenue?.total || 0),
      activeUsers: Number(activeUsers?.count || 0),
      snapshotDate: new Date().toISOString().split('T')[0]
    }
  });
});

reportingRouter.get('/export/shipments.csv', async (c) => {
  const result = await c.env.DB.prepare('SELECT tracking_number, service_type, status, total_amount, created_at FROM shipments ORDER BY id DESC LIMIT 1000').all();
  const rows = result.results || [];

  let csv = 'Tracking Number,Service Type,Status,Total Amount,Created At\n';
  for (const row of rows as any[]) {
    csv += `"${row.tracking_number}","${row.service_type}","${row.status}",${row.total_amount},"${row.created_at}"\n`;
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="shipments.csv"'
    }
  });
});

export default reportingRouter;
