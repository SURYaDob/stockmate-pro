#!/usr/bin/env node
/**
 * StockMate Pro — Desktop Server Entry Point
 *
 * This script is used by Electron to start the backend server.
 * It handles:
 * 1. Running Prisma migrations (with backup & drift detection)
 * 2. Seeding the database if empty
 * 3. Starting the Express server
 *
 * On app update, new migrations are automatically applied.
 * A backup of the database is created before any migration to protect user data.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ─── Configuration ──────────────────────────────────────────────────────────

const MIGRATION_BACKUP_DIR = 'migration-backups';
const MAX_BACKUPS = 5; // Keep at most 5 backups to save disk space

// ─── Database Path Helper ───────────────────────────────────────────────────

/**
 * Always resolve to an absolute SQLite path.
 * Prisma CLI resolves `file:` relative to schema.prisma,
 * while PrismaClient resolves it relative to CWD.
 * Using an absolute path eliminates this ambiguity.
 */
function resolveDbUrl() {
  const dbPath = path.join(__dirname, 'prisma', 'stockmate.db');
  return `file:${dbPath}`;
}

function getDbFilePath() {
  return path.join(__dirname, 'prisma', 'stockmate.db');
}

// ─── Load environment ───────────────────────────────────────────────────────

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

// Always force the correct absolute DATABASE_URL for SQLite
process.env.DATABASE_URL = resolveDbUrl();

// Set production defaults (only if not already set)
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || '5000';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'stockmate-electron-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'stockmate-electron-refresh-secret';
process.env.JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
process.env.JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5001';
process.env.BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// ─── Backup Helpers ─────────────────────────────────────────────────────────

/**
 * Creates a timestamped backup of the SQLite database before migration.
 * Returns the backup file path, or null if no backup was created.
 */
function createBackup() {
  const dbPath = getDbFilePath();
  if (!fs.existsSync(dbPath)) {
    console.log('[Desktop] No existing database to back up.');
    return null;
  }

  const backupDir = path.join(__dirname, MIGRATION_BACKUP_DIR);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPrefix = path.join(backupDir, `stockmate-${timestamp}`);

  try {
    // Copy the main database file
    fs.copyFileSync(dbPath, `${backupPrefix}.db`);
    // Also copy WAL and SHM files if they exist (SQLite WAL mode)
    for (const ext of ['-wal', '-shm']) {
      const src = dbPath + ext;
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, `${backupPrefix}.db${ext}`);
      }
    }
    console.log(`[Desktop] Database backed up to: stockmate-${timestamp}.db`);
    pruneOldBackups(backupDir);
    return backupPrefix;
  } catch (err) {
    console.error(`[Desktop] Backup failed: ${err.message}`);
    return null;
  }
}

/**
 * Removes old backups, keeping only the most recent ones.
 */
function pruneOldBackups(backupDir) {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('stockmate-') && f.endsWith('.db'))
      .sort()
      .reverse(); // newest first

    if (files.length > MAX_BACKUPS) {
      for (const file of files.slice(MAX_BACKUPS)) {
        const base = path.join(backupDir, file);
        // Remove main db file and any associated WAL/SHM files
        for (const suffix of ['', '-wal', '-shm']) {
          try { fs.unlinkSync(base + suffix); } catch { /* ignore */ }
        }
        console.log(`[Desktop] Pruned old backup: ${file}`);
      }
    }
  } catch { /* ignore pruning errors */ }
}

/**
 * Restores the database from a backup file.
 */
function restoreBackup(backupPrefix) {
  if (!backupPrefix) {
    console.error('[Desktop] No backup available to restore.');
    return false;
  }

  const dbPath = getDbFilePath();
  try {
    const backupDb = `${backupPrefix}.db`;
    if (!fs.existsSync(backupDb)) {
      console.error('[Desktop] Backup file not found:', backupDb);
      return false;
    }
    // Restore the main database file
    fs.copyFileSync(backupDb, dbPath);
    // Also restore WAL and SHM files if they were backed up
    for (const ext of ['-wal', '-shm']) {
      const src = backupDb + ext;
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dbPath + ext);
      } else {
        // Remove stale WAL/SHM from the current DB if no backup exists
        try { fs.unlinkSync(dbPath + ext); } catch { /* ignore */ }
      }
    }
    console.log('[Desktop] Database restored from backup.');
    return true;
  } catch (err) {
    console.error(`[Desktop] Restore failed: ${err.message}`);
    return false;
  }
}

// ─── Database Setup ─────────────────────────────────────────────────────────

async function setupDatabase() {
  console.log('[Desktop] Setting up local SQLite database...');
  console.log(`[Desktop] Database URL: ${process.env.DATABASE_URL}`);

  const dbPath = getDbFilePath();
  const isFirstRun = !fs.existsSync(dbPath);

  try {
    // 1. Generate Prisma client (always, in case of version mismatch)
    console.log('[Desktop] Generating Prisma client...');
    execSync('npx prisma generate', {
      cwd: __dirname,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });

    if (isFirstRun) {
      // 2a. First run: apply all migrations and seed
      console.log('[Desktop] First run detected — applying all migrations...');
      execSync('npx prisma migrate deploy', {
        cwd: __dirname,
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      });

      console.log('[Desktop] Seeding database with sample data...');
      execSync('node prisma/seed.js', {
        cwd: __dirname,
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      });
      console.log('[Desktop] Database seeded successfully!');
    } else {
      // 2b. Existing database: backup then migrate
      const backupPrefix = createBackup();

      // Apply pending migrations (safe — only runs migrations not yet applied)
      console.log('[Desktop] Applying pending migrations...');
      try {
        execSync('npx prisma migrate deploy', {
          cwd: __dirname,
          stdio: 'inherit',
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        });
        console.log('[Desktop] Migrations applied successfully.');
      } catch (migrateErr) {
        console.error('[Desktop] Migration failed:', migrateErr.message);

        // Attempt to restore from backup
        if (backupPrefix) {
          console.warn('[Desktop] Restoring database from backup...');
          if (restoreBackup(backupPrefix)) {
            console.warn('[Desktop] Database restored successfully.');
          }
        }
        // Exit with clear error — don't start server with broken schema
        console.error('[Desktop] Cannot start server after migration failure. Please reinstall the app or restore the database manually.');
        process.exit(1);
      }
    }

    // 3. Log database stats
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const counts = await prisma.$transaction([
      prisma.user.count(),
      prisma.inventory.count(),
      prisma.sale.count(),
      prisma.purchase.count(),
    ]);
    console.log(`[Desktop] Database stats: ${counts[0]} users, ${counts[1]} items, ${counts[2]} sales, ${counts[3]} purchases`);
    await prisma.$disconnect();

    console.log('[Desktop] Database setup complete!');
  } catch (error) {
    console.error('[Desktop] Database setup failed:', error.message);
    throw error;
  }
}

// ─── Server Startup ─────────────────────────────────────────────────────────

async function startServer() {
  try {
    // Setup database (migrations + seed)
    await setupDatabase();

    // Start the Express server
    console.log('[Desktop] Starting Express server...');
    require('./src/index.js');
  } catch (error) {
    console.error('[Desktop] Failed to start server:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  startServer();
}

module.exports = { startServer, setupDatabase };
