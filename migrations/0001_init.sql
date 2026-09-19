-- Cloudflare D1 Migration Schema for ShipFast
-- File: migrations/0001_init.sql

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CUSTOMER',
  status TEXT DEFAULT 'ACTIVE',
  avatar_url TEXT,
  phone TEXT,
  department TEXT,
  address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS role_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  user_email TEXT NOT NULL,
  user_name TEXT,
  requested_role TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'PENDING',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Shipments & Tracking
CREATE TABLE IF NOT EXISTS shipments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracking_number TEXT NOT NULL UNIQUE,
  sender_name TEXT,
  sender_phone TEXT,
  sender_email TEXT,
  sender_address TEXT,
  sender_city TEXT,
  sender_state TEXT,
  sender_zip TEXT,
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_email TEXT,
  recipient_address TEXT,
  recipient_city TEXT,
  recipient_state TEXT,
  recipient_zip TEXT,
  package_weight REAL DEFAULT 1.0,
  package_length REAL DEFAULT 10.0,
  package_width REAL DEFAULT 10.0,
  package_height REAL DEFAULT 10.0,
  package_type TEXT DEFAULT 'BOX',
  package_description TEXT,
  declared_value REAL DEFAULT 0.0,
  service_type TEXT DEFAULT 'STANDARD',
  status TEXT DEFAULT 'ORDER_CREATED',
  payment_status TEXT DEFAULT 'PENDING',
  payment_method TEXT DEFAULT 'CARD',
  base_rate REAL DEFAULT 0.0,
  weight_charge REAL DEFAULT 0.0,
  distance_charge REAL DEFAULT 0.0,
  fuel_surcharge REAL DEFAULT 0.0,
  tax REAL DEFAULT 0.0,
  total_amount REAL DEFAULT 0.0,
  origin_hub_id TEXT,
  destination_hub_id TEXT,
  current_hub_id TEXT,
  assigned_driver_id TEXT,
  assigned_driver_name TEXT,
  assigned_vehicle_id TEXT,
  estimated_delivery DATETIME,
  actual_delivery DATETIME,
  proof_image_url TEXT,
  signature_url TEXT,
  label_url TEXT,
  notes TEXT,
  user_id TEXT,
  user_email TEXT,
  rating INTEGER,
  feedback TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_user_email ON shipments(user_email);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);

CREATE TABLE IF NOT EXISTS tracking_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id INTEGER,
  tracking_number TEXT NOT NULL,
  status TEXT NOT NULL,
  location TEXT,
  description TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  operator_name TEXT,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_tracking ON tracking_events(tracking_number);

-- 3. Pricing Configuration & Slabs
CREATE TABLE IF NOT EXISTS pricing_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_type TEXT NOT NULL UNIQUE,
  base_price REAL NOT NULL,
  per_kg_rate REAL NOT NULL,
  per_km_rate REAL NOT NULL,
  fuel_surcharge_percent REAL DEFAULT 5.0,
  tax_percent REAL DEFAULT 18.0,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pricing_slabs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_type TEXT NOT NULL,
  min_weight REAL NOT NULL,
  max_weight REAL NOT NULL,
  rate REAL NOT NULL
);

-- 4. Operations (Hubs, Routes, Vehicles, Drivers, Manifests)
CREATE TABLE IF NOT EXISTS operations_hubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  address TEXT,
  capacity INTEGER DEFAULT 10000,
  current_load INTEGER DEFAULT 0,
  contact_number TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS operations_routes (
  id TEXT PRIMARY KEY,
  route_code TEXT NOT NULL UNIQUE,
  origin_hub_id TEXT NOT NULL,
  destination_hub_id TEXT NOT NULL,
  distance_km REAL NOT NULL,
  estimated_hours REAL NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  transit_type TEXT DEFAULT 'ROAD',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  vehicle_number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  capacity_kg REAL NOT NULL,
  status TEXT DEFAULT 'AVAILABLE',
  assigned_hub_id TEXT,
  driver_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  license_number TEXT NOT NULL,
  status TEXT DEFAULT 'AVAILABLE',
  assigned_hub_id TEXT,
  vehicle_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manifests (
  id TEXT PRIMARY KEY,
  manifest_number TEXT NOT NULL UNIQUE,
  route_id TEXT,
  origin_hub_id TEXT NOT NULL,
  destination_hub_id TEXT NOT NULL,
  vehicle_id TEXT,
  driver_id TEXT,
  status TEXT DEFAULT 'CREATED',
  shipment_count INTEGER DEFAULT 0,
  total_weight_kg REAL DEFAULT 0,
  shipment_ids_json TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS runsheets (
  id TEXT PRIMARY KEY,
  run_sheet_id TEXT NOT NULL UNIQUE,
  agent_id TEXT NOT NULL,
  hub_id TEXT,
  shipment_tracking_numbers_json TEXT DEFAULT '[]',
  status TEXT DEFAULT 'CREATED',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- 5. Communications & Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  subject TEXT NOT NULL,
  category TEXT DEFAULT 'GENERAL',
  priority TEXT DEFAULT 'MEDIUM',
  status TEXT DEFAULT 'OPEN',
  tracking_number TEXT,
  messages_json TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'INFO',
  is_read INTEGER DEFAULT 0,
  link TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Reporting Snapshots & Analytics
CREATE TABLE IF NOT EXISTS report_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_date TEXT NOT NULL UNIQUE,
  total_shipments INTEGER DEFAULT 0,
  delivered_shipments INTEGER DEFAULT 0,
  in_transit_shipments INTEGER DEFAULT 0,
  exception_shipments INTEGER DEFAULT 0,
  total_revenue REAL DEFAULT 0.0,
  active_users INTEGER DEFAULT 0,
  data_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  performed_by TEXT,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Initial Seed Data
INSERT OR IGNORE INTO users (id, name, email, password, role, status, phone) 
VALUES (1, 'Admin User', 'admin@shipfast.com', '$2a$10$w09u7iE3gVzV/v3tZ7b2c.o1v6h9p2sE2tC4qZ7kL0uN1xY3pA2yO', 'ADMIN', 'ACTIVE', '+1234567890');

INSERT OR IGNORE INTO pricing_configs (id, service_type, base_price, per_kg_rate, per_km_rate, fuel_surcharge_percent, tax_percent, active)
VALUES 
(1, 'STANDARD', 50.0, 15.0, 2.5, 5.0, 18.0, 1),
(2, 'EXPRESS', 100.0, 25.0, 4.0, 7.5, 18.0, 1),
(3, 'SAME_DAY', 200.0, 40.0, 6.0, 10.0, 18.0, 1),
(4, 'OVERNIGHT', 150.0, 30.0, 5.0, 8.0, 18.0, 1),
(5, 'INTERNATIONAL', 500.0, 80.0, 10.0, 15.0, 18.0, 1);

INSERT OR IGNORE INTO operations_hubs (id, name, code, city, state, address, capacity, current_load, contact_number, status)
VALUES
('hub-1', 'Central Hub - New York', 'NYC-01', 'New York', 'NY', '100 Distribution Way, NY 10001', 50000, 12000, '+1-212-555-0100', 'ACTIVE'),
('hub-2', 'West Coast Hub - Los Angeles', 'LAX-01', 'Los Angeles', 'CA', '450 Logistics Blvd, CA 90001', 40000, 9500, '+1-213-555-0200', 'ACTIVE'),
('hub-3', 'Midwest Hub - Chicago', 'ORD-01', 'Chicago', 'IL', '320 Freight Ave, IL 60601', 35000, 7800, '+1-312-555-0300', 'ACTIVE'),
('hub-4', 'Southern Hub - Dallas', 'DFW-01', 'Dallas', 'TX', '210 Cargo Road, TX 75201', 30000, 6200, '+1-214-555-0400', 'ACTIVE');
