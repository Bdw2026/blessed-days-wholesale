const express = require('express');
const helmet = require('helmet');
const path = require('path');
const multer = require('multer');
const config = require('./config');
const auth = require('./auth');

const app = express();
app.set('trust proxy', 1); // behind one reverse proxy (Render, Railway, nginx): needed for https detection and rate limits
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'], fontSrc: ["'self'"],
    objectSrc: ["'self'"], frameAncestors: ["'none'"], formAction: ["'self'"], baseUri: ["'self'"], upgradeInsecureRequests: config.appUrl.startsWith('https://') ? [] : null
  }},
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({limit: '300kb'}));
app.use(auth.loadUser);
app.use(auth.sameOrigin);

const pub = path.join(__dirname, '..', 'public');
app.get('/js/core.js', (req, res) => res.sendFile(path.join(__dirname, '..', 'shared', 'core.js')));
app.use('/media/products', express.static(config.productImageDir, {maxAge: '1h', index: false, dotfiles: 'deny'}));
app.use(express.static(pub, {maxAge: config.production ? '10m' : 0, index: 'index.html'}));
app.get('/healthz', (req, res) => res.json({ok: true}));

app.use('/api', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.use('/api', require('./routes-customer'));
app.use('/api/admin', require('./routes-admin'));
app.use('/api', (req, res) => res.status(404).json({error: 'Not found.'}));

// Errors: known problems carry a status and a message written for the person; anything else is logged and hidden.
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err instanceof multer.MulterError) return res.status(400).json({error: err.code === 'LIMIT_FILE_SIZE' ? 'That file is over ' + config.maxUploadMb + ' MB. Upload a smaller copy.' : 'That upload could not be accepted.'});
  if (err && err.type === 'entity.too.large') return res.status(413).json({error: 'That request is too large.'});
  if (err && err.status && err.status < 500) return res.status(err.status).json({error: err.message});
  console.error(new Date().toISOString(), req.method, req.path, err);
  res.status(500).json({error: 'Something went wrong on our side. Try again in a moment.'});
});

if (require.main === module) {
  if (!auth.ensureAdmin()) console.warn('\nNo staff account exists yet. Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters) and restart, or run: npm run create-admin -- you@company.com\n');
  if (config.storageAtRisk) console.warn('\nWARNING: no volume is attached to this service. Customers, orders and uploads will be LOST at the next restart. Attach a volume in Railway.\n');
  if (!config.smtp) console.warn('Email is not set up (SMTP_HOST is empty). Messages are recorded in Admin > Setup but not sent.');
  auth.cleanup(); setInterval(auth.cleanup, 6 * 36e5).unref();
  app.listen(config.port, () => console.log('Wholesale portal running at ' + config.appUrl + ' (port ' + config.port + ')'));
}
module.exports = app;
