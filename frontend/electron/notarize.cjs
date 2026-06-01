/**
 * StockMate Pro — electron-builder afterSign hook
 *
 * Handles macOS notarization via Apple's notary service.
 * Requires environment variables:
 *   APPLE_ID           — Apple Developer account email
 *   APPLE_APP_PASSWORD — App-specific password (not your Apple ID password)
 *   APPLE_TEAM_ID      — Apple Developer Team ID
 *
 * If these are not set, notarization is skipped (useful for local dev builds).
 */

module.exports = async function afterSign(context) {
  const { electronPlatformName, appOutDir } = context;

  // Only notarize on macOS
  if (electronPlatformName !== 'darwin') {
    console.log('[afterSign] Skipping notarization — not macOS.');
    return;
  }

  const appleId = process.env.APPLE_ID;
  const appleAppPassword = process.env.APPLE_APP_PASSWORD;
  const appleTeamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleAppPassword || !appleTeamId) {
    console.warn(
      '[afterSign] Skipping notarization — APPLE_ID, APPLE_APP_PASSWORD, or APPLE_TEAM_ID not set.\n' +
      '  To enable notarization, set these environment variables with your Apple Developer credentials.'
    );
    return;
  }

  // Lazy require to avoid crashing non-macOS builds if the module isn't resolvable
  let notarize;
  try {
    notarize = require('@electron/notarize').notarize;
  } catch (err) {
    console.error(`[afterSign] Cannot load @electron/notarize: ${err.message}`);
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  console.log(`[afterSign] Notarizing ${appName}...`);

  try {
    await notarize({
      appBundleId: context.packager.appInfo.id,
      appPath: `${appOutDir}/${appName}.app`,
      appleId,
      appleIdPassword: appleAppPassword,
      teamId: appleTeamId,
    });
    console.log(`[afterSign] Notarization complete for ${appName}.`);
  } catch (err) {
    // Don't fail the build for notarization errors — it's non-fatal for functionality
    console.error(`[afterSign] Notarization failed: ${err.message}`);
    console.error('[afterSign] The app will still work, but macOS may show a security warning.');
  }
};
