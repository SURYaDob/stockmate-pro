# StockMate Pro — Desktop Application

**Complete inventory management for hardware, construction, and maintenance businesses.**

StockMate Pro is a cross-platform desktop application built with **Electron**, **React**, **Express.js**, and **SQLite**. It runs entirely on your local machine with no external database server required — your data stays on your computer.

---

## 📑 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start (Development)](#quick-start-development)
- [Building the Desktop App](#building-the-desktop-app)
- [Database](#database)
- [API Reference](#api-reference)
- [Default Login Credentials](#default-login-credentials)
- [Project Structure](#project-structure)
- [Desktop App Details](#desktop-app-details)
- [Testing](#testing)
- [Environment Variables](#environment-variables)
- [Code Signing & CI/CD](#-code-signing--cicd)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## ✨ Features

### Core Business
- **📦 Inventory Management** — SKU, barcode, categories, stock levels, low-stock alerts
- **💰 Sales & Billing** — GST invoices, multiple payment methods (Cash/UPI/Card/Credit), invoice PDF generation
- **📋 Purchase Management** — Purchase orders, supplier tracking, stock receiving, ledger entries
- **👥 Customer Management** — Full CRUD, customer ledger, credit notes, payment tracking
- **🚚 Supplier Management** — Supplier ledger, payment tracking, credit limits
- **💳 Expense Tracking** — Categories, recurring expenses, date filtering
- **👷 Employee Management** — Attendance tracking, clock in/out

### Reporting & Analytics
- **📊 Dashboard** — Live charts (monthly sales, profit trend, category breakdown, top-selling items)
- **📈 Reports** — GST reports, P&L, inventory valuation, low-stock, dead-stock, audit logs
- **📄 PDF Export** — Invoices, purchase orders, inventory lists, supplier/customer profiles

### Desktop App
- **🖥️ Cross-platform** — Windows, macOS, and Linux
- **💾 Local SQLite Database** — No external database server required
- **🚀 Auto-setup** — Database migrations and seeding run automatically on first launch
- **🔒 Secure** — JWT authentication with role-based access (Admin, Store Manager, Staff, Accountant)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│           Electron Main Process         │
│  ┌───────────────┐  ┌────────────────┐  │
│  │ Express.js    │  │ Frontend       │  │
│  │ Backend API   │  │ (React + Vite) │  │
│  │ Port: 5000    │  │ Port: 5001     │  │
│  └───────┬───────┘  └────────────────┘  │
│          │                               │
│  ┌───────▼───────┐                      │
│  │ Prisma ORM    │                      │
│  └───────┬───────┘                      │
│          │                               │
│  ┌───────▼───────┐                      │
│  │ SQLite DB     │                      │
│  │ (Local File)  │                      │
│  └───────────────┘                      │
└─────────────────────────────────────────┘
```

**How it works:**
1. Electron starts the backend server as a child process
2. The backend auto-runs SQLite migrations and seeds data if the database is empty
3. The frontend is served from the built `dist/` folder
4. Both processes communicate via localhost HTTP

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Desktop Shell** | Electron 33 |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, Zustand |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite via Prisma ORM |
| **Auth** | JWT (access + refresh tokens), bcryptjs |
| **Charts** | Recharts |
| **PDF** | PDFKit |
| **Testing** | Jest (backend), Vitest (frontend) |

---

## 🚀 Quick Start (Development)

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- npm (comes with Node.js)

### 1. Clone & Install

```bash
git clone <repository-url>
cd freelance

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Set Up Database

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Create SQLite database & run migrations
npx prisma migrate dev --name init

# Seed the database with sample data
node prisma/seed.js
```

### 3. Start Development Mode

```bash
# Terminal 1: Start backend (port 5000)
cd backend
npm run dev

# Terminal 2: Start frontend (port 3000)
cd frontend
npm run dev
```

### 4. Start in Electron (Development)

```bash
cd frontend
npm run electron:dev
```

### 5. Open in Browser

Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🖥️ Building the Desktop App

### Build for Windows

```bash
cd frontend
npm run build          # Build the React frontend
npx electron-builder --win --x64
```

Output: `frontend/release/StockMate-Pro-Setup-2.0.0.exe`

### Build for macOS

```bash
cd frontend
npm run build
npx electron-builder --mac
```

Output: `frontend/release/StockMate-Pro-2.0.0.dmg`

### Build for Linux

```bash
cd frontend
npm run build
npx electron-builder --linux
```

Output: `frontend/release/StockMate-Pro-2.0.0.AppImage`

### One-Command Build

```bash
cd frontend
npm run electron:build
```

---

## 💾 Database

### Local SQLite
- **Development**: `backend/prisma/stockmate.db`
- **Production (Desktop App)**: Stored in your OS user data directory:
  - **Windows**: `%APPDATA%/StockMate Pro/data/stockmate.db`
  - **macOS**: `~/Library/Application Support/StockMate Pro/data/stockmate.db`
  - **Linux**: `~/.config/StockMate Pro/data/stockmate.db`

### Auto-Setup
The desktop app automatically handles:
1. ✅ SQLite database creation
2. ✅ Schema migrations
3. ✅ Seeding default data (users, products, suppliers, customers)

### Manual Database Operations

```bash
cd backend

# Reset database (WARNING: deletes all data)
npx prisma db push --force-reset
node prisma/seed.js

# View database in Prisma Studio
npx prisma studio

# Create a new migration after schema changes
npx prisma migrate dev --name <migration-name>
```

### Database Schema Highlights

| Entity | Description |
|--------|------------|
| User | 4 roles: ADMIN, STORE_MANAGER, STAFF, ACCOUNTANT |
| Branch | Multi-branch support |
| Inventory | 50+ product fields including SKU, GST, stock levels |
| Sale / Purchase | Full transaction lifecycle with line items |
| Supplier / Customer | Ledger-based payment tracking |
| Employee | Attendance with clock in/out |
| AuditLog | Full activity tracking |

---

## 🔌 API Reference

### Base URL
- **Development**: `http://localhost:5000/api`
- **Desktop App**: `http://localhost:5000/api` (internal)

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login with email & password |
| POST | `/api/auth/logout` | Logout (invalidate token) |
| POST | `/api/auth/refresh-token` | Refresh access token |
| POST | `/api/auth/send-otp` | Send OTP for password reset |
| POST | `/api/auth/verify-otp` | Verify OTP code |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/profile` | Update user profile |

### Inventory Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/inventory` | List all items (with filters) |
| GET | `/api/inventory/:id` | Get item details |
| POST | `/api/inventory` | Create new item |
| PUT | `/api/inventory/:id` | Update item |
| DELETE | `/api/inventory/:id` | Delete item |
| GET | `/api/inventory/:id/pdf` | Generate item PDF |
| GET | `/api/inventory/export/pdf` | Export inventory list as PDF |

### Sales Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sales` | List all sales |
| GET | `/api/sales/:id` | Get sale details |
| POST | `/api/sales` | Create a new sale |
| GET | `/api/sales/:id/pdf` | Generate invoice PDF |

### Purchase Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/purchases` | List all purchases |
| GET | `/api/purchases/:id` | Get purchase details |
| POST | `/api/purchases` | Create purchase order |
| PUT | `/api/purchases/:id/status` | Update PO status |
| GET | `/api/purchases/:id/pdf` | Generate PO PDF |

### Supplier Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/suppliers` | List all suppliers |
| GET | `/api/suppliers/:id` | Get supplier details |
| POST | `/api/suppliers` | Create supplier |
| PUT | `/api/suppliers/:id` | Update supplier |
| GET | `/api/suppliers/:id/pdf` | Generate supplier PDF |
| GET | `/api/suppliers/:id/ledger` | Get supplier ledger |
| GET | `/api/suppliers/export/pdf` | Export supplier list |

### Customer Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List all customers |
| GET | `/api/customers/:id` | Get customer details |
| POST | `/api/customers` | Create customer |
| PUT | `/api/customers/:id` | Update customer |
| GET | `/api/customers/:id/pdf` | Generate customer PDF |
| GET | `/api/customers/:id/ledger` | Get customer ledger |

### Dashboard & Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Dashboard summary stats |
| GET | `/api/dashboard/monthly-sales` | Monthly sales data (6 months) |
| GET | `/api/dashboard/category-stock` | Stock by category |
| GET | `/api/dashboard/top-selling` | Top selling items (30 days) |
| GET | `/api/dashboard/profit-trend` | Profit trend data |

### Other Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses` | List expenses |
| POST | `/api/expenses` | Create expense |
| GET | `/api/employees` | List employees |
| POST | `/api/employees` | Create employee |
| GET | `/api/notifications` | List notifications |
| GET | `/api/audit` | Audit logs |
| GET | `/api/health` | Health check |
| GET | `/api/settings/company` | Company profile |
| PUT | `/api/settings/company` | Update company profile |

### Browser Testing Links

| Test | URL |
|------|-----|
| Health Check | [http://localhost:5000/api/health](http://localhost:5000/api/health) |
| Login | [http://localhost:5000/api/auth/login](http://localhost:5000/api/auth/login) |
| Dashboard API | [http://localhost:5000/api/dashboard/summary](http://localhost:5000/api/dashboard/summary) |
| Inventory API | [http://localhost:5000/api/inventory](http://localhost:5000/api/inventory) |

> **Note**: All endpoints except `/auth/login`, `/auth/register`, and `/health` require a valid JWT Bearer token in the `Authorization` header.

---

## 🔑 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@stockmate.com` | `Admin@123` |
| Store Manager | `manager@stockmate.com` | `Manager@123` |
| Staff | `staff@stockmate.com` | `Staff@123` |
| Accountant | `accountant@stockmate.com` | `Accountant@123` |

---

## 📁 Project Structure

```
freelance/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema (SQLite)
│   │   ├── seed.js                # Seed data (50 products, 5 suppliers, etc.)
│   │   └── migrations/            # SQLite migrations
│   ├── src/
│   │   ├── controllers/           # Route handlers
│   │   ├── middleware/             # Auth, error handling
│   │   ├── routes/                 # Express routes
│   │   ├── services/               # Business logic
│   │   ├── templates/              # Email templates
│   │   ├── utils/                  # Prisma client, PDF, mail, etc.
│   │   └── index.js                # Express server entry
│   ├── tests/                      # Jest test suites
│   ├── desktop-server.js           # Electron server entry (auto-setup)
│   ├── .env                        # Environment config (SQLite)
│   └── package.json
│
├── frontend/
│   ├── electron/
│   │   ├── main.js                 # Electron main process
│   │   └── preload.js              # Secure preload script
│   ├── src/
│   │   ├── components/             # React components
│   │   ├── pages/                  # Page components
│   │   ├── hooks/                  # Custom hooks
│   │   ├── store/                  # Zustand state stores
│   │   ├── utils/                  # API client, helpers
│   │   ├── i18n/                   # Translations
│   │   ├── App.jsx                 # Root component
│   │   └── main.jsx                # Entry point
│   ├── tests/                      # Vitest test suites
│   ├── dist/                       # Built frontend
│   ├── release/                    # Built desktop app installers
│   ├── vite.config.js              # Vite configuration
│   └── package.json
│
└── README.md                       # This file
```

---

## 🖥️ Desktop App Details

### How the Desktop App Works

1. **Launch**: Double-click the installed app (or `npm run electron:start` in dev)
2. **Auto-Setup**: On first launch, the app:
   - Creates the SQLite database in your user data directory
   - Runs all pending Prisma migrations
   - Seeds the database with sample data (users, products, suppliers)
3. **Server Start**: The backend Express server starts on port 5000
4. **Frontend Load**: The React UI loads from port 5001
5. **Ready**: The app is ready to use — log in with the default credentials

### App Data Location

Your data is stored locally on your machine:

| OS | Path |
|----|------|
| Windows | `%APPDATA%\StockMate Pro\data\` |
| macOS | `~/Library/Application Support/StockMate Pro/data/` |
| Linux | `~/.config/StockMate Pro/data/` |

### Uninstalling

- **Windows**: Use "Add or Remove Programs" or run the uninstaller
- **macOS**: Drag the app from Applications to Trash
- **Linux**: Remove the AppImage and `~/.config/StockMate Pro/`

> **Note**: Uninstalling removes the app but preserves your data folder. To fully clean up, manually delete the data directory listed above.

---

## 🧪 Testing

### Backend Tests (Jest)

```bash
cd backend
npm test                    # Run all tests
npm run test:watch          # Watch mode
```

**Test Coverage:**
- 30 tests covering:
  - Email notification service (low stock alerts)
  - PDF generation (sales, purchases, inventory, suppliers, customers, expenses)
  - API authentication & authorization
  - Bulk PDF export endpoints

### Frontend Tests (Vitest)

```bash
cd frontend
npm test                    # Run all tests
npm run test:watch          # Watch mode
```

**Test Coverage:**
- 16 tests covering:
  - PDF download from SaleDetail, PurchaseDetail, InventoryDetail
  - PDF download from SupplierDetail, CustomerDetail
  - Bulk PDF export from InventoryList, SupplierList, Expenses

---

## ⚙️ Environment Variables

### Backend (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Backend server port |
| `NODE_ENV` | `production` | Environment mode |
| `DATABASE_URL` | `file:./stockmate.db` | SQLite database path |
| `JWT_ACCESS_SECRET` | — | Secret for access tokens |
| `JWT_REFRESH_SECRET` | — | Secret for refresh tokens |
| `JWT_ACCESS_EXPIRY` | `15m` | Access token expiry |
| `JWT_REFRESH_EXPIRY` | `7d` | Refresh token expiry |
| `FRONTEND_URL` | `http://localhost:5001` | Frontend URL for CORS |
| `BACKEND_URL` | `http://localhost:5000` | Backend URL |
| `MAX_FILE_SIZE` | `5242880` | Max upload file size (5MB) |
| `UPLOAD_DIR` | `./uploads` | Upload directory |
| `DEFAULT_GST_RATE` | `18` | Default GST rate |
| `STATE_CODE` | `27` | State code (Maharashtra) |

---

## 🔐 Code Signing & CI/CD

### GitHub Actions Secrets

The project includes a GitHub Actions workflow (`.github/workflows/build.yml`) that automatically builds signed installers for Windows, macOS, and Linux when you push a version tag (e.g., `v2.0.0`).

To enable code signing, configure the following secrets in your GitHub repository under **Settings → Secrets and variables → Actions → Repository secrets**:

#### Windows Code Signing

| Secret | Description | How to Get It |
|--------|-------------|---------------|
| `WIN_CERT_P12` | Code signing certificate (base64-encoded `.p12` file) | Purchase from a [Certificate Authority](https://www.digicert.com/code-signing/) (e.g., DigiCert, Sectigo), then encode: `base64 -i cert.p12 \| pbcopy` (macOS) or `certutil -encode cert.p12 cert.txt` (Windows) |
| `WIN_CERT_PASSWORD` | Password for the `.p12` certificate file | Set when exporting the certificate |

#### macOS Code Signing & Notarization

| Secret | Description | How to Get It |
|--------|-------------|---------------|
| `MAC_CERT_P12` | Developer ID certificate (base64-encoded `.p12` file) | Export from **Xcode → Accounts → Download Certificates** or [Apple Developer portal](https://developer.apple.com/account/resources/certificates). Encode as base64 (same as Windows). |
| `MAC_CERT_PASSWORD` | Password for the `.p12` certificate file | Set when exporting the certificate |
| `APPLE_ID` | Your Apple Developer account email | e.g., `developer@example.com` |
| `APPLE_APP_PASSWORD` | App-specific password for notarization | Generate at [appleid.apple.com → Sign-In and Security → App-Specific Passwords](https://appleid.apple.com/account/manage) |
| `APPLE_TEAM_ID` | Apple Developer Team ID | Found at [Apple Developer account](https://developer.apple.com/account/) → Membership details |

> **Note:** `GITHUB_TOKEN` is provided automatically by GitHub Actions — no configuration needed.

#### Setting Secrets via GitHub CLI

```bash
# Windows
github secret set WIN_CERT_P12 < cert.p12.base64
github secret set WIN_CERT_PASSWORD --body 'your-password'

# macOS
github secret set MAC_CERT_P12 < cert.p12.base64
github secret set MAC_CERT_PASSWORD --body 'your-password'
github secret set APPLE_ID --body 'developer@example.com'
github secret set APPLE_APP_PASSWORD --body 'xxxx-xxxx-xxxx-xxxx'
github secret set APPLE_TEAM_ID --body 'XXXXXXXXXX'
```

#### Setting Secrets via GitHub Web UI

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the secret name and value
5. Click **Add secret**

### Building Without Code Signing

All signing secrets are optional. If not configured:
- **Windows**: The installer builds successfully but shows a SmartScreen warning on first run. Click "More info" → "Run anyway".
- **macOS**: The app builds successfully but triggers a Gatekeeper warning. Right-click → Open to bypass.
- **Linux**: No code signing required (AppImage and deb work out of the box).

### Creating a Release Build

```bash
# Tag a release and push
git tag v2.0.0
git push origin v2.0.0
```

The GitHub Actions workflow will automatically:
1. Build signed installers for Windows (NSIS `.exe`), macOS (`.dmg`), and Linux (`.AppImage` + `.deb`)
2. Upload them as build artifacts
3. Attach them to the GitHub Release page

You can also trigger a build manually from the **Actions** tab → **Build Electron App** → **Run workflow**.

---

## 🔧 Troubleshooting

### "Backend server failed to start within timeout"
- Ensure port 5000 is not in use by another process
- Try deleting `backend/prisma/stockmate.db` and restarting

### "Database is locked" error
- Close any other instances of the app
- Check if Prisma Studio is open (`npx prisma studio`)

### Build fails with "Module not found"
```bash
cd backend && npm install && npx prisma generate
cd frontend && npm install
```

### Electron app doesn't start
- Ensure all dependencies are installed: `cd frontend && npm install`
- Try rebuilding: `npm run electron:build`

### Windows SmartScreen warning
- Click "More info" → "Run anyway" for unsigned builds
- For production, code-sign the installer

---

## 📝 License

MIT License. See [LICENSE](LICENSE) for details.
