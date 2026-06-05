const STORAGE_KEY = 'stockmate_seen_version';

/**
 * Current app version. Bump this when deploying significant updates.
 * The 'What's new' dialog will show for users upgrading from an older version.
 */
export const APP_VERSION = '2.0.0';

/**
 * Release notes displayed in the 'What's new' dialog.
 * Add entries for each new version to inform users about changes.
 */
export const RELEASE_NOTES = {
  '2.0.0': [
    '🖥️ Cross-platform desktop app using Electron — runs on Windows, macOS, and Linux',
    '💾 Local SQLite database — no server setup required, data stays on your machine',
    '🔄 Automatic updates via GitHub Releases — always stay up to date',
    '📦 Offline-first architecture — works without internet',
    '🔐 Enhanced login with password reset flow',
    '📊 Advanced Reports — 8 report types (Sales, Purchases, P&L, GST, Inventory, Low Stock, Dead Stock, Audit)',
    '👥 Customer management with full ledger, payments, and credit notes',
    '💳 Expense tracking with category breakdown and filters',
    '👔 Employee management with attendance tracking and clock in/out',
    '📋 Purchase Order improvements — discount handling, payment tracking, stock receiving',
    '🔔 Notification system with preferences and push notifications',
    '🎨 Refined UI with dark/light theme, improved responsive design',
    '🌐 Multi-language support (English, Hindi, Marathi)',
  ],
  '1.1.0': [
    '📱 Improved PWA experience — install banner, offline indicator, and faster loading',
    '🔔 Notification dropdown in header with recent alerts and quick actions',
    '📊 Live Dashboard with Recharts — sales trends, profit charts, category breakdown',
    '📈 Advanced Reports page — 8 report types with date filters and export',
    '👥 Customer management — full CRUD with ledger, payments, and credit notes',
    '💳 Expense tracking with category breakdown and filters',
    '👔 Employee management with attendance tracking and clock in/out',
    '🔔 Notifications page with preferences',
    '⬇️ Bottom nav now includes Notifications with unread badge',
    '📦 PWA shortcuts for New Sale, Inventory, and Dashboard',
    '⚡ Performance improvements and bug fixes',
  ],
  '1.0.0': [
    '🚀 Initial release of StockMate Pro',
    '📦 Inventory management with categories, SKU, barcode, and stock tracking',
    '💰 Sales & billing with GST invoice support and multiple payment methods',
    '📋 Purchase management with supplier tracking and stock receiving',
    '👥 Supplier management with ledger and payment tracking',
    '📊 Dashboard with key metrics and stock alerts',
    '📈 Reports including GST, P&L, inventory valuation, and audit logs',
    '🔐 Role-based authentication (Admin, Store Manager, Staff, Accountant)',
    '🌙 Dark/Light mode',
    '📱 Fully responsive mobile-first design',
    '📄 PDF invoice generation and email support',
    '🔔 Low stock and dead stock alerts',
  ],
};

/**
 * Returns the version the user last saw, or null if first visit.
 */
export function getLastSeenVersion() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Marks the current version as seen by the user.
 */
export function markVersionSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, APP_VERSION);
  } catch {
    // noop
  }
}

/**
 * Checks if there are new release notes to show.
 * Returns true if the user hasn't seen this version yet.
 */
export function hasNewReleaseNotes() {
  const lastSeen = getLastSeenVersion();
  return lastSeen !== APP_VERSION;
}

/**
 * Gets the release notes for versions the user hasn't seen yet,
 * from most recent to oldest, up to the last seen version.
 */
export function getUnseenReleaseNotes() {
  const lastSeen = getLastSeenVersion();
  const versions = Object.keys(RELEASE_NOTES).sort(semverSort);
  const unseen = [];

  for (const version of versions) {
    unseen.push({ version, notes: RELEASE_NOTES[version] });
    if (version === lastSeen) break;
  }

  return unseen;
}

/**
 * Simple semver-like sort (descending).
 */
function semverSort(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pb[i] - pa[i];
  }
  return 0;
}
