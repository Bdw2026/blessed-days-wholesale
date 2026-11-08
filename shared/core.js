/* Order rules shared by the server and the browser. The server is the authority: the browser uses these only to preview. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.Core = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const CATS = {SH:'Skin & Hair Oils', EO:'Essential Oils', EB:'Essential Oil Blends', ES:'Essential Oil Sets', DF:'Diffusers', SK:'Skincare & Body', MR:'Mosquito Repellents', SU:'Supplements', LB:'Lip Balms', CT:'Cotton', AC:'Accessories & Other'};
  const STATUS = {
    awaiting_deposit:{l:'Awaiting deposit', tone:'warn', step:1, who:'customer'},
    deposit_submitted:{l:'Deposit being verified', tone:'info', step:1, who:'admin'},
    under_review:{l:'Under review', tone:'info', step:2, who:'admin'},
    awaiting_balance:{l:'Approved, awaiting balance', tone:'warn', step:3, who:'customer'},
    balance_submitted:{l:'Balance being verified', tone:'info', step:3, who:'admin'},
    packing:{l:'Packing', tone:'info', step:4, who:'admin'},
    ready_pickup:{l:'Ready for pickup', tone:'ok', step:5, who:'admin'},
    shipped:{l:'Shipped', tone:'ok', step:5, who:'admin'},
    completed:{l:'Completed', tone:'ok', step:6},
    rejected:{l:'Not approved', tone:'bad', step:-1},
    cancelled:{l:'Cancelled', tone:'', step:-1}
  };
  const CUST_STATUS = {pending:{l:'Pending review', tone:'warn'}, info:{l:'More info requested', tone:'info'}, approved:{l:'Approved', tone:'ok'}, rejected:{l:'Declined', tone:'bad'}, suspended:{l:'Suspended', tone:'bad'}};
  const BIZ_TYPES = ['Pharmacy', 'Beauty salon or spa', 'Retail store', 'Supermarket or grocery', 'Online store', 'Distributor or reseller', 'Hotel or hospitality', 'Other'];
  const SALES_CHANNELS = ['Physical stores', 'Own online store', 'E-commerce platforms', 'Others'];
  const EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain', 'Outside UAE (GCC)', 'Outside UAE (other)'];
  const DEFAULT_SETTINGS = {
    company:'Blessed Days Cosmetics', tagline:'UAE wholesale supply of Cliganic products', vatPct:5, depositPct:20, minOrder:1500, leadDays:3,
    bankName:'', bankAccount:'', iban:'', swift:'', pickupAddress:'', email:'', phone:'', trn:''
  };
  const r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const money = n => 'AED ' + r2(n).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const fullName = p => p.name + (p.size ? ', ' + p.size : '');
  const priceFor = (p, discountPct) => r2(p.price * (1 - (Number(discountPct) || 0) / 100));
  function orderTotals(o) {
    const subtotal = r2(o.lines.reduce((a, l) => a + l.qty * l.price, 0));
    const shipping = r2(o.shippingFee || 0);
    const vat = r2((subtotal + shipping) * (o.vatPct || 0) / 100);
    const total = r2(subtotal + shipping + vat);
    const depositPaid = o.deposit && o.deposit.confirmedAt ? r2(o.deposit.amount) : 0;
    const balancePaid = o.balance && o.balance.confirmedAt ? r2(o.balance.amount) : 0;
    return {subtotal, shipping, vat, total, depositDue:r2(o.depositDue), depositPaid, balanceDue:r2(Math.max(0, total - depositPaid)), balancePaid, units:o.lines.reduce((a, l) => a + l.qty, 0)};
  }
  /* Checks one requested quantity against a product's rules. Returns the quantity rounded up to the minimum and to full cases. */
  function checkQty(p, qty) {
    const issues = []; let q = Math.floor(Number(qty) || 0);
    if (!p || !p.active || !(p.price > 0)) return {qty:0, issues:['Not in the catalogue']};
    if (p.stock === 'out') return {qty:0, issues:['Out of stock']};
    if (q <= 0) return {qty:0, issues:[]};
    if (q > 100000) return {qty:0, issues:['Quantity is too large']};
    if (q < p.moq) { issues.push('Raised to minimum of ' + p.moq); q = p.moq; }
    if (q % p.casePack) { const up = Math.ceil(q / p.casePack) * p.casePack; issues.push('Rounded up to full cases (' + up + ')'); q = up; }
    return {qty:q, issues};
  }
  return {CATS, STATUS, CUST_STATUS, BIZ_TYPES, SALES_CHANNELS, EMIRATES, DEFAULT_SETTINGS, r2, money, norm, fullName, priceFor, orderTotals, checkQty};
});
