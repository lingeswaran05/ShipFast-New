# ShipFast MERN Backend 🚀

Unified **Node.js + Express + MongoDB** backend for ShipFast Logistics Platform.

---

## 🌟 Highlights
- **100% Contract-Compatible** with existing React frontend (`/api/v1/auth`, `/api/v1/roles`, `/api/v1/shipments`, `/api/operations`, `/api/admin`, `/api/notifications`, `/api/support`, `/api/reports`).
- **Ultra Lightweight**: Replaces 7 heavy Java Spring Boot microservices (~3.5 GB RAM) with a single ~80MB Node.js service.
- **1-Click Deploy Ready**: Deploy to **Vercel** (Serverless API), **Render**, **Railway**, or **Supabase/MongoDB Atlas**.

---

## 📁 Directory Structure
```
mern-backend/
├── api/
│   └── index.js              # Serverless entry point (Vercel / Cloudflare)
├── src/
│   ├── config/
│   │   └── db.js             # Mongoose connection with caching
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── roleRequestController.js
│   │   ├── shipmentController.js
│   │   ├── operationsController.js
│   │   ├── adminController.js
│   │   ├── communicationsController.js
│   │   └── reportingController.js
│   ├── middleware/
│   │   ├── auth.js           # JWT verification & RBAC
│   │   └── errorHandler.js   # Global exception formatter
│   ├── models/
│   │   ├── User.js
│   │   ├── RoleRequest.js
│   │   ├── Shipment.js
│   │   ├── PricingConfig.js
│   │   ├── AgentProfile.js
│   │   ├── RunSheet.js
│   │   ├── Branch.js
│   │   ├── Vehicle.js
│   │   ├── Notification.js
│   │   ├── SupportTicket.js
│   │   └── CashCollection.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── roleRoutes.js
│   │   ├── shipmentRoutes.js
│   │   ├── publicRoutes.js
│   │   ├── operationsRoutes.js
│   │   ├── adminRoutes.js
│   │   ├── notificationRoutes.js
│   │   ├── supportRoutes.js
│   │   └── reportingRoutes.js
│   ├── services/
│   │   └── emailService.js   # Nodemailer & Resend email dispatch
│   └── utils/
│       ├── idGenerators.js   # Unique ID generators
│       ├── otpGenerator.js   # 6-digit OTP utility
│       ├── rateCalculator.js # Dynamic shipping rate algorithm
│       └── seedData.js       # Database seeder
├── .env
├── .env.example
├── package.json
├── server.js                 # Standalone Express Server
└── vercel.json               # Vercel deployment configuration
```

---

## ⚙️ Environment Variables (`.env`)
```env
PORT=8088
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/shipfast
JWT_SECRET=c2hpcGZhc3Qtc2VjcmV0LWtleS1zaGlwZmFzdC1rZXk=
JWT_EXPIRATION=3600000
REFRESH_TOKEN_EXPIRATION_DAYS=7

# Mail Configuration (Gmail SMTP or Resend)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=linwan2508@gmail.com
MAIL_PASSWORD=wwipxuylrsegganx
MAIL_FROM=ShipFast Courier <linwan2508@gmail.com>

# Optional Resend API Key
RESEND_API_KEY=
RESEND_FROM_EMAIL=ShipFast <onboarding@resend.dev>

# CORS Origins
CORS_ORIGINS=http://localhost:5173,https://shipfast-hazel.vercel.app,https://shipfast-new.onrender.com
```

---

## 🏃 Running Locally

### 1. Seed Initial Data (Admin, Branches, Vehicles, Pricing)
```bash
npm --prefix mern-backend run seed
```
*Default Admins:* 
- `lingesw0561@gmail.com` / `AdminPassword123!`
- `admin@shipfast.com` / `AdminPassword123!`

### 2. Start Both Backend & Frontend
```powershell
.\start-mern.ps1
```
Or run individually:
- Backend: `npm run dev:backend` (runs on `http://localhost:8088`)
- Frontend: `npm run dev` (runs on `http://localhost:5173`)

---

## 🚀 Deployment Options

### Option 1: Vercel (Serverless Backend)
1. Import the repository into Vercel.
2. Set Root Directory to `mern-backend`.
3. Add Environment Variables (`MONGODB_URI` from MongoDB Atlas, `JWT_SECRET`, `MAIL_*`).
4. Deploy!

### Option 2: Render / Railway / Supabase
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Port**: `8088` or `$PORT`
