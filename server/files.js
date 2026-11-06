const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('./config');
const {db, now} = require('./db');

const upload = multer({storage: multer.memoryStorage(), limits: {fileSize: config.maxUploadMb * 1024 * 1024, files: 4, fields: 40, fieldSize: 20000}});

/* Accept only real PDFs and images: the extension and the file's first bytes must agree. */
const TYPES = {
  pdf: {mime: 'application/pdf', test: b => b.slice(0, 5).toString('latin1') === '%PDF-'},
  png: {mime: 'image/png', test: b => b.slice(0, 8).toString('hex') === '89504e470d0a1a0a'},
  jpg: {mime: 'image/jpeg', test: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff},
  jpeg: {mime: 'image/jpeg', test: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff},
  webp: {mime: 'image/webp', test: b => b.slice(0, 4).toString('latin1') === 'RIFF' && b.slice(8, 12).toString('latin1') === 'WEBP'}
};
function sniff(file, imagesOnly) {
  const ext = path.extname(file.originalname || '').slice(1).toLowerCase(), t = TYPES[ext];
  if (!t || (imagesOnly && ext === 'pdf')) throw Object.assign(new Error(imagesOnly ? 'Upload a JPG, PNG or WebP image.' : 'Upload a PDF, JPG, PNG or WebP file.'), {status: 400});
  if (!file.buffer || !file.buffer.length || !t.test(file.buffer)) throw Object.assign(new Error('"' + file.originalname + '" is not a valid ' + ext.toUpperCase() + ' file.'), {status: 400});
  return {ext: ext === 'jpeg' ? 'jpg' : ext, mime: t.mime};
}
/* Stores an uploaded document outside the public folder under a random name and records who it belongs to. */
function keepDocument(file, customerId, kind) {
  const {ext, mime} = sniff(file);
  const id = crypto.randomBytes(12).toString('hex'), stored = id + '.' + ext;
  fs.writeFileSync(path.join(config.uploadDir, stored), file.buffer, {mode: 0o600});
  const name = String(file.originalname).replace(/[^\w.\- ()]/g, '_').slice(-120);
  db.prepare('INSERT INTO files (id, customer_id, kind, name, stored, mime, size, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, customerId, kind, name, stored, mime, file.size, now());
  return {id, name, size: file.size, type: mime, at: now()};
}
/* Only staff and the customer who owns a document can open it. */
function serveDocument(req, res) {
  const f = db.prepare('SELECT * FROM files WHERE id = ?').get(String(req.params.id));
  if (!f || !(req.user.role === 'admin' || (req.user.customer_id && req.user.customer_id === f.customer_id))) return res.status(404).json({error: 'File not found.'});
  const full = path.join(config.uploadDir, path.basename(f.stored));
  if (!fs.existsSync(full)) return res.status(404).json({error: 'File not found.'});
  res.setHeader('Content-Type', f.mime);
  res.setHeader('Content-Disposition', 'inline; filename="' + f.name.replace(/"/g, '') + '"');
  res.setHeader('Cache-Control', 'private, no-store');
  fs.createReadStream(full).pipe(res);
}

/* ---- product photos: data/product-images/<SKU>.jpg|png|webp, shared by every size of the same product ---- */
let imageCache = {at: 0, map: {}};
function productImages() {
  if (Date.now() - imageCache.at < 15000) return imageCache.map;
  const map = {};
  try { fs.readdirSync(config.productImageDir).forEach(f => { const m = /^(.+)\.(jpg|jpeg|png|webp)$/i.exec(f); if (m) map[m[1].toUpperCase()] = f; }); } catch (e) { /* none */ }
  imageCache = {at: Date.now(), map};
  return map;
}
function attachImages(products) {
  const map = productImages(), byName = {};
  products.forEach(p => { const f = map[p.sku.toUpperCase()]; if (f && !byName[p.name]) byName[p.name] = f; });
  return products.map(p => { const f = map[p.sku.toUpperCase()] || byName[p.name]; return f ? Object.assign({}, p, {image: '/media/products/' + encodeURIComponent(f)}) : p; });
}
function keepProductImage(file, sku) {
  const {ext} = sniff(file, true);
  if (!/^[\w.\-]+$/.test(sku)) throw Object.assign(new Error('That SKU cannot be used as a file name.'), {status: 400});
  ['jpg', 'jpeg', 'png', 'webp'].forEach(e => { try { fs.unlinkSync(path.join(config.productImageDir, sku + '.' + e)); } catch (err) { /* not there */ } });
  fs.writeFileSync(path.join(config.productImageDir, sku + '.' + ext), file.buffer);
  imageCache.at = 0;
}

module.exports = {upload, keepDocument, serveDocument, attachImages, keepProductImage};
