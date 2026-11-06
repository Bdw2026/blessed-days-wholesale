'use strict';
/* Page shell, routing and every action a person can take. Each action calls the server, then redraws from what the server returns. */
function headerHtml(){
  const s = S.settings, c = me(), r = UI.route;
  const nav = (label, to, on, extra) => '<button data-act="go" data-to="' + to + '"' + (on ? ' aria-current="page"' : '') + '>' + label + (extra || '') + '</button>';
  const logo = '<button class="logo" data-act="go" data-to="' + (isAdmin() ? 'admin' : 'home') + '"><b>' + h(s.company || '') + '</b><span>' + (isAdmin() ? 'Wholesale admin' : 'Wholesale portal · Cliganic products') + '</span></button>';
  if (isAdmin()){
    const n = adminTodo();
    return logo + '<nav class="main" aria-label="Admin">' + nav('Today', 'admin', r === 'admin' || r.indexOf('admin') !== 0, n ? '<span class="badge">' + n + '</span>' : '') + nav('Orders', 'admin-orders', r.indexOf('admin-order') === 0) +
      nav('Customers', 'admin-customers', r.indexOf('admin-customer') === 0) + nav('Products', 'admin-products', r === 'admin-products') + nav('Setup', 'admin-setup', r === 'admin-setup') + '</nav><span class="who">' + h(UI.user.name || UI.user.email) + '<button data-act="logout">Sign out</button></span>';
  }
  if (!UI.user) return logo + '<nav class="main" aria-label="Main">' + nav('Home', 'home', r === 'home') + '</nav><span class="who"><button data-act="go" data-to="signin">Sign in</button><button data-act="go" data-to="register">Register</button></span>';
  const ok = c && c.status === 'approved', cs = cartSummary();
  return logo + '<nav class="main" aria-label="Main">' + (ok ? nav('Catalogue', 'catalog', r === 'catalog' || r === 'home') + nav('Order by sheet', 'sheet', r === 'sheet') + nav('Orders', 'orders', r.indexOf('order') === 0) + nav('Account', 'account', r === 'account') +
    nav('Your order', 'cart', r === 'cart', '<span class="badge" id="cartbadge">' + cs.count + '</span>') : nav('Application', 'home', true)) + '</nav><span class="who">' + h(c ? c.company : UI.user.email) + '<button data-act="logout">Sign out</button></span>';
}
function viewHtml(){
  const r = UI.route, c = me();
  if (r.indexOf('reset-') === 0) return vReset(r.slice(6));
  if (isAdmin()){
    if (r === 'admin-orders') return vAdminOrders();
    if (r.indexOf('admin-order-') === 0) return vAdminOrder(r.slice(12));
    if (r === 'admin-customers') return vAdminCustomers();
    if (r.indexOf('admin-customer-') === 0) return vAdminCustomer(r.slice(15));
    if (r === 'admin-products') return vAdminProducts();
    if (r === 'admin-setup') return vAdminSetup();
    return vAdmin();
  }
  if (!UI.user){
    if (r === 'register') return vRegister();
    if (r === 'forgot') return vForgot();
    if (r === 'signin' || r.indexOf('admin') === 0 || r.indexOf('order') === 0 || ['cart', 'sheet', 'account', 'catalog'].indexOf(r) >= 0) return vSignin();
    return vHome();
  }
  if (!c) return '<section class="card empty">This account has no trade profile. Contact ' + h(S.settings.email || 'us') + '.</section>';
  if (c.status !== 'approved') return vHome();
  if (r === 'cart') return vCart();
  if (r === 'sheet') return vSheet();
  if (r === 'orders') return vOrders();
  if (r.indexOf('order-') === 0) return vOrder(r.slice(6));
  if (r === 'account') return vAccount();
  return vCatalog();
}
function render(){
  renderQueued = false;
  const a = document.activeElement, keep = a && a.id && $('app').contains(a) ? {id:a.id, s:a.selectionStart, e:a.selectionEnd} : null;
  $('hdr').innerHTML = headerHtml();
  $('app').innerHTML = UI.loaded ? viewHtml() : '<div class="empty">Loading…</div>';
  $('foot').textContent = S.settings.company ? S.settings.company + (S.settings.phone ? ' · ' + S.settings.phone : '') + (S.settings.email ? ' · ' + S.settings.email : '') : '';
  const m = $('modal'); m.hidden = !UI.modal; m.innerHTML = UI.modal || '';
  if (keep){ const el = $(keep.id); if (el){ el.focus({preventScroll:true}); try { if (keep.s != null) el.setSelectionRange(keep.s, keep.e); } catch (e) { /* not a text field */ } } }
}
function form(fields, files){ const f = new FormData(); Object.keys(fields).forEach(k => f.append(k, fields[k] == null ? '' : fields[k])); Object.keys(files || {}).forEach(k => { if (files[k]) f.append(k, files[k], files[k].name); }); return f; }
const regValues = () => { const o = {}; ['company', 'licenseNo', 'licenseExpiry', 'trn', 'bizType', 'emirate', 'address', 'contact', 'phone'].forEach(k => { if ('rg-' + k in UI.drafts) o[k] = val('rg-' + k); }); return o; };
const regFiles = () => ({license:UI.files['rg-license'], vat:UI.files['rg-vat'], idDoc:UI.files['rg-idDoc']});
async function afterSignIn(d){ applySession(d); clearDrafts('si-'); clearDrafts('rg-'); await refresh(); go(isAdmin() ? 'admin' : 'home'); }

/* Moving between screens quietly reloads the data, so prices, stock and order status stay current. */
let lastRefresh = 0;
function bgRefresh(){ if (!UI.user || Date.now() - lastRefresh < 8000) return; lastRefresh = Date.now(); refresh().then(requestRender).catch(() => {}); }
const ACT = {
  go(d){ if (d.filter || /^admin-(orders|customers|products)$/.test(d.to)) UI.filter = d.filter || 'all'; if (/^(catalog|admin-products)$/.test(d.to)){ UI.q = ''; UI.cat = 'all'; } go(d.to); bgRefresh(); },
  async logout(){ try { await api('POST', '/api/auth/logout', {}); } catch (e) { /* signed out anyway */ } UI.user = null; UI.customer = null; UI.cart = {}; S.orders = {}; S.products = {}; S.customers = {}; applySession(await api('GET', '/api/session')); go('home'); },
  view(d){ UI.view = d.v; LS.set('view', UI.view); render(); },
  cat(d){ UI.cat = d.c; render(); },
  filter(d){ UI.filter = d.f; render(); },
  addcase(d){ const p = product(d.sku), cur = UI.cart[d.sku] || 0; setQty(d.sku, cur + p.casePack < p.moq ? p.moq : cur + p.casePack); },
  rmline(d){ delete UI.cart[d.sku]; saveCart(); render(); },
  clearcart(){ UI.cart = {}; saveCart(); render(); },
  closemodal(){ UI.modal = null; render(); },
  sheetapply(){ let n = 0; UI.sheet.rows.forEach(r => { if (r.qty > 0 && product(r.sku)){ UI.cart[r.sku] = r.qty; n++; } }); saveCart(); UI.sheet = null; toast(n + ' lines added to your order'); go('cart'); },
  sheetclear(){ UI.sheet = null; render(); },
  reorder(d){ let n = 0; S.orders[d.id].lines.forEach(l => { const res = checkQty(product(l.sku), l.qty); if (res.qty){ UI.cart[l.sku] = res.qty; n++; } }); saveCart(); toast(n ? n + ' lines copied at today’s prices' : 'Those products are no longer available'); go('cart'); },
  async cancel(d){ await api('POST', '/api/orders/' + encodeURIComponent(d.id) + '/cancel', {}); await refresh(); toast('Order cancelled'); render(); },
  async 'order-action'(d){
    const o = S.orders[d.id], body = {action:d.do};
    if (d.do === 'approve'){ body.qtys = o.lines.map((l, i) => dv('rv-q' + i, l.qty)); body.shippingFee = dv('rv-ship', o.shippingFee || 0); body.note = val('rv-note'); }
    if (d.do === 'reject') body.note = val('rv-note');
    if (d.do === 'shipped'){ body.courier = val('dp-courier'); body.tracking = val('dp-tracking'); }
    applyAdmin(await api('POST', '/api/admin/orders/' + encodeURIComponent(d.id) + '/action', body));
    clearDrafts('rv-'); clearDrafts('dp-');
    toast({'dep-ok':'Deposit confirmed', approve:'Approved. The customer has been asked for the balance', reject:'Order rejected', 'bal-ok':'Balance confirmed. Packing can start', ready:'Customer told the order is ready', shipped:'Marked as shipped', complete:'Order completed', refunded:'Refund recorded'}[d.do] || 'Saved');
    render();
  },
  async 'customer-action'(d){
    const body = {action:d.do, note:val('cu-note')}; if (d.do === 'discount') body.discount = dv('cu-discount', 0);
    applyAdmin(await api('POST', '/api/admin/customers/' + encodeURIComponent(d.id) + '/decision', body)); clearDrafts('cu-');
    toast({approve:'Account approved. The customer can now order', info:'Request sent to the applicant', reject:'Application declined', suspend:'Account suspended', reactivate:'Account reactivated', discount:'Discount saved'}[d.do] || 'Saved'); render();
  },
  async importapply(){ const ip = UI.importPreview; UI.importPreview = null; const d = await api('POST', '/api/admin/prices/apply', {items:ip.matched}); applyAdmin(d); toast(d.applied + ' prices updated'); render(); },
  importclear(){ UI.importPreview = null; render(); },
  async 'staff-toggle'(d){ applyAdmin(await api('POST', '/api/admin/staff/' + encodeURIComponent(d.id) + '/disabled', {disabled:!!d.off})); render(); }
};
function setQty(sku, qty){
  const p = product(sku), res = checkQty(p, qty);
  if (res.qty > 0) UI.cart[sku] = res.qty; else delete UI.cart[sku];
  saveCart(); if (res.issues.length) toast(fullName(p) + ': ' + res.issues.join('; '));
  const inp = $('q-' + sku); if (inp) inp.value = res.qty || '';
  const bar = $('cartbar'); if (bar) bar.innerHTML = cartBarHtml();
  const b = $('cartbadge'); if (b) b.textContent = cartSummary().count;
}
const FORMS = {
  async signin(){ await afterSignIn(await api('POST', '/api/auth/login', {email:val('si-email'), password:dv('si-password', '')})); },
  async forgot(){ await api('POST', '/api/auth/forgot', {email:val('fg-email')}); clearDrafts('fg-'); toast('If that email has an account, a reset link is on its way'); go('signin'); },
  async reset(f){
    if (dv('rs-password', '') !== dv('rs-password2', '')) return toast('The two passwords do not match.');
    await api('POST', '/api/auth/reset', {token:f.dataset.token, password:dv('rs-password', '')}); clearDrafts('rs-'); toast('Password saved. Sign in with the new password'); go('signin');
  },
  async password(){ await api('POST', '/api/auth/password', {current:dv('pw-current', ''), password:dv('pw-password', '')}); clearDrafts('pw-'); toast('Password changed'); render(); },
  async register(){
    if (dv('rg-password', '') !== dv('rg-password2', '')) return toast('The two passwords do not match.');
    if (!UI.files['rg-license']) return toast('Attach your trade licence to continue.');
    const d = await api('POST', '/api/auth/register', form(Object.assign({bizType:BIZ_TYPES[0], emirate:EMIRATES[0]}, regValues(), {email:val('rg-email'), password:dv('rg-password', ''), agree:dv('rg-agree', false) ? 'yes' : ''}), regFiles()));
    toast('Application submitted'); await afterSignIn(d);
  },
  async resubmit(){ applySession(await api('POST', '/api/me/application', form(regValues(), regFiles()))); clearDrafts('rg-'); toast('Updated application sent'); render(); },
  async renew(){
    if (!UI.files['rn-license']) return toast('Attach the renewed licence.');
    const keep = UI.cart; applySession(await api('POST', '/api/me/licence', form({licenseExpiry:val('rn-expiry')}, {license:UI.files['rn-license']}))); UI.cart = keep; clearDrafts('rn-'); toast('Renewed licence sent for verification'); render();
  },
  async place(){
    const lines = cartLines().map(l => ({sku:l.sku, qty:l.qty})); if (!lines.length) return;
    const ship = val('ord-delivery').indexOf('Ship') === 0;
    let d; try { d = await api('POST', '/api/orders', {lines, delivery:ship ? 'ship' : 'pickup', shipTo:val('ord-shipTo') || me().address, poRef:val('ord-poRef'), notes:val('ord-notes')}); }
    catch (e) { await refresh().catch(() => {}); render(); throw e; } // prices or stock may have changed: show the fresh catalogue
    UI.cart = {}; saveCart(); clearDrafts('ord-'); await refresh(); toast('Order placed. Pay the deposit to send it for review'); go('order-' + d.order.id);
  },
  async pay(f){
    if (!UI.files['pay-proof']) return toast('Attach the transfer receipt.');
    await api('POST', '/api/orders/' + encodeURIComponent(f.dataset.id) + '/payment', form({kind:f.dataset.kind, ref:val('pay-ref')}, {proof:UI.files['pay-proof']}));
    clearDrafts('pay-'); await refresh(); toast('Payment proof sent. We will confirm once it reaches our bank'); render();
  },
  async 'a-note'(f){ applyAdmin(await api('POST', '/api/admin/orders/' + encodeURIComponent(f.dataset.id) + '/action', {action:'note', text:val('nt-text')})); clearDrafts('nt-'); toast('Note added and emailed to the customer'); render(); },
  async setup(){ const p = {}; Object.keys(UI.drafts).forEach(k => { if (k.indexOf('st-') === 0) p[k.slice(3)] = val(k); }); applyAdmin(await api('PUT', '/api/admin/settings', p)); clearDrafts('st-'); toast('Setup saved'); render(); },
  async addstaff(){ applyAdmin(await api('POST', '/api/admin/staff', {name:val('sf-name'), email:val('sf-email'), password:dv('sf-password', '')})); clearDrafts('sf-'); toast('Staff member added. Share the temporary password with them privately'); render(); },
  async addproduct(){ applyAdmin(await api('POST', '/api/admin/products', {sku:val('np-sku'), name:val('np-name'), size:val('np-size'), cat:dv('np-cat', 'AC'), price:val('np-price'), casePack:val('np-casePack') || 12, moq:val('np-moq') || 12})); clearDrafts('np-'); toast('Product added'); render(); }
};
const oops = err => toast(err && err.message ? err.message : 'That did not work. Try again.');
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  if (el.tagName === 'TR' && e.target.closest('input,select,textarea,a,button,label')) return;
  if (el.tagName === 'A') e.preventDefault();
  if (el.dataset.confirm && !el.classList.contains('armed')){ const t = el.textContent; el.classList.add('armed'); el.textContent = 'Click again to confirm'; setTimeout(() => { if (el.isConnected){ el.classList.remove('armed'); el.textContent = t; } }, 4000); return; }
  const fn = ACT[el.dataset.act]; if (!fn || el.dataset.busy) return;
  el.dataset.busy = '1';
  Promise.resolve().then(() => fn(el.dataset, el)).catch(err => { oops(err); render(); }).then(() => { delete el.dataset.busy; });
});
document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault();
  const fn = FORMS[f.dataset.form], btn = f.querySelector('button:not([type=button])') || document.querySelector('button[form="' + f.id + '"]'); if (!fn || (btn && btn.disabled)) return;
  if (btn) btn.disabled = true;
  Promise.resolve().then(() => fn(f)).catch(oops).then(() => { if (btn && btn.isConnected) btn.disabled = false; });
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.draft) UI.drafts[t.dataset.draft] = t.type === 'checkbox' ? t.checked : t.value;
  if (t.id === 'search'){ UI.q = t.value; render(); }
});
document.addEventListener('change', async e => {
  const t = e.target;
  try {
    if (t.dataset.file){ if (t.files[0]){ if (t.files[0].size > 10 * 1024 * 1024){ t.value = ''; return toast('That file is over 10 MB. Upload a smaller copy.'); } UI.files[t.dataset.file] = t.files[0]; } return; }
    if (t.dataset.qty){ setQty(t.dataset.qty, t.value); if (t.dataset.rerender) render(); return; }
    if (t.dataset.pedit){
      const sku = t.dataset.pedit, k = t.dataset.k, p = product(sku), body = {};
      body[k] = k === 'active' ? t.checked : k === 'stock' || k === 'size' ? t.value.trim() : k === 'price' ? (t.value === '' ? 0 : Number(t.value)) : Number(t.value);
      try { const d = await api('PUT', '/api/admin/products/' + encodeURIComponent(sku), body); S.products[sku] = Object.assign({}, p, d.product); toast(sku + ' saved'); if (k === 'price') requestRender(); }
      catch (err) { oops(err); if (k === 'active') t.checked = p.active; else t.value = p[k] || ''; }
      return;
    }
    if (t.dataset.pimg && t.files[0]){ applyAdmin(await api('POST', '/api/admin/products/' + encodeURIComponent(t.dataset.pimg) + '/image', form({}, {image:t.files[0]}))); toast('Photo saved'); render(); return; }
    if (t.dataset.sheet && t.files[0]){
      const f = form({}, {sheet:t.files[0]});
      if (t.dataset.sheet === 'order'){ UI.sheet = await api('POST', '/api/order-sheet/parse', f); if (!UI.sheet.rows.length){ UI.sheet = null; toast('No quantities were filled in that sheet.'); } }
      else UI.importPreview = await api('POST', '/api/admin/prices/parse', f);
      render();
    }
  } catch (err) { oops(err); if (t.type === 'file') t.value = ''; }
});
document.addEventListener('focusout', () => { if (renderQueued) setTimeout(() => { if (renderQueued) requestRender(); }, 60); });
window.addEventListener('hashchange', () => { const r = location.hash.slice(1) || 'home'; if (r !== UI.route){ UI.route = r; UI.modal = null; render(); } });

/* ---------- start ---------- */
(async function boot(){
  UI.view = LS.get('view', 'grid'); UI.route = (location.hash || '').slice(1) || 'home';
  try { applySession(await api('GET', '/api/session')); await refresh(); } catch (e) { oops(e); }
  UI.loaded = true;
  if (UI.route === 'verified'){ toast('Email address confirmed. Thank you'); UI.route = 'home'; history.replaceState(null, '', '#home'); }
  if (isAdmin() && UI.route.indexOf('admin') !== 0 && UI.route.indexOf('reset-') !== 0) UI.route = 'admin';
  render();
  // Pick up changes made by the other side (staff or customer) without a manual reload.
  setInterval(() => { if (document.visibilityState === 'visible' && UI.user) refresh().then(requestRender).catch(() => {}); }, 45000);
})();
