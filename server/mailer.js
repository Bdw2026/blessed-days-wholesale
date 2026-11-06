const nodemailer = require('nodemailer');
const config = require('./config');
const {db, now, getSettings} = require('./db');

const transport = config.smtp ? nodemailer.createTransport(config.smtp) : null;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));

/* Every message is recorded in the outbox table, whether or not SMTP is configured, so staff can see what was (or would have been) sent. */
function send(to, subject, lines, link) {
  if (!to) return;
  const s = getSettings();
  const body = lines.filter(Boolean).join('\n\n') + (link ? '\n\n' + link.label + ': ' + link.url : '') + '\n\n' + s.company + (s.phone ? '\n' + s.phone : '') + (s.email ? '\n' + s.email : '');
  const id = db.prepare('INSERT INTO outbox (recipient, subject, body, status, created_at) VALUES (?, ?, ?, ?, ?)').run(to, subject, body, transport ? 'queued' : 'not sent (email not set up)', now()).lastInsertRowid;
  if (!transport) return;
  const html = '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#13231f">' + lines.filter(Boolean).map(l => '<p>' + esc(l).replace(/\n/g, '<br>') + '</p>').join('') +
    (link ? '<p><a href="' + esc(link.url) + '" style="background:#0f4a41;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">' + esc(link.label) + '</a></p>' : '') +
    '<p style="color:#56675f">' + esc(s.company) + '</p></div>';
  transport.sendMail({from: config.mailFrom || (s.company + ' <' + (s.email || 'no-reply@localhost') + '>'), to, subject, text: body, html})
    .then(() => db.prepare("UPDATE outbox SET status = 'sent' WHERE id = ?").run(id))
    .catch(err => db.prepare("UPDATE outbox SET status = 'failed', error = ? WHERE id = ?").run(String(err && err.message || err).slice(0, 500), id));
}
/* Staff notifications go to STAFF_NOTIFY_EMAIL, else the orders email in Setup, else every active staff account. */
function sendStaff(subject, lines, link) {
  const to = config.staffNotifyEmail || getSettings().email || db.prepare("SELECT email FROM users WHERE role = 'admin' AND disabled = 0").all().map(u => u.email).join(', ');
  send(to, subject, lines, link);
}
const url = hash => config.appUrl + '/#' + hash;

module.exports = {send, sendStaff, url};
