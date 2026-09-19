import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env } from './types';
import authRouter from './routes/auth';
import roleRouter from './routes/roles';
import shipmentRouter from './routes/shipments';
import operationsRouter from './routes/operations';
import communicationRouter from './routes/communications';
import adminRouter from './routes/admin';
import reportingRouter from './routes/reporting';
import uploadRouter from './routes/upload';

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for all frontend domains
app.use('*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposeHeaders: ['Content-Length', 'Content-Type', 'Content-Disposition'],
  maxAge: 86400,
  credentials: true
}));

// Health check
app.get('/api/health', (c) => {
  return c.json({
    status: 'UP',
    service: 'ShipFast Cloudflare Edge API',
    timestamp: new Date().toISOString(),
    database: 'Cloudflare D1',
    storage: 'Cloudflare R2',
    runtime: 'Cloudflare Workers (V8 Isolates)'
  });
});

// Mount Routes to both /api/v1/* and /api/* to ensure 100% backward compatibility
app.route('/api/v1/auth', authRouter);
app.route('/api/auth', authRouter);

app.route('/api/v1/roles', roleRouter);
app.route('/api/roles', roleRouter);

app.route('/api/v1/shipments', shipmentRouter);
app.route('/api/shipments', shipmentRouter);

app.route('/api/operations', operationsRouter);
app.route('/api/v1/operations', operationsRouter);

app.route('/api/notifications', communicationRouter);
app.route('/api/support', communicationRouter);
app.route('/api/communications', communicationRouter);

app.route('/api/admin', adminRouter);
app.route('/api/v1/admin', adminRouter);

app.route('/api/reports', reportingRouter);
app.route('/api/v1/reports', reportingRouter);

app.route('/api', uploadRouter);

// Root greeting
app.get('/', (c) => {
  return c.json({
    message: 'ShipFast Cloudflare Edge API is live and operational.',
    documentation: 'See CLOUDFLARE_DEPLOYMENT_GUIDE.md'
  });
});

// Global 404 handler
app.notFound((c) => {
  return c.json({ success: false, message: `Route not found: ${c.req.path}` }, 404);
});

// Global Error Handler
app.onError((err, c) => {
  console.error('[Worker Error]', err);
  return c.json({ success: false, message: err.message || 'Internal Server Error' }, 500);
});

export default app;
