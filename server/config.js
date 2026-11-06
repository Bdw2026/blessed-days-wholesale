const path = require('path');
const fs = require('fs');

// Load .env when present (Node 20.12+). Real environment variables win.
try { if (fs.existsSync(path.join(__dirname, '..', '.env'))) process.loadEnvFile(path.join(__dirname, '..', '.env')); } catch (e) { /* ignore */ }

const env = process.env;
// On Railway an attached volume announces its own path, and the service its public address.
const onRailway = !!(env.RAILWAY_PROJECT_ID || env.RAILWAY_SERVICE_ID || env.RAILWAY_ENVIRONMENT_NAME || env.RAILWAY_ENVIRONMENT);
const dataDir = path.resolve(env.RAILWAY_VOLUME_MOUNT_PATH || env.DATA_DIR || path.join(__dirname, '..', 'data'));
const config = {
  port: Number(env.PORT) || 3000,
  appUrl: (env.APP_URL || (env.RAILWAY_PUBLIC_DOMAIN ? 'https://' + env.RAILWAY_PUBLIC_DOMAIN : 'http://localhost:' + (Number(env.PORT) || 3000))).replace(/\/+$/, ''),
  // True when the host would wipe our files on the next restart (Railway service with no volume attached).
  storageAtRisk: onRailway && !env.RAILWAY_VOLUME_MOUNT_PATH,
  production: env.NODE_ENV === 'production',
  dataDir,
  dbFile: path.join(dataDir, 'wholesale.db'),
  uploadDir: path.join(dataDir, 'uploads'),
  productImageDir: path.join(dataDir, 'product-images'),
  sessionDays: 14,
  maxUploadMb: 10,
  smtp: env.SMTP_HOST ? {
    host: env.SMTP_HOST, port: Number(env.SMTP_PORT) || 587, secure: env.SMTP_SECURE === 'true' || Number(env.SMTP_PORT) === 465,
    auth: env.SMTP_USER ? {user: env.SMTP_USER, pass: env.SMTP_PASS || ''} : undefined
  } : null,
  mailFrom: env.MAIL_FROM || '',
  staffNotifyEmail: env.STAFF_NOTIFY_EMAIL || '',
  adminEmail: env.ADMIN_EMAIL || '',
  adminPassword: env.ADMIN_PASSWORD || ''
};
[config.dataDir, config.uploadDir, config.productImageDir].forEach(d => fs.mkdirSync(d, {recursive: true}));
module.exports = config;
