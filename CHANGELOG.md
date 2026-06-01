# Changelog

All notable changes to StockMate Pro will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-06-01

### ⚠️ Breaking Changes

- **Database switched to SQLite** — No longer requires PostgreSQL/MySQL server. Data is stored locally on the user's machine.
- **Redis removed** — Session management is now JWT-only (stateless).
- **Email/SMTP removed** — OTP and password reset via email are no longer available in the desktop app.
- **Web Push notifications removed** — Replaced by native in-app notifications.
- **PWA/Capacitor mobile support removed** — The app is now a desktop-only Electron application.
- **Docker deployment deprecated** — `docker-compose.yml` is retained for reference only. The desktop app runs natively.

### 🚀 Added

#### Desktop App (Electron)
- **Electron 33 desktop shell** — Cross-platform app for Windows, macOS, and Linux.
- **Automatic database setup** — SQLite database is created, migrated, and seeded on first launch.
- **Automatic Prisma migrations** — Schema migrations run automatically when the app updates to a new version.
- **Database backup before migration** — Timestamped backups are created before each migration attempt, with automatic restore on failure.
- **Local SQLite database** — No external database server required. Data stored in:
  - Windows: `%APPDATA%\StockMate Pro\data\`
  - macOS: `~/Library/Application Support/StockMate Pro/data/`
  - Linux: `~/.config/StockMate Pro/data/`

#### Auto-Update
- **Electron-updater integration** — Desktop app checks GitHub Releases for updates automatically.
- **In-app update banner** — Sticky notification banner shows download progress and prompts to restart & install.
- **User consent for downloads** — Updates are not auto-downloaded; users choose when to download and install.

#### Code Signing
- **Windows code signing** — Configured for signtool with SHA-256 and DigiCert timestamping.
- **macOS notarization** — afterSign hook using `@electron/notarize` with Apple notary service.
- **Optional signing** — All signing secrets are optional; builds work without them (with security warnings).

#### CI/CD
- **GitHub Actions pipeline** — Automated multi-platform builds (Windows NSIS, macOS DMG, Linux AppImage + deb).
- **Tag-triggered releases** — Pushing a `v*` tag triggers builds and attaches artifacts to the GitHub Release.
- **Linux dependencies** — Automatic `libfuse2` installation for AppImage builds.

### 📦 Changed

- **Prisma schema** — Migrated from PostgreSQL to SQLite provider. Enums replaced with String types for SQLite compatibility.
- **AuditLog** — `oldValue` and `newValue` fields changed from `Json` to `String` (serialized JSON).
- **All database indexes removed from schema** — SQLite handles indexing differently; indexes can be added manually if needed.
- **Seed script** — Updated to serialize `newValue` as JSON string for AuditLog entries.
- **Frontend version** — Bumped from 1.1.0 to 2.0.0.
- **Docker Compose** — Marked as legacy; only the backend service remains (with SQLite volume).
- **README.md** — Comprehensive rewrite covering desktop app setup, architecture, database, and API reference.

### 🔧 Build System

- **electron-builder 25** — Package configuration with NSIS (Windows), DMG (macOS), AppImage + deb (Linux).
- **afterPack hook** (`electron/afterPack.cjs`) — Post-build cleanup: removes tests, .env, Dockerfile, dev node_modules.
- **afterSign hook** (`electron/notarize.cjs`) — macOS notarization via Apple notary service.
- **Platform build scripts** — `npm run electron:build:win`, `:mac`, `:linux` for targeted builds.
- **GitHub signing secrets** — Documented setup for `WIN_CERT_P12`, `MAC_CERT_P12`, `APPLE_ID`, etc.

### 🐛 Fixed

- **Windows SmartScreen warning** — Addressed with code signing configuration.
- **Database path ambiguity** — `desktop-server.js` uses absolute paths to eliminate Prisma CLI vs Client resolution differences.

### 📝 Documentation

- **README.md** — Full rewrite with architecture diagram, quick start guide, API reference, and troubleshooting.
- **Code Signing docs** — Step-by-step guide for configuring Windows and macOS signing secrets.
- **Environment Variables** — Updated to reflect SQLite-only configuration.
- **Default Login Credentials** — Documented for all 4 roles.

---

## [1.1.0] - 2025-01-15

### Added
- Multi-language support (English, Hindi, Marathi)
- PWA support with offline capabilities
- Capacitor-based Android and iOS apps
- Push notifications via Web Push API
- Email notifications (OTP, password reset)
- Redis-based session management

### Changed
- MySQL database backend
- Docker Compose deployment with MySQL

---

## [1.0.0] - 2025-01-01

### Added
- Initial release
- Inventory management with SKU, barcode, categories
- Sales and billing with GST invoices
- Purchase order management
- Customer and supplier ledger tracking
- Employee attendance
- Expense tracking
- Dashboard with charts and analytics
- PDF generation for invoices, POs, reports
- JWT authentication with role-based access
- Multi-branch support
