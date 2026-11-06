/* For testing only: gives every unpriced product a sample price (US retail x 3.6725 x 0.55) and adds one approved demo customer.
   Run on a test copy, never on the live database:  npm run seed:demo  */
const store = require('../db');
const auth = require('../auth');
const {r2} = require('../../shared/core');
let n = 0;
store.db.transaction(() => store.listProducts().forEach(p => { if (!(p.price > 0) && p.rrpUsd > 0) { p.price = r2(p.rrpUsd * 3.6725 * 0.55); store.saveProduct(p); n++; } }))();
console.log(n + ' products given sample prices.');
const email = 'demo.buyer@example.com';
if (!auth.findUser(email)) {
  const id = 'C-DEMO0001';
  store.saveCustomer({id, status: 'approved', email, company: 'Demo Pharmacy LLC', licenseNo: 'DEMO-001', licenseExpiry: new Date(Date.now() + 200 * 864e5).toISOString().slice(0, 10), trn: '', bizType: 'Pharmacy', emirate: 'Dubai',
    address: 'Demo street, Dubai', contact: 'Demo Buyer', phone: '+971 50 000 0000', docs: {}, discount: 0, createdAt: store.now(), reviewedAt: store.now(), reviewNote: ''});
  auth.createUser({email, password: 'demo-buyer-123', role: 'customer', name: 'Demo Buyer', customerId: id, verified: true});
  console.log('Demo customer: ' + email + ' / demo-buyer-123');
}
