// ─── Optional nodemailer import ──────────────────────────────────────────────
// nodemailer is optional — when not installed (e.g. desktop builds without SMTP),
// sendEmail throws a clear error instead of crashing the process at import time.

let nodemailer;
let transporter;

try {
  nodemailer = require('nodemailer');
} catch {
  console.warn('[Mail] nodemailer not installed — email sending is disabled.');
}

// ─── Transporter Configuration ──────────────────────────────────────────────

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;
const FROM = process.env.EMAIL_FROM || 'noreply@stockmatepro.com';
const isGmail = SMTP_HOST === 'smtp.gmail.com';

if (nodemailer) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for others
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 20,
    rateDelta: 1000,
    rateLimit: 5,
    tls: {
      // Do not fail on invalid certs in dev
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });

  // Verify connection on startup (non-blocking)
  transporter.verify()
    .then(() => console.log(`[Mail] SMTP connected — ${SMTP_HOST}:${SMTP_PORT} (${isGmail ? 'Gmail' : 'Custom'})`))
    .catch((err) => console.error('[Mail] SMTP connection failed:', err.message));
}

// ─── Email Sending ──────────────────────────────────────────────────────────

/**
 * Send an email with optional attachments
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} [options.text] - Plain text body
 * @param {string} [options.html] - HTML body
 * @param {{ filename: string, content: Buffer }[]} [options.attachments]
 */
const sendEmail = async ({ to, subject, text, html, attachments = [] }) => {
  if (!transporter) {
    throw new Error(
      'Email sending is disabled. Install nodemailer (npm install nodemailer) and configure SMTP settings in .env.'
    );
  }

  if (!to) {
    throw new Error('Recipient email is required');
  }

  const mailOptions = {
    from: `"StockMate Pro" <${FROM}>`,
    to,
    subject,
    text,
    html,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
    headers: {
      'X-Mailer': 'StockMate Pro',
      'X-Priority': 'normal',
      'List-Unsubscribe': `<mailto:${FROM}?subject=unsubscribe>`,
    },
  };

  // For Gmail sending to the same account, add reference headers
  // to help threading and avoid being flagged
  if (isGmail && to === FROM) {
    mailOptions.headers['X-Entity-Ref-ID'] = `stockmate-${Date.now()}`;
  }

  const info = await transporter.sendMail(mailOptions);

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Mail] Sent: ${info.messageId} — to: ${to} — subject: ${subject}`);
  }

  return info;
};

module.exports = { sendEmail };

// ─── Graceful shutdown ──────────────────────────────────────────────────────

process.on('SIGTERM', () => {
  if (transporter) transporter.close();
});

process.on('SIGINT', () => {
  if (transporter) transporter.close();
});
