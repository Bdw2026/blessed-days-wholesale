/* Order and customer rules. Every status change goes through here, so the browser can never skip a step. */
const Core = require('../shared/core');
const store = require('./db');
const mail = require('./mailer');
const {r2, money, orderTotals, checkQty, fullName, priceFor} = Core;

const bad = (message, status) => Object.assign(new Error(message), {status: status || 400});
const text = (v, max) => String(v == null ? '' : v).trim().slice(0, max || 500);
const customerEmail = c => c.email;
const orderLink = id => ({label: 'Open order ' + id, url: mail.url('order-' + id)});
const staffOrderLink = id => ({label: 'Open order ' + id, url: mail.url('admin-order-' + id)});

function log(o, who, message, by) { o.log.push({at: store.now(), who, by: by || '', text: message}); }
function mustBe(o, ...statuses) { if (!statuses.includes(o.status)) throw bad('This order is now "' + Core.STATUS[o.status].l + '", so that step no longer applies. Refresh the page.', 409); }

/* ---- catalogue as one customer sees it: listed, priced, with their discount already applied ---- */
function catalogFor(customer) {
  return store.listProducts().filter(p => p.active && p.price > 0).map(p => ({sku: p.sku, cat: p.cat, name: p.name, size: p.size, price: priceFor(p, customer.discount), casePack: p.casePack, moq: p.moq, stock: p.stock, active: true, best: p.best}));
}

/* ---- customer actions ---- */
function placeOrder(customer, body) {
  const s = store.getSettings(), lines = [], seen = new Set();
  if (!Array.isArray(body.lines) || !body.lines.length) throw bad('Your order is empty.');
  if (body.lines.length > 500) throw bad('That order has too many lines.');
  body.lines.forEach(l => {
    const p = store.getProduct(l && l.sku);
    if (!p || seen.has(p.sku)) throw bad('A product in your order is no longer available. Review your order and try again.');
    seen.add(p.sku);
    const res = checkQty(p, l.qty);
    if (!res.qty || res.qty !== Math.floor(Number(l.qty))) throw bad(fullName(p) + ': ' + (res.issues[0] || 'quantity is not valid') + '. Review your order and try again.');
    lines.push({sku: p.sku, name: fullName(p), size: p.size, casePack: p.casePack, price: priceFor(p, customer.discount), qty: res.qty});
  });
  const ship = body.delivery === 'ship', shipTo = ship ? text(body.shipTo, 300) || customer.address : '';
  const o = {id: '', customerId: customer.id, company: customer.company, createdAt: store.now(), status: 'awaiting_deposit', delivery: ship ? 'ship' : 'pickup', shipTo,
    poRef: text(body.poRef, 60), notes: text(body.notes, 1000), vatPct: s.vatPct, depPct: s.depositPct, shippingFee: 0, deposit: null, balance: null, review: null, dispatch: null, lines, log: []};
  const t = orderTotals(Object.assign({depositDue: 0}, o));
  if (t.subtotal < s.minOrder) throw bad('The minimum order is ' + money(s.minOrder) + ' before VAT.');
  o.depositDue = r2(t.total * s.depositPct / 100);
  o.id = store.nextOrderId();
  log(o, 'customer', 'Order placed');
  store.saveOrder(o);
  mail.send(customerEmail(customer), 'Order ' + o.id + ' received: deposit of ' + money(o.depositDue) + ' due', [
    'Thank you for your order ' + o.id + ' for ' + money(t.total) + ' including VAT.',
    'To send it for review, transfer the ' + s.depositPct + '% deposit of ' + money(o.depositDue) + ' and upload the transfer receipt on the order page.',
    'Bank: ' + s.bankName + '\nAccount name: ' + s.bankAccount + '\nIBAN: ' + s.iban + '\nSWIFT: ' + s.swift + '\nReference: ' + o.id], orderLink(o.id));
  mail.sendStaff('New order ' + o.id + ' from ' + customer.company, [customer.company + ' placed order ' + o.id + ' for ' + money(t.total) + '. Waiting for the deposit.'], staffOrderLink(o.id));
  return o;
}
function submitPayment(customer, orderId, kind, ref, fileRec) {
  const o = ownOrder(customer, orderId);
  if (kind !== 'deposit' && kind !== 'balance') throw bad('Unknown payment type.');
  mustBe(o, kind === 'deposit' ? 'awaiting_deposit' : 'awaiting_balance');
  const t = orderTotals(o), amount = kind === 'deposit' ? t.depositDue : t.balanceDue;
  o[kind] = {amount, ref: text(ref, 80), file: fileRec, submittedAt: store.now(), confirmedAt: null};
  o.status = kind + '_submitted';
  log(o, 'customer', (kind === 'deposit' ? 'Deposit' : 'Balance') + ' proof uploaded, ' + money(amount) + ', ref ' + o[kind].ref);
  store.saveOrder(o);
  mail.sendStaff((kind === 'deposit' ? 'Deposit' : 'Balance') + ' proof for ' + o.id + ' (' + money(amount) + ')', [customer.company + ' uploaded a transfer receipt for ' + money(amount) + ', reference ' + o[kind].ref + '. Check the bank and confirm.'], staffOrderLink(o.id));
  return o;
}
function cancelByCustomer(customer, orderId) {
  const o = ownOrder(customer, orderId); mustBe(o, 'awaiting_deposit');
  o.status = 'cancelled'; log(o, 'customer', 'Order cancelled by customer');
  return store.saveOrder(o);
}
function ownOrder(customer, orderId) {
  const o = store.getOrder(String(orderId));
  if (!o || o.customerId !== customer.id) throw bad('That order was not found.', 404);
  return o;
}

/* ---- staff actions on an order ---- */
function staffAction(orderId, action, body, staff) {
  const o = store.getOrder(String(orderId)); if (!o) throw bad('That order was not found.', 404);
  const c = store.getCustomer(o.customerId) || {}, s = store.getSettings(), by = staff.name || staff.email, stamp = store.now();
  const tell = (subject, lines) => mail.send(c.email, subject, lines, orderLink(o.id));
  switch (action) {
    case 'dep-ok': {
      mustBe(o, 'awaiting_deposit', 'deposit_submitted');
      if (!o.deposit) o.deposit = {amount: o.depositDue, ref: 'Confirmed by staff', file: null, submittedAt: stamp};
      o.deposit.confirmedAt = stamp; o.deposit.confirmedBy = by; o.status = 'under_review';
      log(o, 'admin', 'Deposit confirmed. Order under review', by);
      tell('Order ' + o.id + ': deposit received', ['We have received your deposit of ' + money(o.deposit.amount) + '. Your order is now being reviewed and we will confirm stock and the balance shortly.']);
      break;
    }
    case 'dep-no': {
      mustBe(o, 'deposit_submitted'); o.deposit = null; o.status = 'awaiting_deposit';
      log(o, 'admin', 'Deposit not found in our bank. Please check the transfer and upload the receipt again', by);
      tell('Order ' + o.id + ': we could not find your deposit', ['We could not match your deposit transfer in our bank account. Please check the transfer details and upload the receipt again on the order page.']);
      break;
    }
    case 'approve': {
      mustBe(o, 'under_review');
      const qtys = Array.isArray(body.qtys) ? body.qtys : []; let changed = false;
      const lines = o.lines.map((l, i) => {
        const q = i in qtys ? Math.max(0, Math.floor(Number(qtys[i]) || 0)) : l.qty;
        if (q > 100000) throw bad('A quantity is too large.');
        if (q !== l.qty) changed = true;
        return Object.assign({}, l, {qty: q, origQty: l.origQty != null ? l.origQty : l.qty});
      }).filter(l => l.qty > 0);
      if (!lines.length) throw bad('Every line is zero. Reject the order instead.');
      const fee = Math.max(0, r2(body.shippingFee)); if (!(fee <= 100000)) throw bad('Enter a valid shipping charge.');
      o.lines = lines; o.shippingFee = fee; o.review = {note: text(body.note, 1000), at: stamp, by};
      const due = orderTotals(o).balanceDue;
      o.status = due > 0 ? 'awaiting_balance' : 'packing';
      log(o, 'admin', 'Order approved' + (changed ? ' with adjusted quantities' : '') + (fee ? ', shipping ' + money(fee) + ' added' : '') + (due > 0 ? '. Balance of ' + money(due) + ' requested' : '. No balance due, packing started'), by);
      tell('Order ' + o.id + ' approved' + (due > 0 ? ': balance of ' + money(due) + ' due' : ''), ['Your order has been approved' + (changed ? ' with some quantities adjusted for stock' : '') + '. The order total is now ' + money(orderTotals(o).total) + '.',
        o.review.note ? 'Note from our team: ' + o.review.note : '', 'Please transfer the balance of ' + money(due) + ' and upload the receipt on the order page. We start packing once it is received.',
        'Bank: ' + s.bankName + '\nAccount name: ' + s.bankAccount + '\nIBAN: ' + s.iban + '\nSWIFT: ' + s.swift + '\nReference: ' + o.id]);
      break;
    }
    case 'reject': {
      mustBe(o, 'under_review'); const note = text(body.note, 1000); if (!note) throw bad('Add a note to the customer explaining why.');
      o.review = {note, at: stamp, by}; o.status = 'rejected';
      log(o, 'admin', 'Order not approved: ' + note + '. Deposit to be refunded', by);
      tell('Order ' + o.id + ' could not be approved', ['We are sorry, we could not approve your order.', 'Reason: ' + note, 'Your deposit of ' + money(orderTotals(o).depositPaid) + ' will be refunded to the paying account.']);
      break;
    }
    case 'bal-ok': {
      mustBe(o, 'awaiting_balance', 'balance_submitted');
      if (!o.balance) o.balance = {amount: orderTotals(o).balanceDue, ref: 'Confirmed by staff', file: null, submittedAt: stamp};
      o.balance.confirmedAt = stamp; o.balance.confirmedBy = by; o.status = 'packing';
      log(o, 'admin', 'Balance confirmed. Packing started', by);
      tell('Order ' + o.id + ': paid in full, now packing', ['We have received your balance payment. Your order is being packed' + (s.leadDays ? ', usually within ' + s.leadDays + ' working days' : '') + '. We will tell you when it is ready.']);
      break;
    }
    case 'bal-no': {
      mustBe(o, 'balance_submitted'); o.balance = null; o.status = 'awaiting_balance';
      log(o, 'admin', 'Balance not found in our bank. Please check the transfer and upload the receipt again', by);
      tell('Order ' + o.id + ': we could not find your balance payment', ['We could not match your balance transfer in our bank account. Please check the transfer details and upload the receipt again on the order page.']);
      break;
    }
    case 'ready': {
      mustBe(o, 'packing'); o.dispatch = {courier: '', tracking: '', at: stamp}; o.status = 'ready_pickup';
      log(o, 'admin', 'Packed and ready for pickup' + (s.pickupAddress ? ' at ' + s.pickupAddress : ''), by);
      tell('Order ' + o.id + ' is ready for pickup', ['Your order is packed and ready to collect.', s.pickupAddress ? 'Pickup address: ' + s.pickupAddress : '', 'Please bring the order number and company ID.']);
      break;
    }
    case 'shipped': {
      mustBe(o, 'packing'); const courier = text(body.courier, 80), tracking = text(body.tracking, 80); if (!courier) throw bad('Enter the courier name first.');
      o.dispatch = {courier, tracking, at: stamp}; o.status = 'shipped';
      log(o, 'admin', 'Shipped with ' + courier + (tracking ? ', tracking ' + tracking : ''), by);
      tell('Order ' + o.id + ' has shipped', ['Your order has been shipped with ' + courier + (tracking ? ', tracking number ' + tracking : '') + '.', o.shipTo ? 'Delivery address: ' + o.shipTo : '']);
      break;
    }
    case 'complete': {
      mustBe(o, 'ready_pickup', 'shipped');
      log(o, 'admin', o.status === 'shipped' ? 'Delivered. Order completed' : 'Collected. Order completed', by); o.status = 'completed';
      break;
    }
    case 'cancel': {
      mustBe(o, 'awaiting_deposit'); o.status = 'cancelled'; log(o, 'admin', 'Order cancelled', by);
      tell('Order ' + o.id + ' was cancelled', ['Your order ' + o.id + ' has been cancelled. Contact us if this was not expected.']);
      break;
    }
    case 'refunded': {
      mustBe(o, 'rejected'); if (o.refundedAt) throw bad('The refund is already recorded.', 409);
      o.refundedAt = stamp; log(o, 'admin', 'Deposit of ' + money(orderTotals(o).depositPaid) + ' refunded', by);
      tell('Order ' + o.id + ': deposit refunded', ['We have refunded your deposit of ' + money(orderTotals(o).depositPaid) + ' to the paying account. Bank transfers can take a few working days to arrive.']);
      break;
    }
    case 'note': {
      const note = text(body.text, 1000); if (!note) throw bad('Write the note first.');
      log(o, 'admin', note, by);
      tell('Order ' + o.id + ': a note from our team', [note]);
      break;
    }
    default: throw bad('Unknown action.');
  }
  return store.saveOrder(o);
}

/* ---- staff decisions on a trade account ---- */
function customerDecision(customerId, action, body, staff) {
  const c = store.getCustomer(String(customerId)); if (!c) throw bad('That customer was not found.', 404);
  const note = text(body.note, 1000), link = {label: 'Open your account', url: mail.url('home')};
  c.reviewedAt = store.now(); c.reviewedBy = staff.name || staff.email;
  if (action === 'approve') {
    c.status = 'approved'; c.reviewNote = note;
    mail.send(c.email, 'Your trade account is approved', ['Good news: ' + c.company + ' is approved for wholesale ordering.', note, 'Sign in to see wholesale prices and place your first order.'], link);
  } else if (action === 'info') {
    if (!note) throw bad('Write what you need from the applicant.');
    c.status = 'info'; c.reviewNote = note;
    mail.send(c.email, 'We need a little more to verify your trade account', ['Thank you for applying. Before we can approve ' + c.company + ' we need the following:', note, 'Sign in to update your application.'], link);
  } else if (action === 'reject') {
    if (!note) throw bad('Write the reason for declining.');
    c.status = 'rejected'; c.reviewNote = note;
    mail.send(c.email, 'Your trade account application', ['We are sorry, we could not approve the application for ' + c.company + '.', 'Reason: ' + note]);
  } else if (action === 'suspend') {
    c.status = 'suspended'; c.reviewNote = note || 'Account suspended.';
  } else if (action === 'reactivate') {
    c.status = 'approved'; c.reviewNote = note;
  } else if (action === 'discount') {
    const v = Number(body.discount); if (!(v >= 0 && v <= 50)) throw bad('Discount must be between 0 and 50%.');
    c.discount = r2(v);
  } else throw bad('Unknown action.');
  return store.saveCustomer(c);
}

module.exports = {bad, text, catalogFor, placeOrder, submitPayment, cancelByCustomer, ownOrder, staffAction, customerDecision};
