import { getDb, closeDb } from '../../mern-backend/src/db/mongo.js';
import * as authCtrl from '../../mern-backend/src/controllers/authController.js';
import * as shipCtrl from '../../mern-backend/src/controllers/shipmentController.js';
import * as opsCtrl from '../../mern-backend/src/controllers/operationsController.js';
import * as adminCtrl from '../../mern-backend/src/controllers/adminController.js';
import * as roleCtrl from '../../mern-backend/src/controllers/roleRequestController.js';
import * as commCtrl from '../../mern-backend/src/controllers/communicationsController.js';
import * as repCtrl from '../../mern-backend/src/controllers/reportingController.js';
import { verifyToken, requireAdmin, optionalAuth } from '../../mern-backend/src/middleware/auth.js';

function matchRoute(routePattern, path) {
  const patternParts = routePattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

export async function onRequest(context) {
  const { request, env } = context;

  const resHeaders = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-Branch-Id, Accept',
    'Content-Type': 'application/json'
  });

  try {
    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: resHeaders
      });
    }

    // 2. Connect to Database
    const uri = env?.MONGODB_URI || 'mongodb+srv://lingesw0561_db_user:wYzDBE5eeNyKdiMI@shipfastcluster.6pkdcqc.mongodb.net/shipfast?retryWrites=true&w=majority';
    try {
      await getDb(uri);
    } catch (err) {
      return new Response(JSON.stringify({
        status: false,
        message: 'Database connection error: ' + err.message,
        note: 'Ensure 0.0.0.0/0 is whitelisted in MongoDB Atlas Network Access.'
      }), {
        status: 500,
        headers: resHeaders
      });
    }

    // 3. Build req and res objects
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const method = request.method.toUpperCase();

    let body = {};
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          body = await request.json();
        } else {
          const text = await request.text();
          if (text) {
            try { body = JSON.parse(text); } catch { body = text; }
          }
        }
      } catch (e) {
        body = {};
      }
    }

    const query = Object.fromEntries(url.searchParams.entries());
    const headers = {};
    for (const [k, v] of request.headers.entries()) {
      headers[k.toLowerCase()] = v;
    }

    const req = {
      method,
      url: pathname + url.search,
      originalUrl: pathname + url.search,
      path: pathname,
      query,
      body,
      headers,
      params: {},
      user: null,
      userId: null,
      userEmail: null,
      userRole: null
    };

    let responseObj = null;

    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader(key, value) {
        resHeaders.set(key, value);
      },
      json(data) {
        if (responseObj) return;
        resHeaders.set('Content-Type', 'application/json');
        responseObj = new Response(JSON.stringify(data), {
          status: this.statusCode || 200,
          headers: resHeaders
        });
      },
      send(data) {
        if (responseObj) return;
        if (typeof data === 'object') {
          return this.json(data);
        }
        responseObj = new Response(data, {
          status: this.statusCode || 200,
          headers: resHeaders
        });
      }
    };

    const next = (err) => {
      if (err && !responseObj) {
        res.status(500).json({ status: false, message: err.message || 'Internal server error', stack: err.stack });
      }
    };

    // Route matching table
    const routes = [
      // Health
      { method: 'GET', path: '/api/health', handler: (req, res) => res.json({ status: 'UP', database: 'MongoDB Atlas', timestamp: new Date().toISOString() }) },
      { method: 'GET', path: '/api', handler: (req, res) => res.json({ status: true, service: 'ShipFast Cloudflare Backend', version: '1.0.0' }) },

      // Auth & User Management
      { method: 'POST', path: '/api/auth/register', handler: authCtrl.register },
      { method: 'POST', path: '/api/v1/auth/register', handler: authCtrl.register },
      { method: 'POST', path: '/api/auth/login', handler: authCtrl.login },
      { method: 'POST', path: '/api/v1/auth/login', handler: authCtrl.login },
      { method: 'POST', path: '/api/auth/refresh-token', handler: authCtrl.refreshToken },
      { method: 'POST', path: '/api/v1/auth/refresh-token', handler: authCtrl.refreshToken },
      { method: 'POST', path: '/api/auth/logout', handler: authCtrl.logout },
      { method: 'POST', path: '/api/v1/auth/logout', handler: authCtrl.logout },
      { method: 'GET', path: '/api/auth/profile', middlewares: [verifyToken], handler: authCtrl.getProfile },
      { method: 'GET', path: '/api/v1/auth/profile', middlewares: [verifyToken], handler: authCtrl.getProfile },
      { method: 'PUT', path: '/api/auth/profile', middlewares: [verifyToken], handler: authCtrl.updateProfile },
      { method: 'PUT', path: '/api/v1/auth/profile', middlewares: [verifyToken], handler: authCtrl.updateProfile },
      { method: 'PUT', path: '/api/auth/change-password', middlewares: [verifyToken], handler: authCtrl.changePassword },
      { method: 'POST', path: '/api/auth/forgot-password', handler: authCtrl.forgotPassword },
      { method: 'POST', path: '/api/auth/verify-otp', handler: authCtrl.verifyOtp },
      { method: 'POST', path: '/api/auth/reset-password', handler: authCtrl.resetPassword },
      { method: 'GET', path: '/api/auth/internal/users/:emailOrId', handler: authCtrl.getInternalUser },
      { method: 'GET', path: '/api/auth/admin/users', middlewares: [verifyToken, requireAdmin], handler: authCtrl.getAllUsers },
      { method: 'GET', path: '/api/v1/auth/admin/users', middlewares: [verifyToken, requireAdmin], handler: authCtrl.getAllUsers },
      { method: 'PUT', path: '/api/auth/admin/users/:emailOrId/role', middlewares: [verifyToken, requireAdmin], handler: authCtrl.updateUserRole },
      { method: 'DELETE', path: '/api/auth/admin/users/:emailOrId', middlewares: [verifyToken, requireAdmin], handler: authCtrl.deleteUser },

      // Roles
      { method: 'POST', path: '/api/roles/requests', middlewares: [verifyToken], handler: roleCtrl.createRequest },
      { method: 'POST', path: '/api/v1/roles/requests', middlewares: [verifyToken], handler: roleCtrl.createRequest },
      { method: 'GET', path: '/api/roles/requests/pending', middlewares: [verifyToken, requireAdmin], handler: roleCtrl.getPendingRequests },
      { method: 'GET', path: '/api/v1/roles/requests/pending', middlewares: [verifyToken, requireAdmin], handler: roleCtrl.getPendingRequests },
      { method: 'GET', path: '/api/roles/requests/status', middlewares: [verifyToken], handler: roleCtrl.getMyRequestStatus },
      { method: 'GET', path: '/api/v1/roles/requests/status', middlewares: [verifyToken], handler: roleCtrl.getMyRequestStatus },
      { method: 'POST', path: '/api/roles/requests/:requestId/approve', middlewares: [verifyToken, requireAdmin], handler: roleCtrl.approveRequest },
      { method: 'POST', path: '/api/v1/roles/requests/:requestId/approve', middlewares: [verifyToken, requireAdmin], handler: roleCtrl.approveRequest },
      { method: 'POST', path: '/api/roles/requests/:requestId/reject', middlewares: [verifyToken, requireAdmin], handler: roleCtrl.rejectRequest },
      { method: 'POST', path: '/api/v1/roles/requests/:requestId/reject', middlewares: [verifyToken, requireAdmin], handler: roleCtrl.rejectRequest },
      { method: 'DELETE', path: '/api/roles/requests/:requestId', middlewares: [verifyToken], handler: roleCtrl.cancelRequest },

      // Public
      { method: 'GET', path: '/api/public/track/:trackingNumber', handler: shipCtrl.publicTrackHistory },
      { method: 'GET', path: '/api/public/branches', handler: adminCtrl.getBranches },

      // Shipments
      { method: 'POST', path: '/api/shipments', middlewares: [optionalAuth], handler: shipCtrl.createShipment },
      { method: 'POST', path: '/api/v1/shipments', middlewares: [optionalAuth], handler: shipCtrl.createShipment },
      { method: 'GET', path: '/api/shipments', handler: shipCtrl.getAllShipments },
      { method: 'GET', path: '/api/v1/shipments', handler: shipCtrl.getAllShipments },
      { method: 'GET', path: '/api/shipments/mine', middlewares: [optionalAuth], handler: shipCtrl.getMine },
      { method: 'GET', path: '/api/v1/shipments/mine', middlewares: [optionalAuth], handler: shipCtrl.getMine },
      { method: 'GET', path: '/api/shipments/track/:trackingNumber', handler: shipCtrl.getByTrackingNumber },
      { method: 'GET', path: '/api/v1/shipments/track/:trackingNumber', handler: shipCtrl.getByTrackingNumber },
      { method: 'POST', path: '/api/shipments/calculate-rate', handler: shipCtrl.calculateRate },
      { method: 'POST', path: '/api/v1/shipments/calculate-rate', handler: shipCtrl.calculateRate },
      { method: 'GET', path: '/api/shipments/pricing-config', handler: shipCtrl.getPricingConfig },
      { method: 'GET', path: '/api/v1/shipments/pricing-config', handler: shipCtrl.getPricingConfig },
      { method: 'PUT', path: '/api/shipments/pricing-config', handler: shipCtrl.updatePricingConfig },
      { method: 'GET', path: '/api/shipments/:shipmentId', handler: shipCtrl.getById },
      { method: 'GET', path: '/api/v1/shipments/:shipmentId', handler: shipCtrl.getById },
      { method: 'PUT', path: '/api/shipments/:shipmentId', handler: shipCtrl.updateShipment },
      { method: 'DELETE', path: '/api/shipments/:shipmentId', handler: shipCtrl.deleteShipment },
      { method: 'PATCH', path: '/api/shipments/:shipmentId/status', middlewares: [optionalAuth], handler: shipCtrl.updateStatus },
      { method: 'PATCH', path: '/api/v1/shipments/:shipmentId/status', middlewares: [optionalAuth], handler: shipCtrl.updateStatus },
      { method: 'PATCH', path: '/api/shipments/:shipmentId/assign', handler: shipCtrl.assignShipment },
      { method: 'POST', path: '/api/shipments/:shipmentId/assign', handler: shipCtrl.assignShipment },
      { method: 'POST', path: '/api/shipments/:shipmentId/rating', handler: shipCtrl.addRating },

      // Operations
      { method: 'POST', path: '/api/operations/agents', handler: opsCtrl.createAgent },
      { method: 'GET', path: '/api/operations/agents', handler: opsCtrl.getAllAgents },
      { method: 'GET', path: '/api/operations/agents/:agentIdentifier', handler: opsCtrl.getAgentByIdentifier },
      { method: 'GET', path: '/api/operations/agents/profile/:userId', handler: opsCtrl.getAgentProfileByUserId },
      { method: 'PUT', path: '/api/operations/agents/profile/:userId', handler: opsCtrl.upsertAgentProfile },
      { method: 'PUT', path: '/api/operations/agents/profile/:userId/verify', handler: opsCtrl.verifyAgentProfile },
      { method: 'GET', path: '/api/operations/agents/profile/:userId/request-status', handler: opsCtrl.checkAgentRequestStatus },
      { method: 'DELETE', path: '/api/operations/agents/profile/:userId', handler: opsCtrl.deleteAgentProfile },
      { method: 'POST', path: '/api/operations/agents/:agentIdentifier/rating', handler: opsCtrl.recordAgentRating },
      { method: 'POST', path: '/api/operations/runsheet', handler: opsCtrl.createRunSheet },
      { method: 'GET', path: '/api/operations/runsheet/:agentId', handler: opsCtrl.getRunSheetsByAgent },
      { method: 'POST', path: '/api/operations/runsheets', handler: (req, res, n) => {
        req.body.agentId = req.query.agentId || req.body.agentId;
        req.body.hubId = req.query.hubId || req.body.hubId;
        req.body.shipmentTrackingNumbers = Array.isArray(req.body) ? req.body : req.body.shipmentIds || [];
        return opsCtrl.createRunSheet(req, res, n);
      }},
      { method: 'GET', path: '/api/operations/runsheets/:agentId', handler: opsCtrl.getRunSheetsByAgent },
      { method: 'POST', path: '/api/operations/scan', handler: opsCtrl.scanShipment },
      { method: 'POST', path: '/api/operations/cash', handler: opsCtrl.recordCash },
      { method: 'PUT', path: '/api/operations/cash/:id/verify', handler: opsCtrl.verifyCash },
      { method: 'POST', path: '/api/operations/invoice', handler: opsCtrl.generateInvoice },

      // Admin
      { method: 'POST', path: '/api/admin/branches', handler: adminCtrl.createBranch },
      { method: 'GET', path: '/api/admin/branches', handler: adminCtrl.getBranches },
      { method: 'PUT', path: '/api/admin/branches/:branchId', handler: adminCtrl.updateBranch },
      { method: 'DELETE', path: '/api/admin/branches/:branchId', handler: adminCtrl.deleteBranch },
      { method: 'POST', path: '/api/admin/vehicles', handler: adminCtrl.createVehicle },
      { method: 'GET', path: '/api/admin/vehicles', handler: adminCtrl.getVehicles },
      { method: 'PUT', path: '/api/admin/vehicles/:vehicleId', handler: adminCtrl.updateVehicle },
      { method: 'DELETE', path: '/api/admin/vehicles/:vehicleId', handler: adminCtrl.deleteVehicle },

      // Support
      { method: 'POST', path: '/api/support/create', handler: commCtrl.createTicket },
      { method: 'GET', path: '/api/support/user/:userId', handler: commCtrl.getUserTickets },
      { method: 'GET', path: '/api/support', handler: commCtrl.getAllTickets },
      { method: 'GET', path: '/api/support/:id', handler: commCtrl.getTicketById },
      { method: 'PUT', path: '/api/support/:id/reply', handler: commCtrl.replyTicket },
      { method: 'PUT', path: '/api/support/:id/status', handler: commCtrl.updateTicketStatus },
      { method: 'PUT', path: '/api/support/close/:id', handler: commCtrl.closeTicket },
      { method: 'DELETE', path: '/api/support/:id', handler: commCtrl.deleteTicket },

      // Notifications
      { method: 'POST', path: '/api/notifications/send', handler: commCtrl.sendNotification },
      { method: 'GET', path: '/api/notifications/:userId', handler: commCtrl.getUserNotifications },

      // Reports
      { method: 'GET', path: '/api/reports/summary', handler: repCtrl.generateSummary },
      { method: 'GET', path: '/api/reports/export/shipments.csv', handler: repCtrl.exportShipmentsCsv }
    ];

    // Find matching route
    for (const r of routes) {
      if (r.method === method) {
        const params = matchRoute(r.path, pathname);
        if (params !== null) {
          req.params = params || {};
          try {
            // Run middlewares
            for (const mw of (r.middlewares || [])) {
              let nextCalled = false;
              await mw(req, res, (err) => {
                if (err) next(err);
                else nextCalled = true;
              });
              if (!nextCalled || responseObj) break;
            }
            if (!responseObj) {
              await r.handler(req, res, next);
            }
          } catch (routeErr) {
            next(routeErr);
          }

          if (responseObj) {
            return responseObj;
          }
        }
      }
    }

    // 404
    return new Response(JSON.stringify({
      status: false,
      message: `API endpoint ${method} ${pathname} not found`
    }), {
      status: 404,
      headers: resHeaders
    });
  } catch (globalError) {
    return new Response(JSON.stringify({
      status: false,
      message: 'Server error: ' + globalError.message,
      stack: globalError.stack
    }), {
      status: 500,
      headers: resHeaders
    });
  } finally {
    await closeDb();
  }
}
