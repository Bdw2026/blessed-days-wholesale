/* End-to-end check of the order flow and the access rules, against a throwaway database.  Run: npm test */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdw-test-'));
process.env.DATA_DIR = dir; process.env.ADMIN_EMAIL = 'staff@test.local'; process.env.ADMIN_PASSWORD = 'staff-pass-123'; process.env.SMTP_HOST = '';
const app = require('../server/index.js');
const auth = require('../server/auth');
const store = require('../server/db');
const ExcelJS = require('exceljs');

let base, server;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const PDF = Buffer.from('%PDF-1.4\n%test\n');
function client() {
  let cookie = '';
  const call = async (method, url, body, isForm) => {
    const headers = {Origin: base}; if (cookie) headers.Cookie = cookie;
    if (body && !isForm) headers['Content-Type'] = 'application/json';
    const res = await fetch(base + url, {method, headers, body: body ? (isForm ? body : JSON.stringify(body)) : undefined, redirect: 'manual'});
    const set = res.headers.get('set-cookie'); if (set) cookie = set.split(';')[0];
    const type = res.headers.get('content-type') || '';
    return {status: res.status, body: type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer()), type};
  };
  return {get: u => call('GET', u), post: (u, b) => call('POST', u, b || {}), put: (u, b) => call('PUT', u, b), form: (u, f) => call('POST', u, f, true)};
}
function regForm(email, company) {
  const f = new FormData();
  Object.entries({email, password: 'buyer-pass-123', agree: 'yes', company, licenseNo: 'TL-1', licenseExpiry: '2028-01-31', bizType: 'Pharmacy', emirate: 'Dubai', address: 'Al Quoz', contact: 'A Buyer', phone: '+971500000001', salesChannels: 'Physical stores|Others', salesOther: 'Instagram'}).forEach(([k, v]) => f.append(k, v));
  f.append('license', new Blob([PNG], {type: 'image/png'}), 'licence.png');
  return f;
}
const payForm = (kind, ref) => { const f = new FormData(); f.append('kind', kind); f.append('ref', ref); f.append('proof', new Blob([PDF], {type: 'application/pdf'}), 'receipt.pdf'); return f; };

test.before(async () => { auth.ensureAdmin(); server = app.listen(0); await new Promise(r => server.once('listening', r)); base = 'http://127.0.0.1:' + server.address().port; });
test.after(() => { server.close(); store.db.close(); fs.rmSync(dir, {recursive: true, force: true}); });

test('full order flow with access rules', async () => {
  const staff = client(), a = client(), b = client(), anon = client();

  // catalogue is seeded but unpriced, so nothing is orderable yet
  assert.equal((await staff.post('/api/auth/login', {email: 'staff@test.local', password: 'wrong'})).status, 401);
  assert.equal((await staff.post('/api/auth/login', {email: 'staff@test.local', password: 'staff-pass-123'})).status, 200);
  let st = (await staff.get('/api/admin/state')).body;
  assert.equal(st.products.length, 297);
  assert.ok(st.products.every(p => p.price === 0));

  // staff price two products by hand and the rest by importing a price list
  assert.equal((await staff.put('/api/admin/products/CL-BE-001-4', {price: 26.24})).status, 200);
  const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('p');
  ws.addRow(['Item code', 'Description', 'Size', 'Wholesale AED']); ws.addRow(['cl-be-032-10ml', '', '', 20.18]); ws.addRow(['', 'Organic Castor Oil', '4 oz', 'AED 24.22']); ws.addRow(['', 'No such product', '', 5]);
  const pf = new FormData(); pf.append('sheet', new Blob([Buffer.from(await wb.xlsx.writeBuffer())]), 'prices.xlsx');
  const parsed = (await staff.form('/api/admin/prices/parse', pf)).body;
  assert.deepEqual(parsed.matched.map(m => m.sku), ['CL-BE-032-10ml', 'CL-BE-057-4']);
  assert.deepEqual(parsed.unmatched, ['No such product']);
  assert.equal((await staff.post('/api/admin/prices/apply', {items: parsed.matched})).body.applied, 2);

  // registration needs a real licence file
  const badForm = regForm('x@test.local', 'X'); badForm.set('license', new Blob([Buffer.from('not an image')]), 'fake.png');
  assert.equal((await anon.form('/api/auth/register', badForm)).status, 400);
  const ra = await a.form('/api/auth/register', regForm('a@test.local', 'Alpha Trading LLC'));
  assert.equal(ra.status, 201); assert.equal(ra.body.customer.status, 'pending');
  assert.deepEqual(ra.body.customer.salesChannels, ['Physical stores', 'Others']); assert.equal(ra.body.customer.salesOther, 'Instagram');
  const noCh = regForm('n@test.local', 'No Channels'); noCh.set('salesChannels', '');
  assert.equal((await anon.form('/api/auth/register', noCh)).status, 400);
  const noOther = regForm('o@test.local', 'No Other'); noOther.set('salesOther', '');
  assert.equal((await anon.form('/api/auth/register', noOther)).status, 400);
  assert.equal((await b.form('/api/auth/register', regForm('b@test.local', 'Beta Stores'))).status, 201);
  assert.equal((await anon.form('/api/auth/register', regForm('a@test.local', 'Dup'))).status, 409);

  // not approved yet: no catalogue, no ordering, no staff area
  assert.equal((await a.get('/api/catalog')).status, 403);
  assert.equal((await a.post('/api/orders', {lines: [{sku: 'CL-BE-001-4', qty: 60}]})).status, 403);
  assert.equal((await a.get('/api/admin/state')).status, 403);
  assert.equal((await anon.get('/api/admin/state')).status, 401);
  assert.equal((await anon.get('/api/catalog')).status, 401);

  // staff: ask for info, customer resubmits, staff approve with a 10% discount
  st = (await staff.get('/api/admin/state')).body;
  const ca = st.customers.find(c => c.email === 'a@test.local'), cb = st.customers.find(c => c.email === 'b@test.local');
  assert.equal((await staff.post('/api/admin/customers/' + ca.id + '/decision', {action: 'info'})).status, 400);
  await staff.post('/api/admin/customers/' + ca.id + '/decision', {action: 'info', note: 'Send all pages'});
  const again = regForm('ignored@test.local', 'Alpha Trading LLC'); again.delete('license');
  assert.equal((await a.form('/api/me/application', again)).body.customer.status, 'pending');
  await staff.post('/api/admin/customers/' + ca.id + '/decision', {action: 'approve'});
  await staff.post('/api/admin/customers/' + ca.id + '/decision', {action: 'discount', discount: 10});
  await staff.post('/api/admin/customers/' + cb.id + '/decision', {action: 'approve'});

  // documents: owner and staff can open, another customer cannot
  const licId = ca.docs.license.id;
  assert.equal((await a.get('/api/files/' + licId)).status, 200);
  assert.equal((await staff.get('/api/files/' + licId)).status, 200);
  assert.equal((await b.get('/api/files/' + licId)).status, 404);
  assert.equal((await anon.get('/api/files/' + licId)).status, 401);

  // catalogue shows only priced products, at this customer's price
  const cat = (await a.get('/api/catalog')).body.products;
  assert.equal(cat.length, 3);
  assert.equal(cat.find(p => p.sku === 'CL-BE-001-4').price, 23.62); // 26.24 less 10%
  assert.equal((await b.get('/api/catalog')).body.products.find(p => p.sku === 'CL-BE-001-4').price, 26.24);

  // order sheet round trip
  const sheet = await a.get('/api/order-sheet.xlsx'); assert.equal(sheet.status, 200);
  const sw = new ExcelJS.Workbook(); await sw.xlsx.load(sheet.body); const sws = sw.worksheets[0];
  assert.equal(sws.rowCount, 4); sws.getRow(2).getCell(8).value = 7; sws.getRow(3).getCell(8).value = 24;
  const sf = new FormData(); sf.append('sheet', new Blob([Buffer.from(await sw.xlsx.writeBuffer())]), 'filled.xlsx');
  const rows = (await a.form('/api/order-sheet/parse', sf)).body.rows;
  assert.equal(rows.length, 2); assert.equal(rows[0].qty, 12); assert.ok(rows[0].issues.length);

  // ordering: quantities and minimum order are enforced by the server, prices come from the server
  assert.equal((await a.post('/api/orders', {lines: [{sku: 'CL-BE-001-4', qty: 7}]})).status, 400);
  assert.equal((await a.post('/api/orders', {lines: [{sku: 'CL-BE-001-2oz', qty: 12}]})).status, 400); // unpriced product
  assert.equal((await a.post('/api/orders', {lines: [{sku: 'CL-BE-001-4', qty: 12}]})).status, 400); // under minimum order
  const placed = await a.post('/api/orders', {lines: [{sku: 'CL-BE-001-4', qty: 60, price: 0.01}, {sku: 'CL-BE-032-10ml', qty: 36}], delivery: 'pickup', poRef: 'PO-9'});
  assert.equal(placed.status, 201);
  const o = placed.body.order; // 60 x 23.62 + 36 x 18.16 = 2070.96; VAT 103.55; total 2174.51; deposit 434.90
  assert.equal(o.lines[0].price, 23.62); assert.equal(o.lines[1].price, 18.16); assert.equal(o.depositDue, 434.9); assert.equal(o.status, 'awaiting_deposit');

  // another customer cannot see or pay it
  assert.equal((await b.get('/api/orders')).body.orders.length, 0);
  assert.equal((await b.form('/api/orders/' + o.id + '/payment', payForm('deposit', 'X'))).status, 404);
  assert.equal((await b.get('/api/orders/' + o.id + '/proforma.pdf')).status, 404);
  assert.equal((await a.post('/api/admin/orders/' + o.id + '/action', {action: 'dep-ok'})).status, 403);

  // steps cannot be skipped
  assert.equal((await a.form('/api/orders/' + o.id + '/payment', payForm('balance', 'X'))).status, 409);
  assert.equal((await staff.post('/api/admin/orders/' + o.id + '/action', {action: 'approve'})).status, 409);
  assert.equal((await staff.post('/api/admin/orders/' + o.id + '/action', {action: 'ready'})).status, 409);

  // deposit -> review (one line cut, shipping added) -> balance -> packing -> ready -> completed
  assert.equal((await a.form('/api/orders/' + o.id + '/payment', payForm('deposit', 'TT-1'))).body.order.status, 'deposit_submitted');
  await staff.post('/api/admin/orders/' + o.id + '/action', {action: 'dep-ok'});
  assert.equal((await staff.post('/api/admin/orders/' + o.id + '/action', {action: 'reject'})).status, 400);
  await staff.post('/api/admin/orders/' + o.id + '/action', {action: 'approve', qtys: [36, 36], shippingFee: 50, note: 'Short on jojoba'});
  let mine = (await a.get('/api/orders')).body.orders[0];
  assert.equal(mine.status, 'awaiting_balance'); assert.equal(mine.lines[0].qty, 36); assert.equal(mine.lines[0].origQty, 60);
  // 36 x 23.62 + 36 x 18.16 = 1504.08; + 50 = 1554.08; VAT 77.70; total 1631.78; balance 1631.78 - 434.90 = 1196.88
  await a.form('/api/orders/' + o.id + '/payment', payForm('balance', 'TT-2'));
  mine = (await a.get('/api/orders')).body.orders[0]; assert.equal(mine.balance.amount, 1196.88);
  await staff.post('/api/admin/orders/' + o.id + '/action', {action: 'bal-ok'});
  assert.equal((await staff.post('/api/admin/orders/' + o.id + '/action', {action: 'shipped'})).status, 400); // courier required
  await staff.post('/api/admin/orders/' + o.id + '/action', {action: 'ready'});
  await staff.post('/api/admin/orders/' + o.id + '/action', {action: 'complete'});
  mine = (await a.get('/api/orders')).body.orders[0]; assert.equal(mine.status, 'completed');

  // documents render
  const pdf1 = await a.get('/api/orders/' + o.id + '/proforma.pdf'); assert.equal(pdf1.status, 200); assert.equal(pdf1.body.slice(0, 5).toString(), '%PDF-');
  assert.equal((await staff.get('/api/admin/orders/' + o.id + '/packing.pdf')).status, 200);
  assert.equal((await a.get('/api/admin/orders/' + o.id + '/packing.pdf')).status, 403);

  // cross-site posts are refused; suspended accounts cannot order; emails were recorded
  assert.equal((await fetch(base + '/api/auth/logout', {method: 'POST', headers: {Origin: 'https://evil.example'}})).status, 403);
  await staff.post('/api/admin/customers/' + ca.id + '/decision', {action: 'suspend'});
  assert.equal((await a.post('/api/orders', {lines: [{sku: 'CL-BE-001-4', qty: 60}]})).status, 403);
  st = (await staff.get('/api/admin/state')).body;
  assert.ok(st.outbox.some(m => /ready for pickup/.test(m.subject)));
  assert.ok(st.outbox.some(m => /New order/.test(m.subject)));

  // password reset replaces the password and signs out old sessions
  const user = auth.findUser('b@test.local'), token = auth.issueToken(user.id, 'reset', 1);
  assert.equal((await anon.post('/api/auth/reset', {token, password: 'short'})).status, 400);
  assert.equal((await anon.post('/api/auth/reset', {token, password: 'new-pass-4567'})).status, 200);
  assert.equal((await anon.post('/api/auth/reset', {token, password: 'new-pass-9999'})).status, 400);
  assert.equal((await b.get('/api/orders')).status, 401);
  assert.equal((await b.post('/api/auth/login', {email: 'b@test.local', password: 'new-pass-4567'})).status, 200);
});
