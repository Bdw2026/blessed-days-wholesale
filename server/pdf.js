/* PDF documents: proforma invoice for the customer, packing list for the warehouse. */
const PDFDocument = require('pdfkit');
const Core = require('../shared/core');
const {orderTotals, r2} = Core;
const fmt = n => r2(n).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const date = t => new Date(t).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});
const INK = '#13231f', MUTED = '#56675f', BRAND = '#0f4a41', LINE = '#d3dcd4';

function start(res, filename) {
  const doc = new PDFDocument({size: 'A4', margin: 40, info: {Title: filename}});
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="' + filename + '"');
  doc.pipe(res);
  return doc;
}
function table(doc, cols, rows) {
  const left = 40, width = 515, rowH = h => Math.max(18, h + 8);
  const draw = (cells, bold) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 8 : 9);
    const heights = cells.map((c, i) => doc.heightOfString(String(c), {width: cols[i].w - 8}));
    const h = rowH(Math.max(...heights));
    if (doc.y + h > 780) { doc.addPage(); }
    const y = doc.y; let x = left;
    if (bold) doc.rect(left, y, width, h).fill('#e7ede7');
    doc.fillColor(bold ? MUTED : INK);
    cells.forEach((c, i) => { doc.text(String(c), x + 4, y + 5, {width: cols[i].w - 8, align: cols[i].right ? 'right' : 'left'}); x += cols[i].w; });
    doc.moveTo(left, y + h).lineTo(left + width, y + h).strokeColor(LINE).lineWidth(0.5).stroke();
    doc.y = y + h; doc.x = left;
  };
  draw(cols.map(c => c.t), true);
  rows.forEach(r => draw(r, false));
}
function head(doc, s, title, o, customer) {
  doc.font('Helvetica-Bold').fontSize(16).fillColor(BRAND).text(s.company, 40, 40);
  doc.font('Helvetica').fontSize(9).fillColor(MUTED).text([s.pickupAddress, s.phone, s.email, s.trn ? 'TRN ' + s.trn : ''].filter(Boolean).join('  ·  '), {width: 330});
  doc.font('Helvetica-Bold').fontSize(14).fillColor(INK).text(title, 380, 40, {width: 175, align: 'right'});
  doc.font('Helvetica').fontSize(10).text(o.id, 380, 60, {width: 175, align: 'right'}).fillColor(MUTED).fontSize(9).text(date(o.createdAt), 380, 75, {width: 175, align: 'right'});
  doc.moveTo(40, 100).lineTo(555, 100).strokeColor(LINE).lineWidth(1).stroke();
  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('CUSTOMER', 40, 112);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(o.company, 40, 124);
  doc.font('Helvetica').fontSize(9).fillColor(MUTED).text([customer.address, customer.emirate].filter(Boolean).join(', '), {width: 300}).text([customer.trn ? 'TRN ' + customer.trn : '', customer.contact, customer.phone].filter(Boolean).join('  ·  '), {width: 300});
  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('DELIVERY', 380, 112, {width: 175, align: 'right'});
  doc.font('Helvetica').fontSize(9).fillColor(INK).text(o.delivery === 'ship' ? 'Ship to: ' + o.shipTo : 'Pickup from warehouse', 380, 124, {width: 175, align: 'right'});
  if (o.poRef) doc.fillColor(MUTED).text('PO ref: ' + o.poRef, 380, doc.y, {width: 175, align: 'right'});
  doc.x = 40; doc.y = 185;
}
function proforma(res, o, customer, s) {
  const doc = start(res, 'Proforma-' + o.id + '.pdf'), t = orderTotals(o);
  head(doc, s, 'PROFORMA INVOICE', o, customer);
  table(doc, [{t: 'SKU', w: 105}, {t: 'PRODUCT', w: 230}, {t: 'UNIT PRICE', w: 65, right: true}, {t: 'QTY', w: 45, right: true}, {t: 'LINE TOTAL (AED)', w: 70, right: true}],
    o.lines.map(l => [l.sku, l.name, fmt(l.price), l.qty, fmt(l.qty * l.price)]));
  doc.moveDown(0.8);
  const row = (label, value, bold) => { if (doc.y > 760) doc.addPage(); const y = doc.y; doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9.5).fillColor(INK).text(label, 330, y, {width: 130}).text(value, 460, y, {width: 91, align: 'right'}); doc.y = y + (bold ? 18 : 15); };
  row('Subtotal (' + t.units + ' units)', fmt(t.subtotal));
  if (t.shipping) row('Shipping', fmt(t.shipping));
  row('VAT ' + o.vatPct + '%', fmt(t.vat));
  row('Total AED', fmt(t.total), true);
  row('Deposit ' + o.depPct + '%' + (t.depositPaid ? ' (received)' : ' (due now)'), fmt(t.depositPaid || t.depositDue));
  row('Balance' + (t.balancePaid ? ' (received)' : ''), fmt(t.depositPaid ? t.balanceDue : r2(t.total - t.depositDue)));
  doc.moveDown(1); if (doc.y > 690) doc.addPage();
  doc.x = 40; doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('PAY BY BANK TRANSFER', 40);
  doc.font('Helvetica').fontSize(9.5).fillColor(INK).text('Bank: ' + s.bankName).text('Account name: ' + s.bankAccount).text('IBAN: ' + s.iban).text('SWIFT: ' + s.swift).text('Payment reference: ' + o.id);
  doc.moveDown(0.8).fontSize(8).fillColor(MUTED).text('This is a proforma invoice, not a tax invoice. Goods are packed after full payment is received.', {width: 515});
  doc.end();
}
function packingList(res, o, customer, s) {
  const doc = start(res, 'Packing-' + o.id + '.pdf');
  head(doc, s, 'PACKING LIST', o, customer);
  table(doc, [{t: 'SKU', w: 115}, {t: 'PRODUCT', w: 240}, {t: 'UNITS', w: 50, right: true}, {t: 'CASE PACK', w: 55, right: true}, {t: 'CASES', w: 55, right: true}],
    o.lines.map(l => [l.sku, l.name, l.qty, l.casePack, r2(l.qty / l.casePack)]));
  doc.moveDown(1).font('Helvetica-Bold').fontSize(10).fillColor(INK).text('Total units: ' + o.lines.reduce((a, l) => a + l.qty, 0), 40);
  if (o.notes) doc.moveDown(0.5).font('Helvetica').fontSize(9).fillColor(MUTED).text('Customer notes: ' + o.notes, {width: 515});
  doc.moveDown(2).font('Helvetica').fontSize(9).fillColor(INK).text('Packed by: ______________________      Checked by: ______________________      Date: ______________');
  doc.end();
}
module.exports = {proforma, packingList};
