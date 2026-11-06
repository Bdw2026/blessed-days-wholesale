const express = require('express');
const Core = require('../shared/core');
const store = require('./db');
const auth = require('./auth');
const files = require('./files');
const orders = require('./orders');
const sheets = require('./sheets');
const pdf = require('./pdf');
const config = require('./config');
const {bad, text} = orders;
const {r2} = Core;

const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve().then(() => fn(req, res, next)).catch(next);
router.use(auth.requireAdmin);

function state() {
  const userByCustomer = {};
  store.db.prepare("SELECT customer_id, verified FROM users WHERE role = 'customer'").all().forEach(u => { userByCustomer[u.customer_id] = !!u.verified; });
  return {
    settings: store.getSettings(), products: files.attachImages(store.listProducts()),
    customers: store.listCustomers().map(c => Object.assign({}, c, {emailVerified: !!userByCustomer[c.id]})), orders: store.listOrders(),
    staff: store.db.prepare("SELECT id, email, name, disabled, created_at AS createdAt FROM users WHERE role = 'admin' ORDER BY id").all(),
    outbox: store.db.prepare('SELECT id, recipient, subject, status, error, created_at AS createdAt FROM outbox ORDER BY id DESC LIMIT 40').all(),
    emailReady: !!config.smtp, storageAtRisk: config.storageAtRisk
  };
}
router.get('/state', (req, res) => res.json(state()));

router.post('/customers/:id/decision', wrap((req, res) => { orders.customerDecision(req.params.id, (req.body || {}).action, req.body || {}, req.user); res.json(state()); }));
router.post('/orders/:id/action', wrap((req, res) => { orders.staffAction(req.params.id, (req.body || {}).action, req.body || {}, req.user); res.json(state()); }));
router.get('/orders/:id/packing.pdf', wrap((req, res) => {
  const o = store.getOrder(req.params.id); if (!o) throw bad('That order was not found.', 404);
  pdf.packingList(res, o, store.getCustomer(o.customerId) || {}, store.getSettings());
}));

/* ---------- products and prices ---------- */
function applyProductPatch(p, b) {
  const posInt = (v, label) => { const n = Math.round(Number(v)); if (!(n >= 1 && n <= 100000)) throw bad(label + ' must be a whole number of 1 or more.'); return n; };
  if ('price' in b) { const n = r2(b.price); if (!(n >= 0 && n <= 1000000)) throw bad('Enter a valid price.'); p.price = n; }
  if ('casePack' in b) p.casePack = posInt(b.casePack, 'Case pack');
  if ('moq' in b) p.moq = posInt(b.moq, 'Minimum');
  if ('size' in b) p.size = text(b.size, 60);
  if ('name' in b) { p.name = text(b.name, 160); if (!p.name) throw bad('Enter the product name.'); }
  if ('cat' in b) { if (!Core.CATS[b.cat]) throw bad('Choose a category.'); p.cat = b.cat; }
  if ('stock' in b) { if (!['in', 'low', 'out'].includes(b.stock)) throw bad('Unknown stock status.'); p.stock = b.stock; }
  if ('active' in b) p.active = !!b.active;
  return p;
}
router.put('/products/:sku', wrap((req, res) => {
  const p = store.getProduct(req.params.sku); if (!p) throw bad('That product was not found.', 404);
  store.saveProduct(applyProductPatch(p, req.body || {})); res.json({product: store.getProduct(p.sku)});
}));
router.post('/products', wrap((req, res) => {
  const b = req.body || {}, sku = text(b.sku, 60);
  if (!/^[A-Za-z0-9][\w.\-]{1,59}$/.test(sku)) throw bad('SKU can use letters, numbers, dashes and dots.');
  if (store.getProduct(sku)) throw bad('That SKU already exists.', 409);
  const max = store.db.prepare('SELECT MAX(sort) m FROM products').get().m || 0;
  store.saveProduct(applyProductPatch({sku, cat: 'AC', name: '', size: '', rrpUsd: 0, price: 0, casePack: 1, moq: 1, stock: 'in', active: true, best: false, brandSiteOut: false, sort: max + 1}, Object.assign({name: b.name, cat: b.cat}, b)));
  res.status(201).json(state());
}));
router.post('/products/:sku/image', files.upload.single('image'), wrap((req, res) => {
  const p = store.getProduct(req.params.sku); if (!p) throw bad('That product was not found.', 404);
  if (!req.file) throw bad('Choose an image.');
  files.keepProductImage(req.file, p.sku); res.json(state());
}));
router.get('/prices.xlsx', wrap(async (req, res) => {
  const buf = await sheets.priceList(store.listProducts());
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Price-list.xlsx"');
  res.send(buf);
}));
router.post('/prices/parse', files.upload.single('sheet'), wrap(async (req, res) => {
  if (!req.file) throw bad('Choose a price list file.');
  res.json(Object.assign({file: text(req.file.originalname, 120)}, sheets.parsePriceList(await sheets.readRows(req.file), store.listProducts())));
}));
router.post('/prices/apply', wrap((req, res) => {
  const items = Array.isArray((req.body || {}).items) ? req.body.items.slice(0, 5000) : [];
  let n = 0;
  store.db.transaction(() => items.forEach(m => {
    const p = store.getProduct(m && m.sku); if (!p) return;
    const patch = {price: m.price}; if (m.casePack != null) patch.casePack = m.casePack; if (m.moq != null) patch.moq = m.moq;
    applyProductPatch(p, patch); if (p.moq < p.casePack && m.moq == null && m.casePack != null) p.moq = p.casePack;
    store.saveProduct(p); n++;
  }))();
  res.json(Object.assign(state(), {applied: n}));
}));

/* ---------- setup ---------- */
router.put('/settings', wrap((req, res) => {
  const b = req.body || {}, patch = {};
  ['company', 'tagline', 'email', 'phone', 'pickupAddress', 'bankName', 'bankAccount', 'iban', 'swift', 'trn'].forEach(k => { if (k in b) patch[k] = text(b[k], 300); });
  [['depositPct', 0, 100], ['vatPct', 0, 100], ['minOrder', 0, 10000000], ['leadDays', 0, 365]].forEach(([k, lo, hi]) => { if (k in b) { const n = Number(b[k]); if (!(n >= lo && n <= hi)) throw bad('Check the value for ' + k + '.'); patch[k] = n; } });
  if ('company' in patch && !patch.company) throw bad('Enter the trading name.');
  store.setSettings(patch); res.json(state());
}));
router.post('/staff', wrap((req, res) => {
  const b = req.body || {}, email = text(b.email, 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw bad('Enter a valid email.');
  const pw = auth.passwordProblem(b.password); if (pw) throw bad(pw);
  if (auth.findUser(email)) throw bad('That email already has an account.', 409);
  auth.createUser({email, password: b.password, role: 'admin', name: text(b.name, 80), verified: true});
  res.status(201).json(state());
}));
router.post('/staff/:id/disabled', wrap((req, res) => {
  const id = Number(req.params.id), u = store.db.prepare("SELECT * FROM users WHERE id = ? AND role = 'admin'").get(id);
  if (!u) throw bad('That staff account was not found.', 404);
  if (u.id === req.user.id) throw bad('You cannot disable your own account.');
  store.db.prepare('UPDATE users SET disabled = ? WHERE id = ?').run((req.body || {}).disabled ? 1 : 0, id);
  if ((req.body || {}).disabled) auth.endAllSessions(id);
  res.json(state());
}));

module.exports = router;
