'use strict';
/* Customer screens: public home, registration, catalogue, ordering, payments, account. */
const BOTTLE = {
  SH:'<svg viewBox="0 0 40 80" aria-hidden="true"><rect x="15" y="2" width="10" height="14" rx="2" fill="var(--ink)"/><rect x="17" y="16" width="6" height="6" fill="var(--muted)"/><rect x="8" y="22" width="24" height="56" rx="5" fill="var(--accent)"/><rect x="11" y="40" width="18" height="24" rx="1" fill="var(--surface)"/></svg>',
  EO:'<svg viewBox="0 0 40 80" aria-hidden="true"><rect x="13" y="22" width="14" height="14" rx="2" fill="var(--ink)"/><rect x="10" y="36" width="20" height="42" rx="4" fill="var(--accent)"/><rect x="12" y="48" width="16" height="18" rx="1" fill="var(--surface)"/></svg>',
  SK:'<svg viewBox="0 0 40 80" aria-hidden="true"><rect x="12" y="62" width="16" height="16" rx="2" fill="var(--ink)"/><path d="M9 62 L13 14 H27 L31 62 Z" fill="var(--brand)"/><rect x="14" y="30" width="12" height="18" rx="1" fill="var(--surface)"/></svg>',
  MR:'<svg viewBox="0 0 40 80" aria-hidden="true"><circle cx="20" cy="50" r="17" fill="none" stroke="var(--brand)" stroke-width="7"/><circle cx="20" cy="33" r="5" fill="var(--accent)"/></svg>',
  SU:'<svg viewBox="0 0 40 80" aria-hidden="true"><rect x="10" y="20" width="20" height="10" rx="2" fill="var(--ink)"/><rect x="7" y="30" width="26" height="48" rx="5" fill="var(--brand)"/><rect x="10" y="44" width="20" height="20" rx="1" fill="var(--surface)"/></svg>',
  LB:'<svg viewBox="0 0 40 80" aria-hidden="true"><rect x="14" y="20" width="12" height="20" rx="3" fill="var(--accent)"/><rect x="13" y="40" width="14" height="38" rx="2" fill="var(--brand)"/></svg>',
  ES:'<svg viewBox="0 0 64 80" aria-hidden="true"><rect x="6" y="34" width="9" height="9" rx="1" fill="var(--ink)"/><rect x="4" y="43" width="13" height="35" rx="3" fill="var(--accent)"/><rect x="27" y="26" width="10" height="10" rx="1" fill="var(--ink)"/><rect x="25" y="36" width="14" height="42" rx="3" fill="var(--brand)"/><rect x="49" y="34" width="9" height="9" rx="1" fill="var(--ink)"/><rect x="47" y="43" width="13" height="35" rx="3" fill="var(--accent)"/></svg>',
  DF:'<svg viewBox="0 0 48 80" aria-hidden="true"><path d="M24 4 C28 10 20 14 24 20" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round"/><path d="M8 78 C2 52 12 26 24 26 C36 26 46 52 40 78 Z" fill="var(--brand)"/><rect x="8" y="68" width="32" height="10" rx="2" fill="var(--accent)"/></svg>',
  AC:'<svg viewBox="0 0 48 80" aria-hidden="true"><rect x="6" y="38" width="36" height="40" rx="3" fill="var(--brand)"/><rect x="6" y="38" width="36" height="9" fill="var(--ink)"/><rect x="20" y="38" width="8" height="40" fill="var(--accent)"/></svg>',
  CT:'<svg viewBox="0 0 40 80" aria-hidden="true"><circle cx="14" cy="60" r="10" fill="var(--surface)" stroke="var(--muted)" stroke-width="2"/><circle cx="27" cy="62" r="9" fill="var(--surface)" stroke="var(--muted)" stroke-width="2"/><circle cx="21" cy="47" r="10" fill="var(--surface)" stroke="var(--muted)" stroke-width="2"/></svg>'
};
const FLOW = [['Register','Company details and trade licence'],['Verification','We check your documents'],['Order','Cart or order sheet upload'],['20% deposit','Bank transfer to start review'],['Review','We confirm stock and totals'],['80% balance','Paid before packing'],['Pickup or shipping','We tell you when it is ready']];
BOTTLE.EB = BOTTLE.EO;
function vHome(){
  const s = S.settings, c = me(), counts = s.counts || {}, total = Object.values(counts).reduce((a, n) => a + n, 0);
  if (c && c.status === 'approved') return vCatalog();
  if (c) return vApplication(c);
  return '<section class="card hero"><div class="stack"><p class="eyebrow">Trade customers only</p><h1>Wholesale ordering for Cliganic products in the UAE</h1>' +
    '<p class="lead">' + h(s.company) + ' supplies licensed businesses with case-pack pricing' + (total ? ' across ' + total + ' product lines' : '') + '. Register your company, get verified, and order online.</p>' +
    '<div class="row"><button class="btn primary" data-act="go" data-to="register">Register your business</button><button class="btn" data-act="go" data-to="signin">Sign in</button></div></div>' +
    '<div class="stack"><p class="eyebrow">What you need to register</p><ul class="stack" style="margin:0;padding-left:18px;gap:6px"><li>Valid trade licence (PDF or photo)</li><li>VAT registration certificate, if registered</li><li>Contact person and delivery address</li></ul>' +
    '<p class="muted" style="font-size:.85rem">Minimum order ' + money(s.minOrder) + ' before VAT. Prices are shown after approval.</p></div></section>' +
    '<section class="stack"><h2>How an order moves</h2><ol class="steps">' + FLOW.map(f => '<li><b>' + f[0].replace('20%', s.depositPct + '%').replace('80%', (100 - s.depositPct) + '%') + '</b>' + f[1] + '</li>').join('') + '</ol></section>' +
    '<section class="stack"><h2>The range</h2><div class="pgrid">' + Object.keys(CATS).filter(k => !total || counts[k]).map(k => '<div class="pcard"><div class="pvis">' + (BOTTLE[k] || BOTTLE.AC) + '</div><div class="pbody"><h3>' + CATS[k] + '</h3>' + (counts[k] ? '<p class="pmeta">' + counts[k] + ' lines</p>' : '') + '</div></div>').join('') + '</div></section>';
}
function vSignin(){
  return '<section class="card stack" style="max-width:480px"><h1>Sign in</h1>' +
    '<form data-form="signin" class="stack">' + field('Business email', 'si-email', '', 'type="email" required autocomplete="username"') + field('Password', 'si-password', '', 'type="password" required autocomplete="current-password"') +
    '<div class="row"><button class="btn primary">Sign in</button><button type="button" class="btn" data-act="go" data-to="forgot">Forgot password</button></div></form>' +
    '<p class="muted">New here? <a href="#register" data-act="go" data-to="register">Register your business</a>.</p></section>';
}
function regFields(c){
  c = c || {};
  return '<h3>Company</h3><div class="grid2">' + field('Legal company name', 'rg-company', c.company, 'required maxlength="200"') + field('Trade licence number', 'rg-licenseNo', c.licenseNo, 'required maxlength="60"') +
    field('Licence expiry date', 'rg-licenseExpiry', c.licenseExpiry, 'type="date" required') + field('VAT TRN', 'rg-trn', c.trn, 'inputmode="numeric" maxlength="20"', 'optional') +
    selectF('Business type', 'rg-bizType', c.bizType || BIZ_TYPES[0], BIZ_TYPES) + selectF('Emirate or region', 'rg-emirate', c.emirate || EMIRATES[0], EMIRATES) + '</div>' +
    field('Business address', 'rg-address', c.address, 'required maxlength="200"') +
    '<h3>Contact person</h3><div class="grid2">' + field('Full name', 'rg-contact', c.contact, 'required autocomplete="name" maxlength="100"') + field('Mobile or WhatsApp', 'rg-phone', c.phone, 'type="tel" required autocomplete="tel" maxlength="30"') + '</div>' +
    '<h3>Verification documents</h3><p class="muted" style="font-size:.85rem">PDF, JPG, PNG or WebP, up to 10 MB each.</p><div class="grid2">' + fileF('Trade licence', 'rg-license', c.docs && c.docs.license ? 'on file, upload to replace' : 'required') + fileF('VAT certificate', 'rg-vat', 'optional') + fileF('ID of authorised signatory', 'rg-idDoc', 'optional') + '</div>';
}
function vRegister(){
  const dep = S.settings.depositPct;
  return '<section class="card stack" style="max-width:820px"><p class="eyebrow">Trade account application</p><h1>Register your business</h1>' +
    '<p class="muted">We review applications within one working day. Wholesale prices and ordering open once your trade licence is verified.</p>' +
    '<form data-form="register" class="stack"><h3>Sign-in details</h3><div class="grid2">' + field('Business email', 'rg-email', '', 'type="email" required autocomplete="username" maxlength="200"') + field('Password', 'rg-password', '', 'type="password" required minlength="8" autocomplete="new-password"', 'at least 8 characters') + field('Repeat password', 'rg-password2', '', 'type="password" required minlength="8" autocomplete="new-password"') + '</div>' + regFields() +
    '<label class="row" style="font-size:.9rem"><input type="checkbox" id="rg-agree" data-draft="rg-agree" required' + (dv('rg-agree', false) ? ' checked' : '') + '> We buy for resale or business use and accept the wholesale terms (' + dep + '% deposit, ' + (100 - dep) + '% balance before packing).</label>' +
    '<div class="row"><button class="btn primary">Submit application</button><button type="button" class="btn" data-act="go" data-to="signin">I already have an account</button></div></form></section>';
}
function vApplication(c){
  const st = CUST_STATUS[c.status] || CUST_STATUS.pending;
  let body = '';
  if (c.status === 'pending') body = '<div class="note">Your application is with our team. We check the trade licence and contact you at ' + h(c.email) + '. You can browse and order as soon as it is approved.</div>';
  if (c.status === 'rejected' || c.status === 'suspended') body = '<div class="note bad"><b>' + (c.status === 'suspended' ? 'This account is suspended.' : 'We could not approve this application.') + '</b> ' + h(c.reviewNote || '') + ' Contact ' + h(S.settings.email) + ' if you think this is a mistake.</div>';
  if (c.status === 'info') body = '<div class="note info"><b>We need a little more from you.</b> ' + h(c.reviewNote || '') + '</div><form data-form="resubmit" class="stack">' + regFields(c) + '<div><button class="btn primary">Send updated application</button></div></form>';
  return '<section class="card stack" style="max-width:820px"><div class="row between"><h1>' + h(c.company) + '</h1>' + pill(st) + '</div>' +
    '<dl class="kv"><dt>Application</dt><dd class="mono">' + h(c.id) + '</dd><dt>Submitted</dt><dd>' + fmtDate(c.createdAt) + '</dd><dt>Trade licence</dt><dd>' + h(c.licenseNo) + ', expires ' + fmtDate(c.licenseExpiry) + '</dd></dl>' + body + '</section>';
}
function visibleProducts(){
  const q = norm(UI.q);
  const order = Object.keys(CATS);
  return Object.values(products()).filter(p => p.active && (UI.cat === 'all' || p.cat === UI.cat) && matches(p, UI.q)).sort((a, b) => order.indexOf(a.cat) - order.indexOf(b.cat));
}
function stockPill(p){ return p.stock === 'out' ? '<span class="pill bad">Out of stock</span>' : p.stock === 'low' ? '<span class="pill warn">Low stock</span>' : '<span class="pill ok">In stock</span>'; }
function cartSummary(){ const l = cartLines(), sub = l.reduce((a, x) => a + x.qty * x.price, 0); return {count:l.length, units:l.reduce((a, x) => a + x.qty, 0), sub:r2(sub)}; }
function cartBarHtml(){ const c = cartSummary(); return '<span><b>' + c.count + '</b> products · <b>' + c.units + '</b> units · <b class="num">' + money(c.sub) + '</b> before VAT' + (c.sub < S.settings.minOrder ? ' <span style="opacity:.8">· minimum ' + money(S.settings.minOrder) + '</span>' : '') + '</span><button class="btn primary" data-act="go" data-to="cart">Review order</button>'; }
function vCatalog(){
  const c = me(), list = visibleProducts();
  const qtyIn = p => '<input class="qty num" type="number" min="0" step="' + p.casePack + '" inputmode="numeric" aria-label="Quantity for ' + h(fullName(p)) + '" id="q-' + p.sku + '" data-qty="' + p.sku + '" value="' + (UI.cart[p.sku] || '') + '" placeholder="0"' + (p.stock === 'out' ? ' disabled' : '') + '>';
  const head = '<div class="row between"><div><p class="eyebrow">' + h(c.company) + (c.discount ? ' · ' + c.discount + '% account discount applied' : '') + '</p><h1>Catalogue</h1></div>' +
    '<div class="row"><button class="btn" data-act="go" data-to="sheet">Order by sheet</button><span class="seg"><button type="button" data-act="view" data-v="grid" aria-pressed="' + (UI.view === 'grid') + '">Cards</button><button type="button" data-act="view" data-v="list" aria-pressed="' + (UI.view === 'list') + '">Quick order list</button></span></div></div>' +
    '<div class="row"><input id="search" type="search" placeholder="Search by product, size or SKU" value="' + h(UI.q) + '" style="max-width:320px" aria-label="Search products"><div class="catbar"><button class="chip" data-act="cat" data-c="all" aria-pressed="' + (UI.cat === 'all') + '">All</button>' +
    Object.keys(CATS).filter(k => Object.values(products()).some(p => p.cat === k)).map(k => '<button class="chip" data-act="cat" data-c="' + k + '" aria-pressed="' + (UI.cat === k) + '">' + CATS[k] + '</button>').join('') + '</div></div>';
  let body;
  if (!Object.keys(products()).length) body = '<div class="card empty">Our price list is being updated. Please check back shortly or contact ' + h(S.settings.email || 'us') + '.</div>';
  else if (!list.length) body = '<div class="card empty">No products match that search.</div>';
  else if (UI.view === 'list') body = '<div class="tscroll"><table><thead><tr><th>SKU</th><th>Product</th><th>Case</th><th>Min</th><th>Stock</th><th class="r">Unit price</th><th class="r">Qty (units)</th></tr></thead><tbody>' +
    list.map(p => '<tr><td class="mono">' + h(p.sku) + '</td><td><b>' + h(p.name) + '</b>' + (p.size ? ' <span class="muted">' + h(p.size) + '</span>' : '') + '</td><td class="num">' + p.casePack + '</td><td class="num">' + p.moq + '</td><td>' + stockPill(p) + '</td><td class="r num">' + money(p.price) + '</td><td class="r">' + qtyIn(p) + '</td></tr>').join('') + '</tbody></table></div>';
  else body = '<div class="pgrid">' + list.map(p => '<article class="pcard"><div class="pvis' + (p.image ? ' photo' : '') + '">' + (p.best ? '<span class="tag">Best seller</span>' : '') + (p.image ? '<img src="' + h(p.image) + '" alt="" loading="lazy">' : (BOTTLE[p.cat] || BOTTLE.AC)) + '</div><div class="pbody"><p class="pmeta mono">' + h(p.sku) + '</p><h3>' + h(p.name) + '</h3><p class="pmeta">' + (p.size ? '<span class="tag">' + h(p.size) + '</span>' : h(CATS[p.cat] || '')) + '</p>' +
    '<p class="price num">' + money(p.price) + ' <small>per unit, excl. VAT</small></p><p class="pmeta">Case of ' + p.casePack + ' · minimum ' + p.moq + '</p><div class="pfoot">' + qtyIn(p) + '<button class="btn small" data-act="addcase" data-sku="' + h(p.sku) + '"' + (p.stock === 'out' ? ' disabled' : '') + '>+ 1 case</button>' + (p.stock !== 'in' ? stockPill(p) : '') + '</div></div></article>').join('') + '</div>';
  return head + body + '<div class="cartbar" id="cartbar">' + cartBarHtml() + '</div>';
}
function linesTable(lines, editable){
  return '<div class="tscroll"><table><thead><tr><th>SKU</th><th>Product</th><th class="r">Unit price</th><th class="r">Qty</th><th class="r">Line total</th>' + (editable ? '<th></th>' : '') + '</tr></thead><tbody>' +
    lines.map(l => '<tr><td class="mono">' + h(l.sku) + '</td><td>' + h(l.name) + (l.origQty != null && l.origQty !== l.qty ? ' <span class="pill warn">was ' + l.origQty + '</span>' : '') + '</td><td class="r num">' + money(l.price) + '</td><td class="r num">' +
      (editable ? '<input class="qty num" type="number" min="0" step="' + l.casePack + '" id="q-' + l.sku + '" data-qty="' + l.sku + '" data-rerender="1" value="' + l.qty + '" aria-label="Quantity for ' + h(l.name) + '">' : l.qty) + '</td><td class="r num">' + money(l.qty * l.price) + '</td>' +
      (editable ? '<td><button class="btn small" data-act="rmline" data-sku="' + h(l.sku) + '">Remove</button></td>' : '') + '</tr>').join('') + '</tbody></table></div>';
}
function totalsHtml(t, o){
  return '<div class="totals"><span>Subtotal (' + t.units + ' units)</span><span class="num">' + money(t.subtotal) + '</span>' + (t.shipping ? '<span>Shipping</span><span class="num">' + money(t.shipping) + '</span>' : '') +
    '<span>VAT ' + o.vatPct + '%</span><span class="num">' + money(t.vat) + '</span><span class="big">Order total</span><span class="big num">' + money(t.total) + '</span>' +
    '<span>Deposit ' + o.depPct + '%' + (t.depositPaid ? ' · received' : '') + '</span><span class="num' + (t.depositPaid ? '' : ' due') + '">' + money(t.depositPaid || t.depositDue) + '</span>' +
    '<span>Balance' + (t.balancePaid ? ' · received' : '') + '</span><span class="num' + (t.balancePaid || !t.depositPaid ? '' : ' due') + '">' + money(t.depositPaid ? t.balanceDue : r2(t.total - t.depositDue)) + '</span></div>';
}
function draftOrder(){
  const s = S.settings, o = {lines:cartLines(), vatPct:s.vatPct, depPct:s.depositPct, shippingFee:0, deposit:null, balance:null};
  o.depositDue = r2(orderTotals(o).total * s.depositPct / 100); return o;
}
function vCart(){
  const c = me(), o = draftOrder(), t = orderTotals(o), s = S.settings, short = t.subtotal < s.minOrder;
  if (!o.lines.length) return '<section class="card empty stack"><h2>Your order is empty</h2><p>Add products from the catalogue, or upload a filled order sheet.</p><div class="row" style="justify-content:center"><button class="btn primary" data-act="go" data-to="catalog">Browse catalogue</button><button class="btn" data-act="go" data-to="sheet">Order by sheet</button></div></section>';
  return '<div class="row between"><h1>Review your order</h1><button class="btn" data-act="go" data-to="catalog">Add more products</button></div><div class="split"><div class="stack">' + linesTable(o.lines, true) +
    '<form data-form="place" id="placeform" class="card stack"><h3>Delivery</h3>' + selectF('How will you receive the goods?', 'ord-delivery', 'Pickup from our warehouse', ['Pickup from our warehouse', 'Ship to our address']) +
    field('Shipping address', 'ord-shipTo', c.address, '', 'used only for shipping') + '<div class="grid2">' + field('Your PO reference', 'ord-poRef', '', '', 'optional') + '</div>' +
    '<label class="f">Notes for our team <span class="hint">optional</span><textarea id="f-ord-notes" data-draft="ord-notes">' + h(dv('ord-notes', '')) + '</textarea></label></form></div>' +
    '<aside class="card stack">' + totalsHtml(t, o) + (short ? '<div class="note bad">Minimum order is ' + money(s.minOrder) + ' before VAT. Add ' + money(s.minOrder - t.subtotal) + ' more.</div>' : '<div class="note">Placing the order reserves nothing yet. Pay the ' + s.depositPct + '% deposit of <b class="num">' + money(t.depositDue) + '</b> to send it for review.</div>') +
    '<button class="btn primary" form="placeform"' + (short ? ' disabled' : '') + '>Place order</button><button class="btn small" data-act="clearcart" data-confirm="1">Empty the order</button></aside></div>';
}
function vSheet(){
  const pv = UI.sheet;
  let prev = '';
  if (pv){
    const ok = pv.rows.filter(r => r.qty > 0);
    prev = '<div class="card stack"><h3>Check before adding: ' + h(pv.file) + '</h3><p class="muted">' + ok.length + ' lines ready' + (pv.rows.length - ok.length ? ', ' + (pv.rows.length - ok.length) + ' skipped' : '') + '.</p><div class="tscroll"><table><thead><tr><th>SKU</th><th>Product</th><th class="r">Asked</th><th class="r">Will add</th><th>Notes</th></tr></thead><tbody>' +
      pv.rows.map(r => '<tr><td class="mono">' + h(r.sku) + '</td><td>' + h(r.name || '') + '</td><td class="r num">' + h(r.asked) + '</td><td class="r num">' + r.qty + '</td><td>' + (r.issues.length ? '<span class="pill ' + (r.qty ? 'warn' : 'bad') + '">' + h(r.issues.join('; ')) + '</span>' : '<span class="pill ok">OK</span>') + '</td></tr>').join('') +
      '</tbody></table></div><div class="row"><button class="btn primary" data-act="sheetapply"' + (ok.length ? '' : ' disabled') + '>Add ' + ok.length + ' lines to the order</button><button class="btn" data-act="sheetclear">Discard</button></div></div>';
  }
  return '<div class="row between"><h1>Order by sheet</h1><button class="btn" data-act="go" data-to="catalog">Back to catalogue</button></div><div class="grid2">' +
    '<div class="card stack"><p class="eyebrow">Step 1</p><h3>Download the order sheet</h3><p class="muted">An Excel file with every product, your unit price, case pack and minimum. Fill the “Order qty (units)” column and save it.</p><div><a class="btn primary" href="/api/order-sheet.xlsx" download>Download order sheet (.xlsx)</a></div></div>' +
    '<div class="card stack"><p class="eyebrow">Step 2</p><h3>Upload the filled sheet</h3><p class="muted">Excel (.xlsx) or CSV. We match rows by SKU, round to full cases, and show you the result before anything is added.</p><input type="file" id="sheetfile" data-sheet="order" accept=".xlsx,.csv" aria-label="Filled order sheet"></div></div>' + prev;
}
function stepsHtml(o){
  const st = STATUS[o.status], names = ['Order placed', o.depPct + '% deposit', 'Our review', 'Balance payment', 'Packing', o.delivery === 'ship' ? 'Shipped' : 'Ready for pickup', 'Completed'];
  if (st.step < 0) return '';
  return '<ol class="steps">' + names.map((n, i) => '<li class="' + (i < st.step || o.status === 'completed' ? 'done' : i === st.step ? 'now' : '') + '"><b>' + n + '</b>' + (i < st.step || o.status === 'completed' ? 'Done' : i === st.step ? 'In progress' : 'Upcoming') + '</li>').join('') + '</ol>';
}
function bankHtml(ref){ const s = S.settings; return '<div class="bank"><span>Bank</span><b>' + h(s.bankName) + '</b><span>Account name</span><b>' + h(s.bankAccount) + '</b><span>IBAN</span><b>' + h(s.iban) + '</b><span>SWIFT</span><b>' + h(s.swift) + '</b><span>Reference</span><b>' + h(ref) + '</b></div>'; }
function payCard(o, kind, amount){
  if (!S.settings.iban) return '<div class="note"><b>' + money(amount) + ' is due.</b> Our bank details are being updated. Please contact ' + h(S.settings.email || S.settings.phone || 'us') + ' for payment instructions.</div>';
  return '<div class="card stack" style="border-color:var(--accent)"><p class="eyebrow">Payment due</p><h2>' + (kind === 'deposit' ? 'Pay the ' + o.depPct + '% deposit' : 'Pay the balance') + ': <span class="num">' + money(amount) + '</span></h2>' +
    '<p class="muted">Transfer the exact amount to the account below and quote the order number. Then upload the transfer receipt so we can match it.</p>' + bankHtml(o.id) +
    '<form data-form="pay" data-kind="' + kind + '" data-id="' + h(o.id) + '" class="stack"><div class="grid2">' + field('Transfer reference number', 'pay-ref', '', 'required maxlength="80"') + fileF('Transfer receipt', 'pay-proof', 'PDF or photo, required') + '</div><div><button class="btn primary">Submit payment proof</button></div></form></div>';
}
function logHtml(o){ return '<ul class="log">' + o.log.slice().reverse().map(e => '<li><time>' + fmtDT(e.at) + ' · ' + (e.who === 'admin' ? h(S.settings.company) + (e.by ? ' (' + h(e.by) + ')' : '') : e.who === 'customer' ? 'Customer' : 'System') + '</time>' + h(e.text) + '</li>').join('') + '</ul>'; }
function orderInfo(o){
  return '<dl class="kv"><dt>Placed</dt><dd>' + fmtDT(o.createdAt) + '</dd><dt>Delivery</dt><dd>' + (o.delivery === 'ship' ? 'Ship to ' + h(o.shipTo) : 'Pickup from our warehouse') + '</dd>' + (o.poRef ? '<dt>PO reference</dt><dd>' + h(o.poRef) + '</dd>' : '') + (o.notes ? '<dt>Notes</dt><dd>' + h(o.notes) + '</dd>' : '') +
    (o.dispatch && o.dispatch.tracking ? '<dt>Courier</dt><dd>' + h(o.dispatch.courier) + ' · <span class="mono">' + h(o.dispatch.tracking) + '</span></dd>' : '') + '</dl>';
}
function vOrder(id){
  const o = S.orders[id], c = me();
  if (!o || !c || o.customerId !== c.id) return '<section class="card empty">That order was not found.</section>';
  const t = orderTotals(o), st = STATUS[o.status], s = S.settings;
  let action = '';
  if (o.status === 'awaiting_deposit') action = payCard(o, 'deposit', t.depositDue);
  if (o.status === 'awaiting_balance') action = (o.review && o.review.note ? '<div class="note ok"><b>Order approved.</b> ' + h(o.review.note) + '</div>' : '') + payCard(o, 'balance', t.balanceDue);
  if (o.status === 'deposit_submitted' || o.status === 'balance_submitted') action = '<div class="note info">We have your transfer receipt and are matching it with our bank. This usually takes one working day.</div>';
  if (o.status === 'under_review') action = '<div class="note info">Deposit received. We are confirming stock and totals, then we will ask for the balance.</div>';
  if (o.status === 'packing') action = '<div class="note info">Paid in full. Your order is being packed' + (s.leadDays ? ', usually within ' + s.leadDays + ' working days' : '') + '.</div>';
  if (o.status === 'ready_pickup') action = '<div class="note ok"><b>Ready for pickup.</b> ' + (s.pickupAddress ? 'Collect from: ' + h(s.pickupAddress) + '. ' : '') + 'Bring the order number and company ID.</div>';
  if (o.status === 'shipped') action = '<div class="note ok"><b>Shipped.</b> ' + (o.dispatch && o.dispatch.courier ? h(o.dispatch.courier) + (o.dispatch.tracking ? ', tracking ' + h(o.dispatch.tracking) : '') + '.' : '') + '</div>';
  if (o.status === 'rejected') action = '<div class="note bad"><b>We could not approve this order.</b> ' + h(o.review && o.review.note || '') + ' Your deposit will be refunded to the paying account.</div>';
  return '<div class="row between"><div><p class="eyebrow">Order</p><h1 class="mono">' + h(o.id) + '</h1></div><div class="row">' + pill(st) + '<a class="btn" href="/api/orders/' + encodeURIComponent(o.id) + '/proforma.pdf" target="_blank" rel="noopener">Proforma invoice (PDF)</a><button class="btn" data-act="reorder" data-id="' + h(o.id) + '">Reorder</button>' +
    (o.status === 'awaiting_deposit' ? '<button class="btn danger" data-act="cancel" data-id="' + h(o.id) + '" data-confirm="1">Cancel order</button>' : '') + '</div></div>' + stepsHtml(o) + action +
    '<div class="split"><div class="stack">' + linesTable(o.lines, false) + '<div class="card stack"><h3>Activity</h3>' + logHtml(o) + '</div></div><aside class="stack"><div class="card stack">' + totalsHtml(t, o) + '</div><div class="card stack">' + orderInfo(o) + '</div></aside></div>';
}
function vOrders(){
  const c = me(), list = Object.values(S.orders).filter(o => o.customerId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!list.length) return '<section class="card empty stack"><h2>No orders yet</h2><p>Your orders and their payment status appear here.</p><div><button class="btn primary" data-act="go" data-to="catalog">Browse catalogue</button></div></section>';
  return '<h1>Your orders</h1><div class="tscroll"><table><thead><tr><th>Order</th><th>Placed</th><th>Status</th><th class="r">Units</th><th class="r">Total</th><th>Next step</th></tr></thead><tbody>' +
    list.map(o => { const t = orderTotals(o), st = STATUS[o.status]; return '<tr class="click" data-act="go" data-to="order-' + h(o.id) + '"><td class="mono">' + h(o.id) + '</td><td>' + fmtDate(o.createdAt) + '</td><td>' + pill(st) + '</td><td class="r num">' + t.units + '</td><td class="r num">' + money(t.total) + '</td><td>' +
      (o.status === 'awaiting_deposit' ? 'Pay deposit ' + money(t.depositDue) : o.status === 'awaiting_balance' ? 'Pay balance ' + money(t.balanceDue) : st.who === 'admin' ? 'With our team' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
}
function vAccount(){
  const c = me(), days = Math.round((new Date(c.licenseExpiry) - Date.now()) / 864e5);
  return '<h1>Company account</h1>' + (days < 60 ? '<div class="note' + (days < 0 ? ' bad' : '') + '">Your trade licence ' + (days < 0 ? 'expired on ' : 'expires on ') + fmtDate(c.licenseExpiry) + '. Upload the renewed licence below to keep ordering.</div>' : '') +
    (UI.user && !UI.user.verified ? '<div class="note info">Please confirm your email address using the link we sent to ' + h(UI.user.email) + '.</div>' : '') +
    '<div class="split"><div class="stack"><div class="card stack"><div class="row between"><h2>' + h(c.company) + '</h2>' + pill(CUST_STATUS[c.status]) + '</div><dl class="kv"><dt>Account</dt><dd class="mono">' + h(c.id) + '</dd><dt>Trade licence</dt><dd>' + h(c.licenseNo) + ', expires ' + fmtDate(c.licenseExpiry) + '</dd><dt>VAT TRN</dt><dd>' + h(c.trn || 'Not provided') + '</dd><dt>Business type</dt><dd>' + h(c.bizType) + '</dd><dt>Address</dt><dd>' + h(c.address) + ', ' + h(c.emirate) + '</dd><dt>Contact</dt><dd>' + h(c.contact) + ' · ' + h(c.email) + ' · ' + h(c.phone) + '</dd>' + (c.discount ? '<dt>Account discount</dt><dd>' + c.discount + '%</dd>' : '') + '</dl></div>' + passwordCard() + '</div>' +
    '<div class="card stack"><h3>Documents on file</h3>' + docView(c.docs.license, 'Trade licence') + docView(c.docs.vat, 'VAT certificate') + docView(c.docs.idDoc, 'Signatory ID') +
    '<form data-form="renew" class="stack"><h3>Upload a renewed licence</h3>' + field('New expiry date', 'rn-expiry', '', 'type="date" required') + fileF('Renewed trade licence', 'rn-license', 'required') + '<div><button class="btn">Send for verification</button></div></form></div></div>';
}
function vForgot(){
  return '<section class="card stack" style="max-width:480px"><h1>Reset your password</h1><p class="muted">Enter your account email. If it matches an account, we send a link that works for one hour.</p>' +
    '<form data-form="forgot" class="stack">' + field('Business email', 'fg-email', '', 'type="email" required autocomplete="username"') + '<div class="row"><button class="btn primary">Send reset link</button><button type="button" class="btn" data-act="go" data-to="signin">Back to sign in</button></div></form></section>';
}
function vReset(token){
  return '<section class="card stack" style="max-width:480px"><h1>Choose a new password</h1>' +
    '<form data-form="reset" data-token="' + h(token) + '" class="stack">' + field('New password', 'rs-password', '', 'type="password" required minlength="8" autocomplete="new-password"', 'at least 8 characters') + field('Repeat new password', 'rs-password2', '', 'type="password" required minlength="8" autocomplete="new-password"') +
    '<div><button class="btn primary">Save password</button></div></form></section>';
}
function passwordCard(){
  return '<div class="card stack"><h3>Change password</h3><form data-form="password" class="stack">' + field('Current password', 'pw-current', '', 'type="password" required autocomplete="current-password"') + field('New password', 'pw-password', '', 'type="password" required minlength="8" autocomplete="new-password"', 'at least 8 characters') + '<div><button class="btn">Change password</button></div></form></div>';
}
