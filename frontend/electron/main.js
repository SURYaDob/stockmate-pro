/**
 * StockMate Pro — Electron Main Process
 *
 * Starts the Express backend as a child process, creates the app window,
 * and handles lifecycle events. Supports both development and production modes.
 *
 * In production, the backend server is forked as a child process and
 * the built frontend dist is served locally.
 * The database is automatically migrated and seeded on first run.
 *
 * In development, it connects to the Vite dev server.
 */

const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const http = require('http');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// ─── Configuration ──────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const BACKEND_PORT = process.env.BACKEND_PORT || 5000;
const FRONTEND_DEV_PORT = process.env.FRONTEND_DEV_PORT || 3000;
const BACKEND_START_TIMEOUT = 30000; // 30 seconds max wait for backend (increased for DB setup)

// ─── State ──────────────────────────────────────────────────────────────────

let mainWindow = null;
let serverProcess = null;
let isQuitting = false;

// ─── Database Path Helper ───────────────────────────────────────────────────

/**
 * Resolves the SQLite database path based on environment.
 * In production, the database is stored in the user's app data directory.
 * In development, it's stored alongside the backend code.
 */
function getDatabaseUrl() {
  if (isDev) {
    const dbPath = path.join(__dirname, '..', '..', 'backend', 'prisma', 'stockmate.db');
    return `file:${dbPath}`;
  }
  // In production, store database in user data directory for persistence
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, 'stockmate.db');
  return `file:${dbPath}`;
}

/**
 * Resolves the path to the backend server entry point.
 * In packaged mode, the backend is bundled inside the app resources.
 */
function getBackendPath() {
  if (isDev) {
    return path.join(__dirname, '..', '..', 'backend', 'desktop-server.js');
  }
  return path.join(process.resourcesPath, 'backend', 'desktop-server.js');
}

/**
 * Returns the path to the backend directory (for Prisma, seed, etc.)
 */
function getBackendDir() {
  if (isDev) {
    return path.join(__dirname, '..', '..', 'backend');
  }
  return path.join(process.resourcesPath, 'backend');
}

// ─── Backend Server Management ──────────────────────────────────────────────

/**
 * Starts the Express backend as a forked child process.
 * The desktop-server.js handles migrations and seeding automatically.
 * Returns a promise that resolves when the server is ready.
 */
function startBackend() {
  return new Promise((resolve, reject) => {
    const backendPath = getBackendPath();
    const backendDir = getBackendDir();
    const databaseUrl = getDatabaseUrl();

    // Ensure the data directory exists for production
    if (!isDev) {
      const userDataPath = app.getPath('userData');
      const dataDir = path.join(userDataPath, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      // Also ensure uploads directory exists
      const uploadsDir = path.join(backendDir, 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
    }

    console.log(`[Electron] Starting backend from: ${backendPath}`);
    console.log(`[Electron] Database URL: ${databaseUrl}`);

    const env = {
      ...process.env,
      PORT: String(BACKEND_PORT),
      NODE_ENV: isDev ? 'development' : 'production',
      DATABASE_URL: databaseUrl,
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'stockmate-electron-access-secret',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'stockmate-electron-refresh-secret',
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
      FRONTEND_URL: `http://localhost:${isDev ? FRONTEND_DEV_PORT : BACKEND_PORT + 1}`,
      BACKEND_URL: `http://localhost:${BACKEND_PORT}`,
      // Ensure child process has access to backend directory
      PWD: backendDir,
    };

    serverProcess = fork(backendPath, [], {
      cwd: backendDir,
      env,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      silent: true,
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`[Backend] ${data.toString().trim()}`);
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Backend] ${data.toString().trim()}`);
    });

    serverProcess.on('error', (err) => {
      console.error('[Backend] Process error:', err);
      reject(err);
    });

    serverProcess.on('exit', (code) => {
      console.log(`[Backend] Process exited with code ${code}`);
      serverProcess = null;
    });

    // Poll until the backend health check passes
    const startTime = Date.now();
    const poll = () => {
      if (isQuitting) return reject(new Error('App quitting'));

      const req = http.get(`http://localhost:${BACKEND_PORT}/api/health`, (res) => {
        if (res.statusCode === 200) {
          console.log('[Backend] Server is ready');
          resolve();
        } else {
          retry();
        }
      });

      req.on('error', retry);
      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startTime > BACKEND_START_TIMEOUT) {
        reject(new Error('Backend server failed to start within timeout'));
        return;
      }
      setTimeout(poll, 500);
    };

    // Give the server a moment to start listening (longer for DB setup)
    setTimeout(poll, 2000);
  });
}

/**
 * Gracefully stops the backend server.
 */
function stopBackend() {
  if (serverProcess) {
    try {
      serverProcess.kill('SIGTERM');
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (serverProcess) {
          try { serverProcess.kill('SIGKILL'); } catch { /* ignore */ }
        }
      }, 5000);
    } catch {
      // Process already dead
    }
    serverProcess = null;
  }
}

// ─── Window Management ──────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, '..', 'public', 'icons', 'icon-512x512.svg'),
    title: 'StockMate Pro',
    backgroundColor: '#0f172a',
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: process.platform === 'darwin' ? true : true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Load the frontend
  if (isDev) {
    // Development: connect to Vite dev server
    mainWindow.loadURL(`http://localhost:${FRONTEND_DEV_PORT}`);
    mainWindow.webContents.openDevTools({ mode: 'bottom' });
  } else {
    // Production: serve from built dist using Node's built-in http server
    const serverApp = require('http').createServer((req, res) => {
      const distPath = path.join(__dirname, '..', 'dist');

      // Determine file path
      let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url);

      // SPA fallback — if file doesn't exist, serve index.html
      if (!fs.existsSync(filePath)) {
        filePath = path.join(distPath, 'index.html');
      }

      // Read and serve the file
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Internal Server Error');
          return;
        }

        // Determine content type
        const ext = path.extname(filePath);
        const mimeTypes = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.ico': 'image/x-icon',
          '.webmanifest': 'application/manifest+json',
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });

    const servePort = BACKEND_PORT + 1;
    serverApp.listen(servePort, () => {
      console.log(`[Frontend] Serving at http://localhost:${servePort}`);
      mainWindow.loadURL(`http://localhost:${servePort}`);
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent multiple windows from navigation events
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost') || url.startsWith('https://')) {
      require('electron').shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

// ─── Auto-Update ───────────────────────────────────────────────────────────

/**
 * Configures and initiates the auto-update flow.
 * Checks for updates on GitHub Releases, downloads in the background,
 * and prompts the user to restart when ready.
 */
function setupAutoUpdater() {
  // Don't check for updates in dev mode
  if (isDev) return;

  // Don't check if the app was not installed via an installer (e.g. portable)
  // electron-updater requires the app to be properly installed
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[Update] Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`[Update] Update available: v${info.version}`);
    // Notify renderer that an update is available
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
      });
    }
    // Prompt user to download
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (v${info.version}) is available.\n\nWould you like to download and install it now?`,
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Update] No updates available.');
  });

  autoUpdater.on('download-progress', (progress) => {
    const msg = `Download speed: ${Math.round(progress.bytesPerSecond / 1024)} KB/s — ${Math.round(progress.percent)}%`;
    console.log(`[Update] ${msg}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-progress', {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[Update] Update downloaded: v${info.version}`);
    // Notify renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
      });
    }
    // Prompt to restart
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: `Version v${info.version} has been downloaded.\n\nThe application needs to restart to apply the update.`,
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          stopBackend();
          autoUpdater.quitAndInstall(false, true);
        }
      });
  });

  autoUpdater.on('error', (err) => {
    console.error('[Update] Error:', err.message);
  });

  // Check for updates 3 seconds after startup (give time for window to load)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[Update] Check failed:', err.message);
    });
  }, 3000);
}

// ─── IPC Handlers ───────────────────────────────────────────────────────────

ipcMain.handle('get-app-info', () => ({
  version: app.getVersion(),
  name: app.getName(),
  platform: process.platform,
  arch: process.arch,
  electronVersion: process.versions.electron,
  nodeVersion: process.versions.node,
  isDev,
  databasePath: getDatabaseUrl(),
}));

ipcMain.handle('get-backend-url', () => `http://localhost:${BACKEND_PORT}`);

ipcMain.handle('check-for-updates', async () => {
  if (isDev) return { updateAvailable: false };
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      updateAvailable: !!result?.updateInfo,
      version: result?.updateInfo?.version,
    };
  } catch (err) {
    return { updateAvailable: false, error: err.message };
  }
});

ipcMain.handle('open-external', (_event, url) => {
  if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
    require('electron').shell.openExternal(url);
  }
});

ipcMain.handle('install-update', () => {
  if (!isDev) {
    stopBackend();
    autoUpdater.quitAndInstall(false, true);
  }
});

// ─── App Lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  try {
    // Start the backend server (handles DB setup automatically)
    if (!isDev) {
      await startBackend();
    }
    createWindow();

    // Check for app updates (non-blocking)
    setupAutoUpdater();
  } catch (err) {
    console.error('[Electron] Startup failed:', err);
    dialog.showErrorBox(
      'Startup Error',
      `StockMate Pro failed to start:\n\n${err.message}\n\nPlease try restarting the application.`
    );
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  stopBackend();
});

app.on('will-quit', () => {
  stopBackend();
});
