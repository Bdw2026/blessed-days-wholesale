/* Creates a staff account, or resets its password:  npm run create-admin -- you@company.com "Your Name"  */
const crypto = require('crypto');
const auth = require('../auth');
const {db} = require('../db');
const email = (process.argv[2] || '').trim().toLowerCase(), name = process.argv[3] || 'Staff';
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { console.error('Usage: npm run create-admin -- you@company.com "Your Name"'); process.exit(1); }
const password = process.env.NEW_PASSWORD || crypto.randomBytes(9).toString('base64url');
const existing = auth.findUser(email);
if (existing && existing.role !== 'admin') { console.error('That email belongs to a customer account.'); process.exit(1); }
if (existing) { db.prepare('UPDATE users SET pass = ?, disabled = 0 WHERE id = ?').run(auth.hashPassword(password), existing.id); auth.endAllSessions(existing.id); }
else auth.createUser({email, password, role: 'admin', name, verified: true});
console.log((existing ? 'Password reset for ' : 'Staff account created for ') + email);
if (!process.env.NEW_PASSWORD) console.log('Temporary password: ' + password + '\nSign in and change it under Account.');
