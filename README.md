# Blessed Days Cosmetics wholesale portal

A trade ordering website. Businesses register with their trade licence, staff verify them, approved customers order from the catalogue, pay a deposit and then the balance by bank transfer, and staff pack and release the order.

This guide has three parts: going live, running the site day to day, and notes for a developer.

---

## 1. Going live

### What you need

- **A server or hosting plan that runs Node.js 22 (20.12 is the minimum) and keeps files on disk.** A small cloud server (1 GB memory is enough) or a managed host such as Render or Railway works. On a managed host, choose a plan with a **persistent disk or volume**. Plans that wipe the disk on every restart will lose your customers and orders.
- **A domain name** under your own business name, with HTTPS. Managed hosts provide HTTPS automatically. On your own server, put the site behind a reverse proxy such as Caddy or nginx.
- **An email account that can send by SMTP**, for example your business mailbox or a service such as Brevo, Mailgun or Amazon SES. Without it the site works but sends no emails.

### Settings

Copy `.env.example` to `.env` and fill it in. On a managed host, enter the same names in its environment variables screen instead.

| Setting | What it is |
| --- | --- |
| `APP_URL` | Public address of the site, starting with `https://`. Used in email links. |
| `PORT` | Port the app listens on. Managed hosts usually set this for you. |
| `NODE_ENV` | Set to `production`. |
| `DATA_DIR` | Folder for the database, uploaded documents and product photos. On a managed host, point this at the persistent disk (for example `/data`). |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Your first staff sign-in. Read once on the first start. Password needs 8 or more characters. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | Your email provider's SMTP details. Use `SMTP_SECURE=true` with port 465. |
| `MAIL_FROM` | The sender customers see, for example `"Blessed Days Cosmetics <orders@yourcompany.ae>"`. |
| `STAFF_NOTIFY_EMAIL` | Where staff alerts go. Optional. Defaults to the orders email in Setup. |

### Option A: managed host (Render, Railway and similar)

1. Create a new web service from this folder (upload it or connect a Git repository).
2. Build command `npm ci --omit=dev`, start command `npm start`. If the host offers Docker, it can use the included `Dockerfile` instead.
3. Add a persistent disk mounted at `/data` and set `DATA_DIR=/data`.
4. Enter the settings from the table above.
5. Attach your domain. Set `APP_URL` to it.
6. Run **one instance only**. The database is a single file and must not be shared between copies of the app.

### Railway, step by step

1. Put this folder in a private GitHub repository.
2. In Railway: New Project › Deploy from GitHub repo, and pick the repository. Railway builds it with the included `Dockerfile`.
3. Right-click the project canvas › Volume, attach it to the service, mount path `/data`. Do this before taking real orders: without a volume everything is lost at the next restart, and the staff Today page shows a warning.
4. In the service's Variables tab add `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `PORT` = `3000`. Add the SMTP settings when you have them.
5. Settings › Networking › Generate Domain gives a test address (choose port 3000 if asked). The site uses it automatically for email links.
6. When your own domain is ready: Settings › Networking › Custom Domain, add the CNAME and TXT records Railway shows at your domain provider, then set the `APP_URL` variable to `https://` plus that domain.

`DATA_DIR` does not need setting on Railway, and `APP_URL` only once you attach your own domain.

### Option B: your own server with Docker

```
cp .env.example .env      # then edit .env
docker compose up -d --build
```

The site listens on port 3000. Point your reverse proxy at it. Data lives in the `wholesale-data` Docker volume.

### Option C: your own server without Docker

```
npm ci --omit=dev
cp .env.example .env      # then edit .env
npm start
```

Keep it running with a process manager such as systemd or PM2.

### First sign-in checklist

Sign in at your site address with `ADMIN_EMAIL` and `ADMIN_PASSWORD`. The Today page lists anything still missing.

1. **Setup › Business:** orders email, phone, VAT TRN, warehouse pickup address.
2. **Setup › Bank details:** customers cannot be shown where to pay until these are filled.
3. **Setup › Order terms:** deposit %, VAT %, minimum order, packing lead time.
4. **Products › Export price list**, fill the "Wholesale price (AED)" column, then **Import price list**. Products with no price stay hidden from customers.
5. **Products:** check case packs and minimums (they start as placeholders: 12 for small items, 6 for larger ones, 1 for bulk), set stock status, and untick "Listed" for anything you do not sell.
6. **Product photos:** click "Add" beside a product, or copy image files named by SKU (for example `CL-BE-001-4.jpg`) into `DATA_DIR/product-images`. One photo is reused for every size of the same product. Use the images your supplier provides for distributor use.
7. **Setup › Staff accounts:** add your colleagues. Change your own password under Setup.
8. Place a test order from a test customer account, and check the emails arrive.

---

## 2. Running the site

### How an order moves

| Step | Who | What happens |
| --- | --- | --- |
| Register | Customer | Company details, trade licence upload (VAT certificate and signatory ID optional). |
| Verify | Staff | Approve, decline, or request more information. Set an account discount if wanted. |
| Order | Customer | From the catalogue, or by downloading the Excel order sheet and uploading it filled in. |
| Deposit | Customer | Transfers the deposit and uploads the receipt. |
| Confirm deposit | Staff | Check the bank, then confirm. The order moves to review. |
| Review | Staff | Adjust quantities for stock, add shipping, approve or reject. |
| Balance | Customer | Transfers the balance (order total minus deposit received) and uploads the receipt. |
| Confirm balance | Staff | Check the bank, then confirm. Packing starts. Print the packing list. |
| Release | Staff | Mark ready for pickup, or shipped with courier and tracking. Then mark collected or delivered. |

The customer gets an email at every step. Staff get an email for each new application, new order and payment receipt. Every email is listed under Setup › Email log, including ones that failed.

If you reject an order after the deposit was paid, refund the deposit through your bank and click "Mark deposit refunded" on the order.

### Backups

Everything is in the `DATA_DIR` folder: `wholesale.db` (plus `wholesale.db-wal` and `-shm` beside it), `uploads/` and `product-images/`. Copy the whole folder somewhere safe every day. With Docker:

```
docker compose cp wholesale:/data ./backup-$(date +%F)
```

To restore, stop the app, put the folder back, and start it again.

### Forgotten staff password

On the server: `npm run create-admin -- you@yourcompany.ae "Your Name"`. It prints a temporary password. With Docker, put `docker compose exec wholesale` in front.

### What this version does not do

- **Online card payments.** Payment is by bank transfer with a receipt upload, confirmed by staff.
- **Tax invoices.** The site produces proforma invoices. Issue tax invoices from your accounting system.
- **Stock counts.** Stock is a status per product (in stock, low, out), not a quantity.
- **Arabic.** The site is English only.
- **Product photos and descriptions** are not included. Add photos as described above.

---

## 3. For developers

Plain Node.js, no build step.

```
npm install
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=change-me-123 npm run dev   # http://localhost:3000
npm run seed:demo    # test data only: sample prices and a demo customer (demo.buyer@example.com / demo-buyer-123)
npm test             # end-to-end run of the order flow and access rules
```

| Path | Purpose |
| --- | --- |
| `server/index.js` | Express app, security headers, static files, error handling. |
| `server/db.js` | SQLite schema and data access. Customers and orders are JSON documents with indexed columns. |
| `server/auth.js` | Passwords (scrypt), sessions (httpOnly cookie, hashed in the database), same-origin check, one-time tokens. |
| `server/orders.js` | Every order and account status change, with the email each one sends. |
| `server/routes-customer.js`, `server/routes-admin.js` | The HTTP API. |
| `server/files.js` | Upload validation and storage. Documents are served only to staff and the owning customer. |
| `server/sheets.js`, `server/pdf.js` | Excel order sheet and price list, PDF proforma and packing list. |
| `server/seed-catalog.js` | The product list loaded into an empty database on first start. |
| `shared/core.js` | Totals and quantity rules used by both server and browser. The server is the authority. |
| `public/` | The browser app: vanilla JavaScript, hash routing, no framework. |

Things to know before changing it:

- Prices, quantities, totals and status changes are always computed and checked on the server. The browser only previews them.
- A customer's catalogue contains only listed products with a price, at that customer's discounted price.
- SQLite runs in a single process. To run several instances, move `server/db.js` to PostgreSQL first.
- The staff screens load all customers and orders at once. That is fine for hundreds of orders; add paging before it reaches many thousands.
- The database driver (`better-sqlite3`) downloads a ready-made binary during `npm ci`. On an unusual platform with no ready-made binary it compiles instead, which needs Python and a C++ compiler. Keep it on version 12.
- The Docker files were written but not built in the environment where this was produced. A clean `npm ci` install, the automated test and a browser run of the whole order flow were.
