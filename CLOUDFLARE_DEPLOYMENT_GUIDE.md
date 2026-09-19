# ShipFast Cloudflare Deployment Guide (D1 + R2 + Worker API)

This guide walks you through deploying the complete **ShipFast** application onto **Cloudflare**, utilizing:
* **Cloudflare Workers**: High-performance edge API backend covering 100% of authentication, shipments, operations, communications, admin, and reporting.
* **Cloudflare D1**: Serverless SQLite database on the edge.
* **Cloudflare R2**: Object storage for parcel images, signature proofs, and receipts.
* **Resilient Email Engine**: Solves the previous Render SMTP socket timeout/blocking issues with support for Resend, MailChannels, SendGrid, and safe fallback.

---

## 🛠️ Prerequisites

1. Install Node.js (v18+)
2. Login to your Cloudflare account via Wrangler CLI:
   ```bash
   npx wrangler login
   ```

---

## 🚀 Step 1: Create Cloudflare D1 Database

Run the following command to create your serverless D1 database:

```bash
npx wrangler d1 create shipfast-d1
```

**Output will look like:**
```text
✅ Successfully created DB 'shipfast-d1'!

[[d1_databases]]
binding = "DB"
database_name = "shipfast-d1"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy the generated `database_id` and paste it into [wrangler.toml](file:///d:/ACADEMICS/PROJECT/shipfast-cloudeflare/ShipFast-New/wrangler.toml):

```toml
[[d1_databases]]
binding = "DB"
database_name = "shipfast-d1"
database_id = "YOUR_GENERATED_DATABASE_ID"
migrations_dir = "migrations"
```

---

## 📦 Step 2: Create Cloudflare R2 Storage Bucket

Run the following command to create your R2 bucket for parcel pictures and document storage:

```bash
npx wrangler r2 bucket create shipfast-storage
```

*(Your `wrangler.toml` is already pre-configured to bind this bucket as `R2_BUCKET`)*.

---

## 🗄️ Step 3: Apply Database Schema Migrations

Apply the database schema, tables, indices, and initial seed data to your Cloudflare D1 database:

### For Remote Cloudflare Deployment:
```bash
npm run cf:migrate:remote
```

### For Local Development Testing:
```bash
npm run cf:migrate:local
```

---

## ✉️ Step 4: Configure Email Delivery (Fixing SMTP Issue)

Cloudflare Workers run in serverless V8 isolates where traditional blocking TCP port 587/25 SMTP sockets are blocked by many cloud networks. 

ShipFast now includes a multi-strategy email engine:
1. **Resend HTTP API** (Recommended & Free):
   Get an API key from [resend.com](https://resend.com) and set it as a Cloudflare Worker secret:
   ```bash
   npx wrangler secret put RESEND_API_KEY
   ```
2. **SendGrid API** (Optional):
   ```bash
   npx wrangler secret put SENDGRID_API_KEY
   ```
3. **MailChannels / Safe Mock Fallback**:
   If no API key is provided, the application will automatically fall back to MailChannels or log OTPs cleanly in Cloudflare Worker logs, ensuring registration and OTP resets **never fail, hang, or block users**.

---

## ⚡ Step 5: Deploy the Backend Worker to Cloudflare

Deploy your edge API server:

```bash
npm run cf:deploy
```

Your API will be deployed globally and Wrangler will output your live URL (e.g., `https://shipfast-backend.<your-subdomain>.workers.dev`).

---

## 🌐 Step 6: Deploy Frontend to Cloudflare Pages

1. Build the production React / Vite frontend bundle:
   ```bash
   npm run build
   ```

2. Deploy the `./dist` folder to Cloudflare Pages:
   ```bash
   npm run pages:deploy
   ```
   *(Or connect your GitHub repository directly in the Cloudflare Pages dashboard with build command `npm run build` and build output directory `dist`)*.

---

## 💻 Local Development Workflow

To run the complete full-stack environment locally:

1. In Terminal 1, start the Cloudflare Worker API with local D1 & R2 emulation:
   ```bash
   npm run cf:dev
   ```
   *(Runs on `http://localhost:8787`)*

2. In Terminal 2, start the Vite frontend:
   ```bash
   npm run dev
   ```
   *(Runs on `http://localhost:5173` and automatically proxies `/api` calls to `http://localhost:8787`)*.

---

## 🔑 Default Seed Admin Credentials
* **Email:** `admin@shipfast.com`
* **Password:** `Admin@123` (or any new account registered via the `/register` page)
