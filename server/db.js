const Database = require('better-sqlite3');
const config = require('./config');
const Core = require('../shared/core');
const {seedCatalog} = require('./seed-catalog');

const db = new Database(config.dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE COLLATE NOCASE, pass TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer','admin')), name TEXT NOT NULL DEFAULT '', customer_id TEXT,
  verified INTEGER NOT NULL DEFAULT 0, disabled INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS tokens (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, kind TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, status TEXT NOT NULL, email TEXT NOT NULL COLLATE NOCASE, created_at TEXT NOT NULL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, data TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS orders_customer ON orders (customer_id);
CREATE TABLE IF NOT EXISTS products (
  sku TEXT PRIMARY KEY, cat TEXT NOT NULL, name TEXT NOT NULL, size TEXT NOT NULL DEFAULT '', rrp_usd REAL NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0, case_pack INTEGER NOT NULL DEFAULT 1, moq INTEGER NOT NULL DEFAULT 1, stock TEXT NOT NULL DEFAULT 'in',
  active INTEGER NOT NULL DEFAULT 1, best INTEGER NOT NULL DEFAULT 0, brand_site_out INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, kind TEXT NOT NULL, name TEXT NOT NULL, stored TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, recipient TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, status TEXT NOT NULL, error TEXT, created_at TEXT NOT NULL);
`);

const now = () => new Date().toISOString();

/* ---- settings ---- */
function getSettings() {
  const out = Object.assign({}, Core.DEFAULT_SETTINGS);
  db.prepare('SELECT key, value FROM settings').all().forEach(r => { try { out[r.key] = JSON.parse(r.value); } catch (e) { /* skip */ } });
  return out;
}
function setSettings(patch) {
  const up = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  db.transaction(() => { Object.keys(patch).forEach(k => up.run(k, JSON.stringify(patch[k]))); })();
}
function nextOrderId() {
  return db.transaction(() => {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'orderSeq'").get();
    const n = (row ? JSON.parse(row.value) : 1000) + 1;
    db.prepare("INSERT INTO settings (key, value) VALUES ('orderSeq', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(n));
    return 'BD-' + String(new Date().getFullYear()).slice(2) + '-' + String(n).padStart(5, '0');
  })();
}

/* ---- products ---- */
const rowToProduct = r => ({sku:r.sku, cat:r.cat, name:r.name, size:r.size, rrpUsd:r.rrp_usd, price:r.price, casePack:r.case_pack, moq:r.moq, stock:r.stock, active:!!r.active, best:!!r.best, brandSiteOut:!!r.brand_site_out, sort:r.sort});
function listProducts() { return db.prepare('SELECT * FROM products ORDER BY sort, sku').all().map(rowToProduct); }
function getProduct(sku) { const r = db.prepare('SELECT * FROM products WHERE sku = ? COLLATE NOCASE').get(String(sku || '').trim()); return r ? rowToProduct(r) : null; }
function saveProduct(p) {
  db.prepare(`INSERT INTO products (sku, cat, name, size, rrp_usd, price, case_pack, moq, stock, active, best, brand_site_out, sort)
    VALUES (@sku, @cat, @name, @size, @rrpUsd, @price, @casePack, @moq, @stock, @active, @best, @brandSiteOut, @sort)
    ON CONFLICT(sku) DO UPDATE SET cat=excluded.cat, name=excluded.name, size=excluded.size, rrp_usd=excluded.rrp_usd, price=excluded.price,
      case_pack=excluded.case_pack, moq=excluded.moq, stock=excluded.stock, active=excluded.active, best=excluded.best, brand_site_out=excluded.brand_site_out, sort=excluded.sort`)
    .run(Object.assign({}, p, {size:p.size || '', rrpUsd:p.rrpUsd || 0, active:p.active ? 1 : 0, best:p.best ? 1 : 0, brandSiteOut:p.brandSiteOut ? 1 : 0, sort:p.sort || 0}));
}
if (!db.prepare('SELECT COUNT(*) n FROM products').get().n) db.transaction(() => seedCatalog().forEach(saveProduct))();

/* ---- customers and orders are stored as documents with a few indexed columns ---- */
function getCustomer(id) { const r = db.prepare('SELECT data FROM customers WHERE id = ?').get(id); return r ? JSON.parse(r.data) : null; }
function listCustomers() { return db.prepare('SELECT data FROM customers ORDER BY created_at DESC').all().map(r => JSON.parse(r.data)); }
function saveCustomer(c) {
  db.prepare('INSERT INTO customers (id, status, email, created_at, data) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET status=excluded.status, email=excluded.email, data=excluded.data')
    .run(c.id, c.status, c.email, c.createdAt, JSON.stringify(c));
  return c;
}
function getOrder(id) { const r = db.prepare('SELECT data FROM orders WHERE id = ?').get(id); return r ? JSON.parse(r.data) : null; }
function listOrders(customerId) {
  const rows = customerId ? db.prepare('SELECT data FROM orders WHERE customer_id = ? ORDER BY created_at DESC').all(customerId) : db.prepare('SELECT data FROM orders ORDER BY created_at DESC').all();
  return rows.map(r => JSON.parse(r.data));
}
function saveOrder(o) {
  db.prepare('INSERT INTO orders (id, customer_id, status, created_at, data) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET status=excluded.status, data=excluded.data')
    .run(o.id, o.customerId, o.status, o.createdAt, JSON.stringify(o));
  return o;
}

module.exports = {db, now, getSettings, setSettings, nextOrderId, listProducts, getProduct, saveProduct, getCustomer, listCustomers, saveCustomer, getOrder, listOrders, saveOrder};
