'use strict';
/* State, server calls and small helpers shared by every screen. */
const {CATS, STATUS, CUST_STATUS, BIZ_TYPES, EMIRATES, r2, money, norm, fullName, orderTotals, checkQty} = Core;
const S = {settings:{counts:{}}, products:{}, customers:{}, orders:{}, staff:[], outbox:[], emailReady:true};
const UI = {user:null, customer:null, route:'home', cart:{}, drafts:{}, files:{}, cat:'all', q:'', view:'grid', filter:'all', modal:null, sheet:null, importPreview:null, loaded:false};
const LS = {
  get(k, d){ try { const v = localStorage.getItem('bdw:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v){ try { localStorage.setItem('bdw:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
};
const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const fmtDate = t => t ? new Date(t).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}) : '';
const fmtDT = t => t ? new Date(t).toLocaleString('en-GB', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : '';
const toMap = (list, key) => { const m = {}; (list || []).forEach(x => { m[x[key]] = x; }); return m; };
const isAdmin = () => !!(UI.user && UI.user.role === 'admin');
const me = () => UI.customer;
const products = () => S.products;
const product = sku => S.products[sku];
const matches = (p, q) => { const hay = (p.name + ' ' + (p.size || '') + ' ' + p.sku).toLowerCase(); return String(q || '').toLowerCase().split(/\s+/).every(w => !w || hay.indexOf(w) >= 0); };

/* ---------- server ---------- */
async function api(method, url, body){
  const opt = {method, headers:{}, credentials:'same-origin'};
  if (body instanceof FormData) opt.body = body;
  else if (body !== undefined){ opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  let res; try { res = await fetch(url, opt); } catch (e) { throw new Error('You appear to be offline. Check your connection and try again.'); }
  let data = null; try { data = await res.json(); } catch (e) { /* not JSON */ }
  if (!res.ok){
    if (res.status === 401 && UI.user){ UI.user = null; UI.customer = null; UI.route = 'signin'; }
    throw new Error((data && data.error) || 'That did not work. Try again.');
  }
  return data;
}
function applySession(d){
  UI.user = d.user || null; UI.customer = d.customer || null;
  if (!isAdmin()) S.settings = d.settings;
  if (UI.customer){ S.customers = {[UI.customer.id]:UI.customer}; UI.cart = LS.get('cart:' + UI.customer.id, {}); }
  if (d.settings && d.settings.company) document.title = d.settings.company + ' Wholesale';
}
function applyAdmin(d){
  S.settings = d.settings; S.products = toMap(d.products, 'sku'); S.customers = toMap(d.customers, 'id'); S.orders = toMap(d.orders, 'id');
  S.staff = d.staff; S.outbox = d.outbox; S.emailReady = d.emailReady; S.storageAtRisk = !!d.storageAtRisk;
}
/* Reloads everything this person is allowed to see. */
async function refresh(){
  if (!UI.user) return;
  if (isAdmin()){ applyAdmin(await api('GET', '/api/admin/state')); return; }
  const keepCart = UI.cart;
  applySession(await api('GET', '/api/session')); UI.cart = keepCart;
  if (!UI.user) return;
  const ok = UI.customer && UI.customer.status === 'approved';
  const [o, c] = await Promise.all([api('GET', '/api/orders'), ok ? api('GET', '/api/catalog') : Promise.resolve({products:[]})]);
  S.orders = toMap(o.orders, 'id'); S.products = toMap(c.products, 'sku');
}
function cartLines(){
  const out = [];
  Object.keys(UI.cart).forEach(sku => { const p = product(sku), qty = UI.cart[sku]; if (p && p.active && qty > 0) out.push({sku, name:fullName(p), size:p.size || '', casePack:p.casePack, price:p.price, qty}); });
  return out;
}
function saveCart(){ if (UI.customer) LS.set('cart:' + UI.customer.id, UI.cart); }

/* ---------- small UI utilities ---------- */
const $ = id => document.getElementById(id);
let toastT;
function toast(msg){ const t = $('toast'); if (!t) return; t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 4200); }
const dv = (k, d) => (k in UI.drafts ? UI.drafts[k] : (d == null ? '' : d));
const val = k => String(dv(k, '')).trim();
const field = (label, key, value, attrs, hint) => '<label class="f">' + h(label) + (hint ? ' <span class="hint">' + h(hint) + '</span>' : '') +
  '<input id="f-' + key + '" data-draft="' + key + '" value="' + h(dv(key, value)) + '" ' + (attrs || '') + '></label>';
const selectF = (label, key, value, opts) => '<label class="f">' + h(label) + '<select id="f-' + key + '" data-draft="' + key + '">' +
  opts.map(o => '<option' + (dv(key, value) === o ? ' selected' : '') + '>' + h(o) + '</option>').join('') + '</select></label>';
const fileF = (label, key, hint) => '<label class="f">' + h(label) + (hint ? ' <span class="hint">' + h(hint) + '</span>' : '') +
  '<input type="file" id="file-' + key + '" data-file="' + key + '" accept=".pdf,.jpg,.jpeg,.png,.webp">' +
  (UI.files[key] ? '<span class="hint">Selected: ' + h(UI.files[key].name) + '</span>' : '') + '</label>';
const pill = meta => '<span class="pill ' + (meta.tone || '') + '">' + h(meta.l) + '</span>';
function clearDrafts(prefix){ Object.keys(UI.drafts).forEach(k => { if (k.indexOf(prefix) === 0) delete UI.drafts[k]; }); Object.keys(UI.files).forEach(k => { if (k.indexOf(prefix) === 0) delete UI.files[k]; }); }
function docView(d, label){
  if (!d) return '<div class="doc"><div class="muted">' + h(label) + ': not provided</div></div>';
  const url = '/api/files/' + encodeURIComponent(d.id), isImg = /^image\//.test(d.type || '');
  return '<div class="doc">' + (isImg ? '<img src="' + url + '" alt="" loading="lazy">' : '') + '<div><b>' + h(label) + '</b><br>' + h(d.name) + ' <span class="muted">(' + Math.max(1, Math.round((d.size || 0) / 1024)) + ' KB)</span> · <a href="' + url + '" target="_blank" rel="noopener">Open file</a></div></div>';
}
function go(route){ UI.route = route; UI.modal = null; if (location.hash !== '#' + route) history.replaceState(null, '', '#' + route); render(); window.scrollTo(0, 0); }
let renderQueued = false;
/* Used for background refreshes: never redraw while someone is typing. */
function requestRender(){
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'file' && a.type !== 'checkbox'){ renderQueued = true; return; }
  render();
}
