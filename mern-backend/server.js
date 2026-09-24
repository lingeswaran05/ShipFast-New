import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './src/routes/authRoutes.js';
import roleRoutes from './src/routes/roleRoutes.js';
import shipmentRoutes from './src/routes/shipmentRoutes.js';
import publicRoutes from './src/routes/publicRoutes.js';
import operationsRoutes from './src/routes/operationsRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import supportRoutes from './src/routes/supportRoutes.js';
import reportingRoutes from './src/routes/reportingRoutes.js';
import { errorHandler } from './src/middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 8088;

// Connect to Database
connectDB().catch((err) => {
  console.warn('⚠️ MongoDB connection deferred:', err.message);
});

// Configure CORS
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev mode
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Branch-Id', 'Accept']
  })
);

// Body parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Request Logger (Development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`📡 [${req.method}] ${req.url}`);
    next();
  });
}

// Health Check Routes
app.get('/', (req, res) => {
  res.json({
    status: true,
    service: 'ShipFast MERN Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    database: 'MongoDB',
    timestamp: new Date().toISOString()
  });
});

// Mount modular API routes (matching exact Spring Boot & Gateway contracts)
app.use(['/api/v1/auth', '/api/auth'], authRoutes);
app.use(['/api/v1/roles', '/api/roles'], roleRoutes);
app.use(['/api/v1/shipments', '/api/shipments'], shipmentRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/reports', reportingRoutes);

// Global Error Handler
app.use(errorHandler);

// Start server if run directly (not serverless)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 ShipFast MERN Backend running on http://localhost:${PORT}`);
    console.log(`📡 Endpoints active: Auth, Roles, Shipments, Operations, Admin, Communications, Reporting`);
  });
}

export default app;
