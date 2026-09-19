import { Hono } from 'hono';
import { Env } from '../types';
import { getAuthenticatedUser } from './auth';
import { sendShipmentCreatedEmail } from '../services/email';

const shipmentRouter = new Hono<{ Bindings: Env }>();

function generateTrackingNumber(): string {
  const prefix = 'SF';
  const randomPart = Math.floor(100000000 + Math.random() * 900000000).toString();
  return `${prefix}${randomPart}`;
}

// Format DB record to standard frontend camelCase / snake_case object
function formatShipment(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    trackingNumber: row.tracking_number,
    tracking_number: row.tracking_number,
    senderName: row.sender_name,
    sender_name: row.sender_name,
    senderPhone: row.sender_phone,
    sender_phone: row.sender_phone,
    senderEmail: row.sender_email,
    sender_email: row.sender_email,
    senderAddress: row.sender_address,
    sender_address: row.sender_address,
    senderCity: row.sender_city,
    senderState: row.sender_state,
    senderZip: row.sender_zip,
    recipientName: row.recipient_name,
    recipient_name: row.recipient_name,
    recipientPhone: row.recipient_phone,
    recipient_phone: row.recipient_phone,
    recipientEmail: row.recipient_email,
    recipient_email: row.recipient_email,
    recipientAddress: row.recipient_address,
    recipient_address: row.recipient_address,
    recipientCity: row.recipient_city,
    recipientState: row.recipient_state,
    recipientZip: row.recipient_zip,
    packageWeight: row.package_weight,
    package_weight: row.package_weight,
    packageLength: row.package_length,
    packageWidth: row.package_width,
    packageHeight: row.package_height,
    packageType: row.package_type,
    package_type: row.package_type,
    packageDescription: row.package_description,
    package_description: row.package_description,
    declaredValue: row.declared_value,
    serviceType: row.service_type,
    service_type: row.service_type,
    status: row.status,
    paymentStatus: row.payment_status,
    payment_status: row.payment_status,
    paymentMethod: row.payment_method,
    payment_method: row.payment_method,
    baseRate: row.base_rate,
    weightCharge: row.weight_charge,
    distanceCharge: row.distance_charge,
    fuelSurcharge: row.fuel_surcharge,
    tax: row.tax,
    totalAmount: row.total_amount,
    total_amount: row.total_amount,
    originHubId: row.origin_hub_id,
    destinationHubId: row.destination_hub_id,
    currentHubId: row.current_hub_id,
    assignedDriverId: row.assigned_driver_id,
    assignedDriverName: row.assigned_driver_name,
    assignedVehicleId: row.assigned_vehicle_id,
    estimatedDelivery: row.estimated_delivery,
    actualDelivery: row.actual_delivery,
    proofImageUrl: row.proof_image_url,
    signatureUrl: row.signature_url,
    labelUrl: row.label_url,
    notes: row.notes,
    userId: row.user_id,
    userEmail: row.user_email,
    user_email: row.user_email,
    rating: row.rating,
    feedback: row.feedback,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at
  };
}

// Calculate Rate
shipmentRouter.post('/calculate-rate', async (c) => {
  const body = await c.req.json();
  const weight = Number(body.weight || body.packageWeight || 1.0);
  const serviceType = String(body.serviceType || body.service_type || 'STANDARD').toUpperCase();
  const distance = Number(body.distance || 50.0);

  const config: any = await c.env.DB.prepare(
    'SELECT * FROM pricing_configs WHERE service_type = ? AND active = 1'
  ).bind(serviceType).first();

  const basePrice = config ? Number(config.base_price) : 50.0;
  const perKgRate = config ? Number(config.per_kg_rate) : 15.0;
  const perKmRate = config ? Number(config.per_km_rate) : 2.5;
  const fuelPercent = config ? Number(config.fuel_surcharge_percent) : 5.0;
  const taxPercent = config ? Number(config.tax_percent) : 18.0;

  const weightCharge = weight * perKgRate;
  const distanceCharge = (distance / 10) * perKmRate;
  const subtotal = basePrice + weightCharge + distanceCharge;
  const fuelSurcharge = (subtotal * fuelPercent) / 100;
  const tax = ((subtotal + fuelSurcharge) * taxPercent) / 100;
  const totalAmount = Math.round((subtotal + fuelSurcharge + tax) * 100) / 100;

  return c.json({
    success: true,
    data: {
      serviceType,
      basePrice,
      weightCharge,
      distanceCharge,
      fuelSurcharge,
      tax,
      totalAmount,
      currency: 'USD',
      estimatedDays: serviceType === 'SAME_DAY' ? 0 : serviceType === 'EXPRESS' ? 1 : 3
    }
  });
});

// List / Search Shipments
shipmentRouter.get('/', async (c) => {
  const user = await getAuthenticatedUser(c);
  const { status, search, userEmail, page = '0', size = '50', myOnly } = c.req.query();

  let query = 'SELECT * FROM shipments WHERE 1=1';
  const params: any[] = [];

  if (myOnly === 'true' && user) {
    query += ' AND (user_email = ? OR user_id = ?)';
    params.push(user.email, String(user.id));
  } else if (userEmail) {
    query += ' AND user_email = ?';
    params.push(userEmail);
  } else if (user && user.role === 'CUSTOMER') {
    query += ' AND (user_email = ? OR user_id = ?)';
    params.push(user.email, String(user.id));
  }

  if (status && status !== 'ALL') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (tracking_number LIKE ? OR recipient_name LIKE ? OR sender_name LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  const limit = Math.min(Number(size), 100);
  const offset = Number(page) * limit;
  params.push(limit, offset);

  const stmt = c.env.DB.prepare(query);
  const result = await stmt.bind(...params).all();
  const shipments = (result.results || []).map(formatShipment);

  return c.json({
    success: true,
    data: shipments,
    content: shipments,
    totalElements: shipments.length,
    totalPages: 1
  });
});

// My Shipments
shipmentRouter.get('/my-shipments', async (c) => {
  const user = await getAuthenticatedUser(c);
  if (!user) {
    return c.json({ success: false, message: 'Unauthorized' }, 401);
  }

  const result = await c.env.DB.prepare(
    'SELECT * FROM shipments WHERE user_email = ? OR user_id = ? ORDER BY id DESC'
  ).bind(user.email, String(user.id)).all();

  const shipments = (result.results || []).map(formatShipment);
  return c.json({
    success: true,
    data: shipments,
    content: shipments
  });
});

// Stats Summary
shipmentRouter.get('/stats/summary', async (c) => {
  const total = await c.env.DB.prepare('SELECT COUNT(*) as count FROM shipments').first();
  const delivered = await c.env.DB.prepare('SELECT COUNT(*) as count FROM shipments WHERE status = "DELIVERED"').first();
  const inTransit = await c.env.DB.prepare('SELECT COUNT(*) as count FROM shipments WHERE status = "IN_TRANSIT" OR status = "OUT_FOR_DELIVERY"').first();
  const pending = await c.env.DB.prepare('SELECT COUNT(*) as count FROM shipments WHERE status = "ORDER_CREATED" OR status = "PICKED_UP"').first();
  const revenue = await c.env.DB.prepare('SELECT SUM(total_amount) as total FROM shipments').first();

  return c.json({
    success: true,
    data: {
      totalShipments: Number(total?.count || 0),
      deliveredShipments: Number(delivered?.count || 0),
      inTransitShipments: Number(inTransit?.count || 0),
      pendingShipments: Number(pending?.count || 0),
      totalRevenue: Number(revenue?.total || 0)
    }
  });
});

// Public Tracking by Tracking Number
shipmentRouter.get('/track/:trackingNumber', async (c) => {
  const trackingNumber = c.req.param('trackingNumber');
  const shipment: any = await c.env.DB.prepare(
    'SELECT * FROM shipments WHERE tracking_number = ?'
  ).bind(trackingNumber).first();

  if (!shipment) {
    return c.json({ success: false, message: 'Shipment not found with given tracking number' }, 404);
  }

  const events = await c.env.DB.prepare(
    'SELECT * FROM tracking_events WHERE tracking_number = ? ORDER BY timestamp ASC'
  ).bind(trackingNumber).all();

  const formatted = formatShipment(shipment);
  return c.json({
    success: true,
    data: {
      ...formatted,
      events: events.results || []
    }
  });
});

// Get Single Shipment
shipmentRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const isNumeric = /^\d+$/.test(id);

  const query = isNumeric
    ? 'SELECT * FROM shipments WHERE id = ? OR tracking_number = ?'
    : 'SELECT * FROM shipments WHERE tracking_number = ?';

  const shipment: any = await c.env.DB.prepare(query).bind(id, isNumeric ? id : undefined).first();
  if (!shipment) {
    return c.json({ success: false, message: 'Shipment not found' }, 404);
  }

  const events = await c.env.DB.prepare(
    'SELECT * FROM tracking_events WHERE tracking_number = ? ORDER BY timestamp ASC'
  ).bind(shipment.tracking_number).all();

  return c.json({
    success: true,
    data: {
      ...formatShipment(shipment),
      events: events.results || []
    }
  });
});

// Create Shipment
shipmentRouter.post('/', async (c) => {
  try {
    const user = await getAuthenticatedUser(c);
    const body = await c.req.json();

    const trackingNumber = body.trackingNumber || body.tracking_number || generateTrackingNumber();
    const senderName = body.senderName || body.sender_name || user?.name || '';
    const senderPhone = body.senderPhone || body.sender_phone || '';
    const senderEmail = body.senderEmail || body.sender_email || user?.email || '';
    const senderAddress = body.senderAddress || body.sender_address || '';
    const senderCity = body.senderCity || body.sender_city || '';
    const senderState = body.senderState || body.sender_state || '';
    const senderZip = body.senderZip || body.sender_zip || '';

    const recipientName = body.recipientName || body.recipient_name || '';
    const recipientPhone = body.recipientPhone || body.recipient_phone || '';
    const recipientEmail = body.recipientEmail || body.recipient_email || '';
    const recipientAddress = body.recipientAddress || body.recipient_address || '';
    const recipientCity = body.recipientCity || body.recipient_city || '';
    const recipientState = body.recipientState || body.recipient_state || '';
    const recipientZip = body.recipientZip || body.recipient_zip || '';

    const packageWeight = Number(body.packageWeight || body.package_weight || body.weight || 1.0);
    const packageLength = Number(body.packageLength || body.length || 10.0);
    const packageWidth = Number(body.packageWidth || body.width || 10.0);
    const packageHeight = Number(body.packageHeight || body.height || 10.0);
    const packageType = body.packageType || body.package_type || 'BOX';
    const packageDescription = body.packageDescription || body.package_description || body.description || '';
    const declaredValue = Number(body.declaredValue || 0.0);

    const serviceType = String(body.serviceType || body.service_type || 'STANDARD').toUpperCase();
    const paymentMethod = body.paymentMethod || body.payment_method || 'CARD';
    const paymentStatus = body.paymentStatus || body.payment_status || 'PAID';
    const totalAmount = Number(body.totalAmount || body.total_amount || body.price || 50.0);

    const estDeliveryDate = new Date(Date.now() + (serviceType === 'EXPRESS' ? 1 : serviceType === 'SAME_DAY' ? 0 : 3) * 86400000).toISOString();

    const insertResult = await c.env.DB.prepare(
      `INSERT INTO shipments (
        tracking_number, sender_name, sender_phone, sender_email, sender_address, sender_city, sender_state, sender_zip,
        recipient_name, recipient_phone, recipient_email, recipient_address, recipient_city, recipient_state, recipient_zip,
        package_weight, package_length, package_width, package_height, package_type, package_description, declared_value,
        service_type, status, payment_status, payment_method, total_amount, estimated_delivery,
        user_id, user_email, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, 'ORDER_CREATED', ?, ?, ?, ?,
        ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )`
    ).bind(
      trackingNumber, senderName, senderPhone, senderEmail, senderAddress, senderCity, senderState, senderZip,
      recipientName, recipientPhone, recipientEmail, recipientAddress, recipientCity, recipientState, recipientZip,
      packageWeight, packageLength, packageWidth, packageHeight, packageType, packageDescription, declaredValue,
      serviceType, paymentStatus, paymentMethod, totalAmount, estDeliveryDate,
      user ? String(user.id) : null, user ? user.email : senderEmail
    ).run();

    const shipmentId = Number(insertResult.meta?.last_row_id || 1);

    // Insert Initial Tracking Event
    await c.env.DB.prepare(
      `INSERT INTO tracking_events (shipment_id, tracking_number, status, location, description, operator_name, timestamp)
       VALUES (?, ?, 'ORDER_CREATED', ?, 'Shipment created and order booked online', 'System', CURRENT_TIMESTAMP)`
    ).bind(shipmentId, trackingNumber, senderCity || 'Origin Center').run();

    const createdRecord: any = await c.env.DB.prepare('SELECT * FROM shipments WHERE id = ?').bind(shipmentId).first();
    const formatted = formatShipment(createdRecord);

    // Dispatch asynchronous email confirmation
    if (senderEmail || recipientEmail) {
      sendShipmentCreatedEmail(c.env, senderEmail || recipientEmail, formatted).catch((e) => console.warn(e));
    }

    return c.json({
      success: true,
      message: 'Shipment created successfully',
      data: formatted
    }, 201);
  } catch (err: any) {
    return c.json({ success: false, message: err.message || 'Failed to create shipment' }, 500);
  }
});

// Update Status
shipmentRouter.put('/:id/status', async (c) => {
  const id = c.req.param('id');
  const user = await getAuthenticatedUser(c);
  const body = await c.req.json();
  const { status, location, description, remarks, proofImageUrl, signatureUrl } = body;

  const current: any = await c.env.DB.prepare(
    'SELECT * FROM shipments WHERE id = ? OR tracking_number = ?'
  ).bind(id, id).first();

  if (!current) {
    return c.json({ success: false, message: 'Shipment not found' }, 404);
  }

  const isDelivered = status === 'DELIVERED';
  const actualDelivery = isDelivered ? new Date().toISOString() : current.actual_delivery;

  await c.env.DB.prepare(
    `UPDATE shipments 
     SET status = ?, 
         actual_delivery = ?, 
         proof_image_url = COALESCE(?, proof_image_url),
         signature_url = COALESCE(?, signature_url),
         updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`
  ).bind(status, actualDelivery, proofImageUrl || null, signatureUrl || null, current.id).run();

  // Add Tracking Event
  await c.env.DB.prepare(
    `INSERT INTO tracking_events (shipment_id, tracking_number, status, location, description, operator_name, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(
    current.id,
    current.tracking_number,
    status,
    location || 'In Transit Hub',
    description || remarks || `Shipment status updated to ${status}`,
    user ? user.name : 'Operator'
  ).run();

  const updated: any = await c.env.DB.prepare('SELECT * FROM shipments WHERE id = ?').bind(current.id).first();

  return c.json({
    success: true,
    message: `Shipment status updated to ${status}`,
    data: formatShipment(updated)
  });
});

// Update Shipment
shipmentRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const current: any = await c.env.DB.prepare('SELECT * FROM shipments WHERE id = ?').bind(id).first();
  if (!current) {
    return c.json({ success: false, message: 'Shipment not found' }, 404);
  }

  await c.env.DB.prepare(
    `UPDATE shipments 
     SET recipient_name = COALESCE(?, recipient_name),
         recipient_phone = COALESCE(?, recipient_phone),
         recipient_address = COALESCE(?, recipient_address),
         package_description = COALESCE(?, package_description),
         notes = COALESCE(?, notes),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(
    body.recipientName || body.recipient_name || null,
    body.recipientPhone || body.recipient_phone || null,
    body.recipientAddress || body.recipient_address || null,
    body.packageDescription || body.package_description || null,
    body.notes || null,
    id
  ).run();

  const updated = await c.env.DB.prepare('SELECT * FROM shipments WHERE id = ?').bind(id).first();
  return c.json({
    success: true,
    message: 'Shipment updated successfully',
    data: formatShipment(updated)
  });
});

// Assign Shipment
shipmentRouter.post('/:id/assign', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { driverId, driverName, vehicleId, hubId } = body;

  await c.env.DB.prepare(
    `UPDATE shipments 
     SET assigned_driver_id = COALESCE(?, assigned_driver_id),
         assigned_driver_name = COALESCE(?, assigned_driver_name),
         assigned_vehicle_id = COALESCE(?, assigned_vehicle_id),
         current_hub_id = COALESCE(?, current_hub_id),
         status = CASE WHEN status = 'ORDER_CREATED' THEN 'PICKED_UP' ELSE status END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(driverId || null, driverName || null, vehicleId || null, hubId || null, id).run();

  return c.json({
    success: true,
    message: 'Shipment assigned successfully'
  });
});

// Rate Shipment
shipmentRouter.post('/:id/rate', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { rating, feedback } = body;

  await c.env.DB.prepare(
    'UPDATE shipments SET rating = ?, feedback = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(Number(rating), feedback || '', id).run();

  return c.json({
    success: true,
    message: 'Thank you for your rating and feedback!'
  });
});

// Pricing Config - Get
shipmentRouter.get('/pricing/config', async (c) => {
  const configs = await c.env.DB.prepare('SELECT * FROM pricing_configs WHERE active = 1').all();
  return c.json({
    success: true,
    data: configs.results || []
  });
});

export default shipmentRouter;
