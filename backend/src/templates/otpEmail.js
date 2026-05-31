/**
 * Build a polished HTML email for OTP-based login.
 */
const buildOtpEmailHtml = ({ otp, firstName, expiresInMinutes = 10 }) => {
  const userName = firstName || 'User';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your OTP Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#059669,#047857);padding:32px 24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:0.5px;">
                ⚡ StockMate Pro
              </h1>
              <p style="color:#a7f3d0;margin:6px 0 0 0;font-size:14px;">One-Time Password</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 24px;">
              <p style="color:#1e293b;font-size:15px;line-height:1.6;margin:0 0 16px 0;">
                Hi <strong>${userName}</strong>,
              </p>
              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
                Use the following one-time password to log in to your StockMate Pro account. This code is valid for <strong>${expiresInMinutes} minutes</strong>.
              </p>
              <!-- OTP Box -->
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;text-align:center;margin:0 0 20px 0;">
                <p style="color:#475569;font-size:13px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Your OTP Code</p>
                <p style="font-size:36px;font-weight:800;color:#059669;margin:0;letter-spacing:6px;font-family:'Courier New',monospace;">
                  ${otp}
                </p>
              </div>
              <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 4px 0;">
                If you didn't request this code, you can safely ignore this email.
              </p>
              <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:0;">
                Never share your OTP with anyone. StockMate Pro will never ask for your password.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 24px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;margin:0 0 4px 0;">
                StockMate Pro — Inventory &amp; Sales Management
              </p>
              <p style="color:#cbd5e1;font-size:11px;margin:0;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Build a plain-text fallback for OTP emails.
 */
const buildOtpEmailText = ({ otp, firstName, expiresInMinutes = 10 }) => {
  const userName = firstName || 'User';
  return [
    `Hi ${userName},`,
    '',
    `Your StockMate Pro one-time password (OTP) is: ${otp}`,
    '',
    `This code is valid for ${expiresInMinutes} minutes.`,
    '',
    'If you did not request this code, please ignore this email.',
    'Never share your OTP with anyone.',
    '',
    '— StockMate Pro',
  ].join('\n');
};

/**
 * Build a polished HTML email for password reset.
 */
const buildResetPasswordHtml = ({ resetUrl, firstName, expiresInHours = 1 }) => {
  const userName = firstName || 'User';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fa;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:0.5px;">
                🔒 Password Reset
              </h1>
              <p style="color:#fca5a5;margin:6px 0 0 0;font-size:14px;">StockMate Pro</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;">
              <p style="color:#1e293b;font-size:15px;line-height:1.6;margin:0 0 16px 0;">
                Hi <strong>${userName}</strong>,
              </p>
              <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
                We received a request to reset the password for your StockMate Pro account. Click the button below to set a new password. This link is valid for <strong>${expiresInHours} hour${expiresInHours > 1 ? 's' : ''}</strong>.
              </p>
              <div style="text-align:center;margin:0 0 20px 0;">
                <a href="${resetUrl}"
                   style="display:inline-block;background:#059669;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
                  Reset Password
                </a>
              </div>
              <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 4px 0;">
                If the button above doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color:#059669;font-size:12px;word-break:break-all;margin:0 0 16px 0;">
                ${resetUrl}
              </p>
              <p style="color:#64748b;font-size:13px;line-height:1.6;margin:0 0 4px 0;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px 24px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;margin:0 0 4px 0;">
                StockMate Pro — Inventory &amp; Sales Management
              </p>
              <p style="color:#cbd5e1;font-size:11px;margin:0;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Build a plain-text fallback for password reset emails.
 */
const buildResetPasswordText = ({ resetUrl, firstName, expiresInHours = 1 }) => {
  const userName = firstName || 'User';
  return [
    `Hi ${userName},`,
    '',
    'We received a request to reset your StockMate Pro password.',
    `This link is valid for ${expiresInHours} hour(s):`,
    '',
    resetUrl,
    '',
    'If you did not request this, please ignore this email.',
    '',
    '— StockMate Pro',
  ].join('\n');
};

module.exports = {
  buildOtpEmailHtml,
  buildOtpEmailText,
  buildResetPasswordHtml,
  buildResetPasswordText,
};
