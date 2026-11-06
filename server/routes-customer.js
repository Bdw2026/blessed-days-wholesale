const express = require('express');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const Core = require('../shared/core');
const store = require('./db');
const auth = require('./auth');
const files = require('./files');
const mail = require('./mailer');
const orders = require('./orders');
const sheets = require('./sheets');
const pdf = require('./pdf');
const {bad, text} = orders;

const router = express.Router();
const wrap = fn => (req, res, next) => Promise.resolve().then(() => fn(req, res, next)).catch(next);
const limit = (max, minutes) => rateLimit({windowMs: minutes * 60000, max, standardHeaders: true, legacyHeaders: false, message: {error: 'Too many attempts. Wait a few minutes and try again.'}});
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 200;
const docFields = files.upload.fields([{name: 'license', maxCount: 1}, {name: 'vat', maxCount: 1}, {name: 'idDoc', maxCount: 1}]);

function publicSettings() {
  const s = store.getSettings(), counts = {};
  store.listProducts().filter(p => p.active && p.price > 0).forEach(p => { counts[p.cat] = (counts[p.cat] || 0) + 1; });
  return {company: s.company, tagline: s.tagline, minOrder: s.minOrder, depositPct: s.depositPct, vatPct: s.vatPct, leadDays: s.leadDays, email: s.email, phone: s.phone, pickupAddress: s.pickupAddress, counts};
}
function bankSettings() { const s = store.getSettings(); return {bankName: s.bankName, bankAccount: s.bankAccount, iban: s.iban, swift: s.swift}; }
function session(req) {
  const u = req.user; if (!u) return {user: null, settings: publicSettings()};
  const out = {user: {email: u.email, role: u.role, name: u.name, verified: !!u.verified}, settings: publicSettings()};
  if (u.role === 'customer') { out.customer = store.getCustomer(u.customer_id); if (out.customer) delete out.customer.reviewedBy; if (out.customer && out.customer.status === 'approved') Object.assign(out.settings, bankSettings()); }
  return out;
}
function companyFields(body, base) {
  const c = Object.assign({}, base), req = ['company', 'licenseNo', 'licenseExpiry', 'address', 'contact', 'phone'];
  ['company', 'licenseNo', 'licenseExpiry', 'trn', 'address', 'contact', 'phone'].forEach(k => { if (k in body) c[k] = text(body[k], 200); });
  if ('bizType' in body) c.bizType = Core.BIZ_TYPES.includes(body.bizType) ? body.bizType : 'Other';
  if ('emirate' in body) c.emirate = Core.EMIRATES.includes(body.emirate) ? body.emirate : Core.EMIRATES[0];
  req.forEach(k => { if (!c[k]) throw bad('Fill in every required field.'); });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.licenseExpiry) || isNaN(new Date(c.licenseExpiry))) throw bad('Enter the licence expiry date.');
  return c;
}
/* Customers see their order without staff names. */
function forCustomer(o) {
  const c = JSON.parse(JSON.stringify(o));
  c.log.forEach(e => { delete e.by; }); ['deposit', 'balance', 'review'].forEach(k => { if (c[k]) { delete c[k].confirmedBy; delete c[k].by; } });
  return c;
}
function meCustomer(req) { const c = store.getCustomer(req.user.customer_id); if (!c) throw bad('Account not found.', 404); return c; }
function approved(req) { const c = meCustomer(req); if (c.status !== 'approved') throw bad('Your trade account is not approved yet.', 403); return c; }

/* ---------- session ---------- */
router.get('/session', (req, res) => res.json(session(req)));

router.post('/auth/register', limit(10, 60), docFields, wrap((req, res) => {
  const b = req.body || {}, email = text(b.email, 200).toLowerCase();
  if (!emailOk(email)) throw bad('Enter a valid business email.');
  const pw = auth.passwordProblem(b.password); if (pw) throw bad(pw);
  if (b.agree !== 'yes') throw bad('Accept the wholesale terms to continue.');
  if (!req.files || !req.files.license) throw bad('Attach your trade licence to continue.');
  if (auth.findUser(email)) throw bad('That email already has an account. Sign in instead.', 409);
  const id = 'C-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const c = companyFields(b, {id, status: 'pending', email, bizType: 'Other', emirate: Core.EMIRATES[0], trn: '', docs: {}, discount: 0, createdAt: store.now(), reviewedAt: null, reviewNote: ''});
  ['license', 'vat', 'idDoc'].forEach(k => { if (req.files[k]) c.docs[k] = files.keepDocument(req.files[k][0], id, k); });
  store.saveCustomer(c);
  const userId = auth.createUser({email, password: b.password, role: 'customer', name: c.contact, customerId: id});
  auth.startSession(req, res, userId);
  const token = auth.issueToken(userId, 'verify', 72);
  mail.send(email, 'We received your trade account application', ['Thank you for applying for a trade account for ' + c.company + '. We review applications within one working day and will email you the result.', 'Please confirm this email address so we can reach you.'],
    {label: 'Confirm email address', url: require('./config').appUrl + '/api/auth/verify?token=' + token});
  mail.sendStaff('New trade account application: ' + c.company, [c.company + ' (' + c.bizType + ', ' + c.emirate + ') applied for a trade account. Check the trade licence and approve or decline.'], {label: 'Review application', url: mail.url('admin-customer-' + id)});
  req.user = store.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  res.status(201).json(session(req));
}));

router.post('/auth/login', limit(15, 15), wrap((req, res) => {
  const b = req.body || {}, u = auth.findUser(b.email);
  if (!u || u.disabled || !auth.checkPassword(b.password, u.pass)) throw bad('That email and password do not match an account.', 401);
  auth.startSession(req, res, u.id); req.user = u;
  res.json(session(req));
}));
router.post('/auth/logout', (req, res) => { auth.endSession(req, res); res.json({ok: true}); });

router.post('/auth/forgot', limit(5, 60), wrap((req, res) => {
  const u = auth.findUser((req.body || {}).email);
  if (u && !u.disabled) mail.send(u.email, 'Reset your password', ['We received a request to reset the password for this account. The link works for one hour. If you did not ask for this, ignore this email.'], {label: 'Choose a new password', url: mail.url('reset-' + auth.issueToken(u.id, 'reset', 1))});
  res.json({ok: true}); // same answer whether or not the account exists
}));
router.post('/auth/reset', limit(10, 60), wrap((req, res) => {
  const b = req.body || {}, pw = auth.passwordProblem(b.password); if (pw) throw bad(pw);
  const userId = auth.useToken(b.token, 'reset'); if (!userId) throw bad('That reset link has expired. Ask for a new one.');
  store.db.prepare('UPDATE users SET pass = ?, verified = 1 WHERE id = ?').run(auth.hashPassword(b.password), userId);
  auth.endAllSessions(userId);
  res.json({ok: true});
}));
router.get('/auth/verify', (req, res) => {
  const userId = auth.useToken(req.query.token, 'verify');
  if (userId) store.db.prepare('UPDATE users SET verified = 1 WHERE id = ?').run(userId);
  res.redirect('/#' + (userId ? 'verified' : 'home'));
});
router.post('/auth/password', auth.requireUser, limit(10, 60), wrap((req, res) => {
  const b = req.body || {}; if (!auth.checkPassword(b.current, req.user.pass)) throw bad('Your current password is not correct.');
  const pw = auth.passwordProblem(b.password); if (pw) throw bad(pw);
  store.db.prepare('UPDATE users SET pass = ? WHERE id = ?').run(auth.hashPassword(b.password), req.user.id);
  auth.endAllSessions(req.user.id); auth.startSession(req, res, req.user.id);
  res.json({ok: true});
}));

/* ---------- documents ---------- */
router.get('/files/:id', auth.requireUser, files.serveDocument);

/* ---------- trade account ---------- */
router.post('/me/application', auth.requireCustomer, docFields, wrap((req, res) => {
  const c = meCustomer(req); if (c.status !== 'info' && c.status !== 'pending') throw bad('This application can no longer be edited.', 409);
  const next = companyFields(req.body || {}, c);
  ['license', 'vat', 'idDoc'].forEach(k => { if (req.files && req.files[k]) next.docs[k] = files.keepDocument(req.files[k][0], c.id, k); });
  next.status = 'pending'; store.saveCustomer(next);
  mail.sendStaff('Updated application: ' + next.company, [next.company + ' sent an updated trade account application.'], {label: 'Review application', url: mail.url('admin-customer-' + c.id)});
  res.json(session(req));
}));
router.post('/me/licence', auth.requireCustomer, files.upload.single('license'), wrap((req, res) => {
  const c = meCustomer(req), expiry = text((req.body || {}).licenseExpiry, 10);
  if (!req.file) throw bad('Attach the renewed licence.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) throw bad('Enter the new expiry date.');
  c.docs.license = files.keepDocument(req.file, c.id, 'license'); c.licenseExpiry = expiry; c.reviewNote = 'Renewed licence uploaded, to be verified.';
  store.saveCustomer(c);
  mail.sendStaff('Renewed trade licence: ' + c.company, [c.company + ' uploaded a renewed trade licence, new expiry ' + expiry + '. Please verify it.'], {label: 'Open customer', url: mail.url('admin-customer-' + c.id)});
  res.json(session(req));
}));

/* ---------- catalogue and ordering (approved accounts only) ---------- */
router.get('/catalog', auth.requireCustomer, wrap((req, res) => res.json({products: files.attachImages(orders.catalogFor(approved(req)))})));
router.get('/order-sheet.xlsx', auth.requireCustomer, wrap(async (req, res) => {
  const buf = await sheets.orderSheet(orders.catalogFor(approved(req)));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="Order-sheet.xlsx"');
  res.send(buf);
}));
router.post('/order-sheet/parse', auth.requireCustomer, files.upload.single('sheet'), wrap(async (req, res) => {
  const c = approved(req); if (!req.file) throw bad('Choose the filled order sheet.');
  res.json({file: text(req.file.originalname, 120), rows: sheets.parseOrderSheet(await sheets.readRows(req.file), orders.catalogFor(c))});
}));
router.get('/orders', auth.requireCustomer, wrap((req, res) => res.json({orders: store.listOrders(meCustomer(req).id).map(forCustomer)})));
router.post('/orders', auth.requireCustomer, limit(30, 60), wrap((req, res) => res.status(201).json({order: forCustomer(orders.placeOrder(approved(req), req.body || {}))})));
router.post('/orders/:id/payment', auth.requireCustomer, files.upload.single('proof'), wrap((req, res) => {
  const c = approved(req), b = req.body || {};
  orders.ownOrder(c, req.params.id);
  if (!text(b.ref, 80)) throw bad('Enter the transfer reference number.');
  if (!req.file) throw bad('Attach the transfer receipt.');
  const o = store.getOrder(req.params.id), expected = b.kind === 'deposit' ? 'awaiting_deposit' : 'awaiting_balance';
  if (o.status !== expected) throw bad('This payment is not due on this order. Refresh the page.', 409);
  res.json({order: forCustomer(orders.submitPayment(c, req.params.id, b.kind, b.ref, files.keepDocument(req.file, c.id, b.kind)))});
}));
router.post('/orders/:id/cancel', auth.requireCustomer, wrap((req, res) => res.json({order: forCustomer(orders.cancelByCustomer(meCustomer(req), req.params.id))})));
router.get('/orders/:id/proforma.pdf', auth.requireUser, wrap((req, res) => {
  const o = store.getOrder(req.params.id);
  if (!o || !(req.user.role === 'admin' || o.customerId === req.user.customer_id)) throw bad('That order was not found.', 404);
  pdf.proforma(res, o, store.getCustomer(o.customerId) || {}, store.getSettings());
}));

module.exports = router;
