const crypto = require('crypto');
const config = require('./config');
const {db, now} = require('./db');

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('hex');

/* ---- passwords: scrypt with a per-user salt ---- */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return 'scrypt$' + salt.toString('hex') + '$' + crypto.scryptSync(String(pw), salt, 64).toString('hex');
}
function checkPassword(pw, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const want = Buffer.from(parts[2], 'hex'), got = crypto.scryptSync(String(pw), Buffer.from(parts[1], 'hex'), 64);
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}
function passwordProblem(pw) {
  pw = String(pw || '');
  if (pw.length < 8) return 'Use a password of at least 8 characters.';
  if (pw.length > 200) return 'That password is too long.';
  return '';
}

/* ---- sessions: random token in an httpOnly cookie, only its hash is stored ---- */
function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) { const i = part.indexOf('='); if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim()); }
  return '';
}
function cookieFlags(req) { return 'Path=/; HttpOnly; SameSite=Lax' + (req.secure || config.appUrl.startsWith('https://') ? '; Secure' : ''); }
function startSession(req, res, userId) {
  const token = newToken(), ttl = config.sessionDays * 864e5;
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(sha(token), userId, Date.now() + ttl);
  res.setHeader('Set-Cookie', 'sid=' + token + '; Max-Age=' + Math.floor(ttl / 1000) + '; ' + cookieFlags(req));
}
function endSession(req, res) {
  const token = readCookie(req, 'sid');
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(sha(token));
  res.setHeader('Set-Cookie', 'sid=; Max-Age=0; ' + cookieFlags(req));
}
function endAllSessions(userId) { db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId); }

function loadUser(req, res, next) {
  req.user = null;
  const token = readCookie(req, 'sid');
  if (token) {
    const row = db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?').get(sha(token), Date.now());
    if (row && !row.disabled) req.user = row;
  }
  next();
}
const fail = (res, code, message) => res.status(code).json({error: message});
function requireUser(req, res, next) { return req.user ? next() : fail(res, 401, 'Sign in to continue.'); }
function requireAdmin(req, res, next) { return req.user && req.user.role === 'admin' ? next() : fail(res, req.user ? 403 : 401, 'Staff access only.'); }
function requireCustomer(req, res, next) { return req.user && req.user.role === 'customer' && req.user.customer_id ? next() : fail(res, req.user ? 403 : 401, 'Sign in with a trade account to continue.'); }

/* Blocks cross-site form posts: a state-changing request must come from this site's own pages. */
function sameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin || '';
  if (origin) {
    let host = ''; try { host = new URL(origin).host; } catch (e) { /* malformed */ }
    const allowed = [req.headers.host, new URL(config.appUrl).host];
    if (!allowed.includes(host)) return fail(res, 403, 'This request did not come from the site.');
  }
  next();
}

/* ---- one-time tokens for email verification and password reset ---- */
function issueToken(userId, kind, hours) {
  const token = newToken();
  db.prepare('DELETE FROM tokens WHERE user_id = ? AND kind = ?').run(userId, kind);
  db.prepare('INSERT INTO tokens (token, user_id, kind, expires_at) VALUES (?, ?, ?, ?)').run(sha(token), userId, kind, Date.now() + hours * 36e5);
  return token;
}
function useToken(token, kind) {
  const row = db.prepare('SELECT * FROM tokens WHERE token = ? AND kind = ? AND expires_at > ?').get(sha(String(token || '')), kind, Date.now());
  if (!row) return null;
  db.prepare('DELETE FROM tokens WHERE token = ?').run(row.token);
  return row.user_id;
}
function createUser({email, password, role, name, customerId, verified}) {
  return db.prepare('INSERT INTO users (email, pass, role, name, customer_id, verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(String(email).trim().toLowerCase(), hashPassword(password), role, name || '', customerId || null, verified ? 1 : 0, now()).lastInsertRowid;
}
function findUser(email) { return db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim().toLowerCase()); }
function cleanup() { db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now()); db.prepare('DELETE FROM tokens WHERE expires_at < ?').run(Date.now()); }

/* First start: create the first staff account from ADMIN_EMAIL / ADMIN_PASSWORD when no staff account exists. */
function ensureAdmin() {
  if (db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'admin'").get().n) return true;
  if (config.adminEmail && !passwordProblem(config.adminPassword)) { createUser({email: config.adminEmail, password: config.adminPassword, role: 'admin', name: 'Administrator', verified: true}); return true; }
  return false;
}

module.exports = {hashPassword, checkPassword, passwordProblem, startSession, endSession, endAllSessions, loadUser, requireUser, requireAdmin, requireCustomer, sameOrigin, issueToken, useToken, createUser, findUser, cleanup, ensureAdmin, fail};
