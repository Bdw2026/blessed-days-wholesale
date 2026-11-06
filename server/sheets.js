/* Excel and CSV: the order sheet customers download and upload, and the staff price list. */
const ExcelJS = require('exceljs');
const path = require('path');
const Core = require('../shared/core');
const {norm, fullName, checkQty, r2} = Core;

async function workbook(sheetName, header, rows, widths, opts) {
  const wb = new ExcelJS.Workbook(), ws = wb.addWorksheet(sheetName);
  ws.addRow(header); rows.forEach(r => ws.addRow(r));
  ws.getRow(1).font = {bold: true}; ws.views = [{state: 'frozen', ySplit: 1}];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  if (opts && opts.highlight) ws.getColumn(opts.highlight).eachCell((c, n) => { c.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: n === 1 ? 'FFF0B354' : 'FFFBEED6'}}; });
  return Buffer.from(await wb.xlsx.writeBuffer());
}
function orderSheet(catalog) {
  const rows = catalog.filter(p => p.stock !== 'out').map(p => [p.sku, p.name, Core.CATS[p.cat] || '', p.size || '', p.casePack, p.moq, p.price, null]);
  return workbook('Order sheet', ['SKU', 'Product', 'Category', 'Size', 'Case pack', 'MOQ (units)', 'Unit price (AED)', 'Order qty (units)'], rows, [22, 52, 22, 20, 10, 12, 16, 18], {highlight: 8});
}
function priceList(products) {
  const rows = products.map(p => [p.sku, p.name, Core.CATS[p.cat] || '', p.size || '', p.casePack, p.moq, p.price || null, p.stock, p.active ? 'yes' : 'no', p.rrpUsd || null]);
  return workbook('Price list', ['SKU', 'Product', 'Category', 'Size', 'Case pack', 'MOQ (units)', 'Wholesale price (AED)', 'Stock', 'Listed', 'US retail (USD)'], rows, [22, 52, 22, 20, 10, 12, 20, 8, 8, 14], {highlight: 7});
}

const cellValue = v => {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v instanceof Date) return v.toISOString();
    if (v.result != null) return v.result;
    if (Array.isArray(v.richText)) return v.richText.map(t => t.text).join('');
    if (v.text != null) return v.text;
    return '';
  }
  return v;
};
function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  const sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += ch; }
    else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim()));
}
/* Reads the first sheet of an uploaded .xlsx, or a .csv, into rows of plain values. */
async function readRows(file) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ext === '.csv') return parseCsv(file.buffer.toString('utf8').replace(/^﻿/, ''));
  if (ext !== '.xlsx') throw Object.assign(new Error('Save the file as .xlsx or .csv and upload it again.'), {status: 400});
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.load(file.buffer); } catch (e) { throw Object.assign(new Error('That file could not be read. Save it as .xlsx or .csv and try again.'), {status: 400}); }
  const ws = wb.worksheets[0], rows = []; if (!ws) return rows;
  ws.eachRow({includeEmpty: false}, r => { const out = []; for (let i = 1; i <= Math.min(r.cellCount, 40); i++) out.push(cellValue(r.getCell(i).value)); if (rows.length < 5000) rows.push(out); });
  return rows;
}
/* Finds the header row and maps the columns we need. A column is used for one purpose only. */
function mapColumns(rows, wanted) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const cells = rows[i].map(c => norm(c)), map = {}, used = [];
    Object.keys(wanted).forEach(k => { const ix = cells.findIndex((c, j) => c && !used.includes(j) && wanted[k].some(w => c === w || c.indexOf(w) === 0)); if (ix >= 0) { map[k] = ix; used.push(ix); } });
    if (Object.keys(map).length >= 2) return {head: i, map};
  }
  return null;
}
const num = v => Number(String(v == null ? '' : v).replace(/[^0-9.]/g, ''));

/* catalog: products as this customer sees them. Returns one row per filled line, with the quantity that would be added. */
function parseOrderSheet(rows, catalog) {
  const cm = mapColumns(rows, {sku: ['sku'], qty: ['orderqty', 'qty', 'quantity', 'order']});
  if (!cm || cm.map.sku == null || cm.map.qty == null) throw Object.assign(new Error('That file needs a SKU column and an order quantity column.'), {status: 400});
  const bySku = {}; catalog.forEach(p => { bySku[p.sku.toUpperCase()] = p; });
  const out = [];
  rows.slice(cm.head + 1).forEach(r => {
    const typed = String(r[cm.map.sku] == null ? '' : r[cm.map.sku]).trim(), asked = num(r[cm.map.qty]);
    if (!typed || !asked) return;
    const p = bySku[typed.toUpperCase()], res = checkQty(p, asked);
    out.push({sku: p ? p.sku : typed.slice(0, 60), name: p ? fullName(p) : 'Unknown SKU', asked, qty: res.qty, issues: res.issues});
  });
  return out.slice(0, 1000);
}
function parsePriceList(rows, products) {
  const cm = mapColumns(rows, {sku: ['sku', 'itemcode', 'code'], name: ['product', 'name', 'description', 'item'], price: ['wholesale', 'price', 'unitprice', 'aed'], casePack: ['case'], moq: ['moq', 'min'], size: ['size']});
  if (!cm || cm.map.price == null || (cm.map.sku == null && cm.map.name == null)) throw Object.assign(new Error('That file needs a price column and a SKU or product name column.'), {status: 400});
  const bySku = {}, byName = {}, seen = {};
  products.forEach(p => { bySku[p.sku.toUpperCase()] = p; seen[norm(p.name)] = (seen[norm(p.name)] || 0) + 1; });
  products.forEach(p => { byName[norm(p.name + p.size)] = p; if (seen[norm(p.name)] === 1) byName[norm(p.name)] = p; });
  const matched = [], unmatched = [], get = (r, k) => cm.map[k] != null ? String(r[cm.map[k]] == null ? '' : r[cm.map[k]]).trim() : '';
  rows.slice(cm.head + 1).forEach(r => {
    const sku = get(r, 'sku'), name = get(r, 'name'), size = get(r, 'size'), price = num(r[cm.map.price]);
    if (!sku && !name) return;
    const p = bySku[sku.toUpperCase()] || (size && byName[norm(name + size)]) || byName[norm(name)];
    if (!p) { unmatched.push((name || sku).slice(0, 80)); return; }
    if (!(price > 0)) return; // blank price: leave this product as it is
    const m = {sku: p.sku, name: fullName(p), old: p.price, price: r2(price)};
    if (cm.map.casePack != null && num(r[cm.map.casePack]) >= 1) m.casePack = Math.round(num(r[cm.map.casePack]));
    if (cm.map.moq != null && num(r[cm.map.moq]) >= 1) m.moq = Math.round(num(r[cm.map.moq]));
    matched.push(m);
  });
  return {matched, unmatched};
}

module.exports = {orderSheet, priceList, readRows, parseOrderSheet, parsePriceList};
