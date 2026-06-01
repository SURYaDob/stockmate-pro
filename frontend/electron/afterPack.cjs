/**
 * StockMate Pro — electron-builder afterPack hook
 *
 * Ensures Prisma engine binaries and node_modules are correctly
 * set up in the build output directory before packaging.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

module.exports = async function afterPack(context) {
  const appDir = context.appOutDir;
  const resourcesDir = path.join(appDir, process.platform === 'darwin'
    ? path.join('StockMate Pro.app', 'Contents', 'Resources')
    : 'resources');

  const backendDir = path.join(resourcesDir, 'backend');

  console.log('[afterPack] Post-processing build output...');

  if (!fs.existsSync(backendDir)) {
    console.warn('[afterPack] Backend directory not found in build output, skipping.');
    return;
  }

  // Note: prisma generate should be run as a pre-build step (before electron-builder)
  // to generate engine binaries for the correct target platform.

  // 1. Remove unnecessary files from backend to reduce bundle size
  const removePatterns = [
    'tests',
    '.env',
    '.env.example',
    '.env.temp',
    '.dockerignore',
    'Dockerfile',
    'jest.config.js',
    'nul',
  ];

  for (const pattern of removePatterns) {
    const target = path.join(backendDir, pattern);
    if (fs.existsSync(target)) {
      const stat = fs.statSync(target);
      if (stat.isDirectory()) {
        fs.rmSync(target, { recursive: true, force: true });
      } else {
        fs.unlinkSync(target);
      }
      console.log(`[afterPack] Removed: ${pattern}`);
    }
  }

  // 3. Remove dev-only node_modules directories to reduce size
  // Only remove packages that are strictly dev-only.
  // .prisma must NOT be removed — it contains the generated client + engine binaries.
  const devModules = [
    'eslint',
    'jest',
    'supertest',
    'nodemon',
    'prettier',
  ];

  const nodeModulesDir = path.join(backendDir, 'node_modules');
  if (fs.existsSync(nodeModulesDir)) {
    for (const mod of devModules) {
      const modDir = path.join(nodeModulesDir, mod);
      if (fs.existsSync(modDir)) {
        fs.rmSync(modDir, { recursive: true, force: true });
        console.log(`[afterPack] Removed dev module: ${mod}`);
      }
    }

    // Remove .cache directories
    try {
      const entries = fs.readdirSync(nodeModulesDir);
      for (const entry of entries) {
        if (entry.startsWith('.cache') || entry.startsWith('.package-lock')) {
          fs.rmSync(path.join(nodeModulesDir, entry), { recursive: true, force: true });
        }
      }
    } catch { /* ignore */ }
  }

  // 4. Ensure uploads directory exists
  const uploadsDir = path.join(backendDir, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('[afterPack] Created uploads directory');
  }

  console.log('[afterPack] Post-processing complete!');
};
