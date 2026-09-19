import { Hono } from 'hono';
import { Env } from '../types';
import { getAuthenticatedUser } from './auth';

const operationsRouter = new Hono<{ Bindings: Env }>();

// Generate Invoice
operationsRouter.post('/invoice', async (c) => {
  const body = await c.req.json();
  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
  return c.json({
    success: true,
    data: {
      invoiceNumber,
      invoiceId: invoiceNumber,
      generatedAt: new Date().toISOString(),
      ...body
    }
  });
});

// RunSheets - Create
operationsRouter.post('/runsheet', async (c) => {
  const body = await c.req.json();
  const { agentId, hubId, shipmentTrackingNumbers = [] } = body;
  const runSheetId = `RS-${Date.now().toString().slice(-6)}`;
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO runsheets (id, run_sheet_id, agent_id, hub_id, shipment_tracking_numbers_json, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'CREATED', CURRENT_TIMESTAMP)`
  ).bind(id, runSheetId, String(agentId || 'AGENT-01'), String(hubId || 'HUB-01'), JSON.stringify(shipmentTrackingNumbers)).run();

  return c.json({
    success: true,
    data: {
      id,
      runSheetId,
      agentId,
      hubId,
      shipmentTrackingNumbers,
      status: 'CREATED'
    }
  }, 201);
});

// RunSheets - Get by agent
operationsRouter.get('/runsheet/:agentId', async (c) => {
  const agentId = c.req.param('agentId');
  const result = await c.env.DB.prepare(
    'SELECT * FROM runsheets WHERE agent_id = ? ORDER BY created_at DESC'
  ).bind(agentId).all();

  const runsheets = (result.results || []).map((row: any) => ({
    id: row.id,
    runSheetId: row.run_sheet_id,
    agentId: row.agent_id,
    hubId: row.hub_id,
    shipmentTrackingNumbers: JSON.parse(row.shipment_tracking_numbers_json || '[]'),
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at
  }));

  return c.json({
    success: true,
    data: runsheets,
    content: runsheets
  });
});

// RunSheets - Complete
operationsRouter.put('/runsheet/:runSheetId/complete', async (c) => {
  const runSheetId = c.req.param('runSheetId');
  await c.env.DB.prepare(
    'UPDATE runsheets SET status = "COMPLETED", completed_at = CURRENT_TIMESTAMP WHERE run_sheet_id = ? OR id = ?'
  ).bind(runSheetId, runSheetId).run();

  return c.json({
    success: true,
    message: 'Run sheet marked as completed'
  });
});

// Hubs - List
operationsRouter.get('/hubs', async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM operations_hubs ORDER BY name ASC').all();
  return c.json({
    success: true,
    data: result.results || []
  });
});

// Hubs - Create
operationsRouter.post('/hubs', async (c) => {
  const body = await c.req.json();
  const id = body.id || `hub-${Date.now().toString().slice(-4)}`;
  await c.env.DB.prepare(
    `INSERT INTO operations_hubs (id, name, code, city, state, address, capacity, current_load, contact_number, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`
  ).bind(
    id,
    body.name,
    body.code || `HUB-${Date.now().toString().slice(-3)}`,
    body.city || '',
    body.state || '',
    body.address || '',
    Number(body.capacity || 10000),
    Number(body.currentLoad || 0),
    body.contactNumber || ''
  ).run();

  return c.json({ success: true, message: 'Hub created successfully', data: { id, ...body } }, 201);
});

// Routes - List
operationsRouter.get('/routes', async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM operations_routes ORDER BY route_code ASC').all();
  return c.json({
    success: true,
    data: result.results || []
  });
});

// Vehicles - List
operationsRouter.get('/vehicles', async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM vehicles ORDER BY vehicle_number ASC').all();
  return c.json({
    success: true,
    data: result.results || []
  });
});

// Drivers - List
operationsRouter.get('/drivers', async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM drivers ORDER BY name ASC').all();
  return c.json({
    success: true,
    data: result.results || []
  });
});

// Manifests - List
operationsRouter.get('/manifests', async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM manifests ORDER BY created_at DESC').all();
  return c.json({
    success: true,
    data: result.results || []
  });
});

export default operationsRouter;
