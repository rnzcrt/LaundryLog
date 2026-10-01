# LaundryLog

**Project repository URL:** https://github.com/rnzcrt/LaundryLog  
**Previously used site URL:** https://laundrylog.onrender.com (availability not verified)

![LaundryLog order list screenshot](https://raw.githubusercontent.com/rnzcrt/LaundryLog/main/docs/screenshots/order-list.png)

## 1. Overview

LaundryLog is a small laundry shop management system. Staff log drop-offs, track
orders through a seven-step Kanban workflow, assign physical machine loads, manage
customers and stock, record split payments, and review sales and collections.

It is built for the one or two people working the counter, not for customers.

**Stack:** Node.js 18+, Express 4, PostgreSQL 14+, and vanilla HTML/CSS/JavaScript.
There is no front-end build step or framework. The Express service serves `public/`
and the JSON API from the same origin.

### Current features

- Seven-stage order workflow, searchable/filterable orders, Kanban board and status history.
- Optional due dates and a dedicated completion timestamp for newly completed orders.
- Customer directory and search, editable customer details, per-customer order history
  and spending/paid/outstanding totals; repeat phone numbers reuse a customer.
- Standalone customer creation from the Customers tab.
- Separate Orders, Kanban, Inventory, Customers, Reports and Management tabs. Tab changes keep
  each panel mounted so local search and form state are retained.
- Service pricing by wash/dry/fold service and regular (8 kg) or Titan (10 kg) machines.
- Configurable active service add-ons; each order stores the name and price snapshot used at checkout.
- Machine name/type/capacity/availability management, capacity-based load planning,
  and machine-load APIs. Load assignment is still API-only.
- Add-on administration for names, prices and activation. Orders retain price snapshots.
- Product stock levels, configurable low-stock thresholds, adjustments and movement history.
- Partial and final payments by cash, GCash or card, with outstanding balances.
- Dashboard totals and Sales & Collections reporting using Asia/Manila date boundaries.
- Shared HTTP Basic Auth around static files and all API routes.

## 2. Setup and installation

### What to install first

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | 18 or newer (built on 22) | Runs the server |
| PostgreSQL | 14 or newer | Stores customers, orders, status history and payments |

### Get the code

```bash
git clone https://github.com/rnzcrt/LaundryLog.git
cd LaundryLog
```

### Install dependencies

```bash
npm install
```

This installs `express`, `pg` and `dotenv`. There is no build step.

### Environment and configuration

Copy the example file and edit it:

```bash
cp .env.example .env
```

| Variable | What it is | Example value |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection string (required, the server will not start without it) | `postgres://postgres:your_password_here@localhost:5432/laundrylog` |
| `PORT` | Port the server listens on (optional, defaults to 3000) | `3000` |
| `APP_AUTH_USER` | Basic Auth username (required) | Set your own value |
| `APP_AUTH_PASSWORD` | Basic Auth password (required) | Set your own value |

`.env` is listed in `.gitignore`. Real credentials are never committed; the example
file only contains placeholders. Keep `APP_AUTH_PASSWORD` private and use HTTPS in
deployment; Basic Auth credentials are encoded, not encrypted, without TLS.

### Create and seed the database

Create the database once:

```bash
createdb laundrylog
```

Then apply the versioned migrations and add sample rows:

```bash
npm run migrate      # applies db/migrations in numerical order
npm run seed         # adds sample data; safe to rerun
# or run both:
npm run setup
```

The runner records each migration name, version, checksum and application time in
`laundrylog_migration_history`. Each migration and its history entry commit in one
transaction. Re-running it skips completed migrations and rejects changed migration
files. A populated database without migration history is left untouched by default.
For an existing database, first take a backup. The runner refuses to guess the
schema by default. `--baseline` verifies a supported existing LaundryLog schema and
key workflow/payment constraints, records the detected migration level, then applies
only later migrations:

```bash
npm run migrate -- --baseline
```

For the known legacy state through 007 it applies 008–010; for states through 008
or 009 it applies only the remaining migrations. A current schema is simply recorded.
It does not replay old migrations or intentionally alter application rows. Existing
completed orders keep a null `completed_at` because their historical completion time
cannot be reconstructed safely. Baseline verification is not a replacement for a
backup or manual review. Never baseline production without explicit approval. Do not
run `db/schema.sql`: it is a retired guard file and deliberately exits.

`db/seed.sql` adds sample customers, orders, partial payments, machine loads, products,
stock movements, and the optional Folding/laundry-product add-on catalog. Sample markers
prevent duplicate rows; add-ons are upserted by their unique names and can be managed
from the Management tab afterward.

### Check the project before you run it

```bash
npm run check
npm test
```

This preflight script confirms required files exist and every JavaScript file passes
a syntax check. `npm test` runs unit tests and HTTP/API checks. Database integration
tests are skipped unless `TEST_DATABASE_URL` is set. They create and update fixture
records, so point them only at a disposable database initialized with `npm run setup`;
they never fall back to `DATABASE_URL` from `.env`:

```bash
DATABASE_URL="postgres://postgres:password@localhost:5432/laundrylog_test" npm run setup
TEST_DATABASE_URL="postgres://postgres:password@localhost:5432/laundrylog_test" npm test
```

A healthy preflight prints a count of required files and JavaScript syntax checks.

```
Preflight passed: required files present; JavaScript files passed syntax checks.
```

## 3. How to run it

```bash
npm start
```

The terminal prints `LaundryLog is running at http://localhost:3000`. Open that
address and you should see the LaundryLog header, the status filter tabs, and the
seeded orders as cards. (`npm run dev` does the same but restarts on file changes.)

For a liveness check, open <http://localhost:3000/healthz>; it returns `ok` without
checking the database. To check database connectivity, request
<http://localhost:3000/api/health> with the configured Basic Auth credentials. A
healthy database check returns:

```json
{ "status": "ok", "database": "connected" }
```

If it returns `"database": "unreachable"`, Postgres is not running or `DATABASE_URL`
is wrong.

## 4. Deployment preparation (Render)

This checkout has no `render.yaml`; the actual Render service, region, plan, branch,
health-check configuration, and database status must be verified in the Render
dashboard before deployment. The following requirements describe this application,
not a claim that a hosted service is currently active:

| Setting | Project requirement |
| --- | --- |
| Build command | `npm install` (there is no frontend build step) |
| Start command | `npm start` |
| Runtime | Node.js 18 or newer (`package.json` declares this; tested locally with Node 22) |
| Required environment | `DATABASE_URL`, `APP_AUTH_USER`, `APP_AUTH_PASSWORD`; Render supplies `PORT` |
| Migration process | Run `npm run migrate` after a verified backup; do not use `npm run setup` for a production upgrade because it also seeds sample data |
| Liveness check | `/healthz` returns only `ok`; it does not require Basic Auth or reveal database state |

`/api/health` checks PostgreSQL but requires Basic Auth. Configure a Render health
check to use `/healthz` and keep `/api/health` for authenticated database diagnostics.
The server does not run migrations at startup. Use HTTPS to protect Basic Auth
credentials in transit.

Before deploying, verify the current Render service and database status/expiry, confirm
the service points to the intended database URL, take and verify a backup, review
pending migration SQL, and test restore into a separate database. This repository
review cannot confirm account-specific settings or production database availability.

## 5. Features and usage

### The main flow

1. Staff press **+ New order** and enter customer details, service and weight.
   Wash, dry and fold services use kilograms. Price is calculated from service,
   machine type and number of loads; the browser does not submit a custom price.
2. Saving the order places it in **Waiting**. If the phone number has been seen
   before, the order is attached to that existing customer instead of creating a
   duplicate.
3. Move orders one stage at a time: `waiting → washing → drying → folding → ready → completed`.
   Older orders still marked `new` can move once to `waiting`.
   Each change is appended to the order's timeline with a timestamp and optional note.
4. Plans split weight across loads within selected machine capacity (8 kg regular,
   10 kg Titan). Assigning a load checks machine capacity, availability and maintenance.
5. Record one or more payments. Amounts are checked in cents against the remaining
   balance; the order detail shows the payment history and outstanding amount.

### API endpoints

All staff-facing API endpoints and the static staff page require HTTP Basic Auth;
`/healthz` is the exception and returns only a plain liveness response. Browsers
prompt for the configured credentials. With `curl`, pass
`-u "$APP_AUTH_USER"`; curl prompts for the password.

| Method | Path | What it does |
| --- | --- | --- |
| `GET` | `/api/health` | Reports whether the server can reach the database |
| `GET` | `/healthz` | Unauthenticated liveness check for hosting; reveals no database details |
| `GET` | `/api/orders` | Lists orders, newest first. Optional `?status=` (`new`, `waiting`, `washing`, `drying`, `folding`, `ready`, `completed`) and `?q=` to search customer name or phone |
| `POST` | `/api/orders` | Creates an order, creating the customer if the phone is new. Returns `201` |
| `GET` | `/api/orders/:id` | One order with customer, status timeline, payment history, machine loads and add-on snapshots; payment status is `UNPAID`, `PARTIAL` or `PAID` |
| `PATCH` | `/api/orders/:id/status` | Moves the order to the next status. Returns `409` if the step is not allowed |
| `POST` | `/api/orders/:id/payment` | Records payment for an order. Returns `201` |
| `GET` | `/api/orders/:id/load-plan?capacity_kg=` | Splits a weighted order into machine-sized loads; capacity accepts 0.1–100 kg with at most two decimal places |
| `POST` | `/api/orders/:id/loads` | Assigns a load to a machine |
| `PATCH` | `/api/orders/:orderId/loads/:loadId/status` | Moves a machine load queued → running → completed |
| `GET`, `POST`, `PATCH` | `/api/machines` and `/api/machines/:id` | Lists/adds machines and updates names, types, kind, capacity or availability; configuration changes are rejected while queued/running loads exist |
| `GET` | `/api/customers` | Customer directory with order counts and open-order counts |
| `GET` | `/api/customers/:id` | One customer and their order history |
| `POST` | `/api/customers` | Adds a customer without starting an order |
| `PATCH` | `/api/customers/:id` | Updates customer name, phone or notes |
| `GET`, `POST`, `PATCH` | `/api/addons` | Lists, creates and updates service add-ons and prices |
| `GET`, `POST`, `PATCH` | `/api/products` | Lists, creates and updates inventory products (`GET` supports `?q=` and `?low_stock=true`) |
| `POST`, `GET` | `/api/products/:id/movements` | Records or lists stock movements |
| `GET` | `/api/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` | Sales, collections, outstanding and daily totals (maximum 366 days) |

Current `load_type` values are `wash_fold`, `wash_only`, `dry_only` and `fold_only`;
`method` is `cash`, `gcash` or `card`. The seven order statuses are `new`, `waiting`,
`washing`, `drying`, `folding`, `ready` and `completed`.

Validation limits include customer/order names up to 120 characters, phone values up
to 40 characters, notes up to 500 characters, weights up to 100 kg, and machine
capacities from 0.1 to 100 kg with at most two decimal places. Payment and add-on
prices accept at most two decimal places; add-on quantities are whole numbers from 1
to 100.

Example — logging a drop-off (curl prompts for the password):

```bash
curl -X POST http://localhost:3000/api/orders \
  -u "$APP_AUTH_USER" \
  -H "Content-Type: application/json" \
  -d '{"name":"Maria Santos","phone":"0917-555-0142","load_type":"wash_fold","weight_kg":4.5,"wash_machine_type":"regular","dry_machine_type":"regular"}'
```

Example — moving it along:

```bash
curl -X PATCH http://localhost:3000/api/orders/1/status \
  -u "$APP_AUTH_USER" \
  -H "Content-Type: application/json" \
  -d '{"status":"washing"}'
```

Example — listing only what is ready for pickup:

```bash
curl -u "$APP_AUTH_USER" \
  "https://your-service.onrender.com/api/orders?status=ready"
```

### What the API does when something is wrong

| Situation | Status | Response |
| --- | --- | --- |
| Missing or invalid fields | `400` | `{ "error": "Validation failed", "details": [{ "field": "weight_kg", "message": "..." }] }` |
| Unknown order or customer id | `404` | `{ "error": "No order with id 99" }` |
| Skipping a status step, or repeating one | `409` | `{ "error": "An order that is new can only move to waiting" }` |
| Order payment exceeds remaining balance | `400` | `{ "error": "Payment exceeds the remaining balance ..." }` |
| Postgres not running | `503` | `{ "error": "Database unavailable", ... }` |

## 6. Project structure

```
.
├── db/
│   ├── migrations/         additive, ordered schema migrations
│   ├── migrate.js          ordered runner with checksums and history
│   ├── run-migrations.js   migration CLI
│   ├── run-seed.js         transactional seed CLI
│   ├── schema.sql          retired guard file; do not use
│   └── seed.sql            repeat-safe sample data
├── public/                 the staff-facing page, served as static files
│   ├── index.html
│   ├── styles.css          design tokens and component styles
│   └── app.js              fetches the API and renders the list, form and detail
├── scripts/
│   └── check.js            preflight: required files + JS syntax (npm run check)
├── src/
│   ├── server.js           starts the server, closes the pool on shutdown
│   ├── app.js              Express app: JSON, logging, static files, routers
│   ├── db.js               connection pool, query helper, transaction helper
│   ├── middleware/
│   │   ├── httpError.js    HttpError class and async route wrapper
│   │   └── errorHandler.js the one place errors become responses
│   ├── routes/
│   │   ├── orders.js       orders, payments and machine loads
│   │   ├── customers.js    customer directory/history
│   │   ├── machines.js     machine listing
│   │   ├── products.js     inventory and movements
│   │   ├── reports.js      sales and collections
│   │   └── addons.js       configurable service add-ons
│   ├── utils/              pricing and load splitting
│   └── validators/
│       └── orderValidators.js   input rules and workflow transitions
├── docs/screenshots/       screenshots used in this README
└── .env.example
```

### Data model

- **customers** — name, phone (unique), notes.
- **orders** — belongs to a customer; service, weight, calculated historical price,
  status and note.
- **order_status_history** — one row per status change, giving each order a timeline
  rather than just a current value.
- **payments** — one or more payments per order, each with amount, method and time.
- **service_addons** and **order_addons** — configurable add-on prices plus
  order-time name/price snapshots.
- **machines** and **machine_loads** — physical equipment and order loads with
  capacity and queued/running/completed state.
- **products** and **product_movements** — stock level, threshold and an append-only
  record of additions, usage and adjustments.

### Pricing and money

Base prices are code constants (there is no pricing settings UI): regular wash ₱70,
Titan wash ₱90, regular dry ₱90, Titan dry ₱110, and folding ₱20. Wash and dry prices
are charged once per selected service per order; extra machine cycles do not add service
fees. Regular machines are 8 kg and Titan machines are 10 kg; capacity determines load
splitting and machine validation. Wash + dry + fold includes one ₱20 folding service
charge. The configurable `Folding` add-on is an additional optional service for any
order type; laundry-product add-ons are also optional and support quantities. Existing
order prices and add-on snapshots are stored and are not recalculated when configuration
changes. Payments are recorded in pesos to two decimal places and checked against the
remaining balance.
Add-on prices can be managed from the Management tab or `/api/addons`; changing or
deactivating an add-on affects future orders only. Historical order totals and
line-item snapshots remain unchanged. Standalone customer creation is available in
the Customers tab; repeat phone numbers are rejected with a duplicate-record message.

### Backup and recovery

Before a production migration, create a custom-format backup and confirm the command
completed:

```bash
pg_dump --format=custom --no-owner --file="laundrylog-$(date +%F).dump" "$DATABASE_URL"
```

Restore into a **new empty database** first, then verify tables and data before
considering a recovery action. Do not restore over the live database as a test:

```bash
createdb laundrylog_restore
pg_restore --no-owner --dbname="postgres://localhost/laundrylog_restore" laundrylog-backup.dump
```

Keep backup files private because they contain customer and payment data. The app
does not currently schedule backups or validate restore files automatically.

## 7. Screenshots

**An order-list screenshot** captured previously; it does not verify the current
hosted service or database:

![Previously captured LaundryLog order list](https://raw.githubusercontent.com/rnzcrt/LaundryLog/main/docs/screenshots/order-list.png)

**A previous Render web-service screenshot**; current service status is unverified:

![Render web service deploys](https://raw.githubusercontent.com/rnzcrt/LaundryLog/main/docs/screenshots/render-deploys.png)

**A previous Render database screenshot**; current database status is unverified:

![Render PostgreSQL database info](https://raw.githubusercontent.com/rnzcrt/LaundryLog/main/docs/screenshots/render-database.png)

## 8. Known issues

Honest state of things:

- **Basic Auth is shared by all staff.** Configure both `APP_AUTH_USER` and
  `APP_AUTH_PASSWORD`; individual accounts and roles are not supported.
- **Thin hardening.** The app uses shared Basic Auth and security headers, but has no
  per-staff accounts/roles or rate limiting. Customer, order, product and add-on text
  fields are bounded by API validation; use HTTPS in deployment.
- **Database integration tests write fixture records.** Set `TEST_DATABASE_URL` to
  a fresh disposable database; tests are skipped without it.
- **Load assignment remains API-only.** Machine name, kind, type, capacity and
  availability, plus add-on prices/activation, can be managed in the Management tab.
  Machine availability can be set to maintenance, but there is no separate
  maintenance work-order workflow.
- **No in-app business settings.** Base service prices are constants in
  `src/utils/pricing.js`; environment variables configure the database and shared auth.
- **Hosted deployment details need manual verification.** This repository has no
  Render-as-code configuration, and this review did not access the Render account or
  production database.
- **Status only moves forward.** There is no way to undo a mistaken status change,
  which will bite a real user eventually. A correction route with a reason field is
  planned.
- **Payments support partial payments.** Corrections and refunds do not yet have a
  dedicated workflow, and pickup is not blocked by an outstanding balance.
- **No pagination.** `GET /api/orders` returns everything. That is fine with seven
  seeded orders and wrong after a few hundred.
- **The frontend is plain JavaScript,** not React. The page is served straight from
  `public/`, which keeps the focus on the API for now.
- **Screenshots are incomplete.** The new-order form and the order detail/timeline
  view have not been captured yet.

## 9. Architecture

One Express service serves the staff page (plain HTML, CSS and JavaScript from
`public/`) and the JSON API under `/api`. The browser talks to that same service, so
there is no separate front-end host and no CORS configuration. The API reads and
writes PostgreSQL through the connection pool in `src/db.js`, using the
`DATABASE_URL` environment variable. The production provider, database location and
live service status have not been verified in this review. Every query passes its
values as parameters, not inside the SQL text.

## 10. Troubleshooting

- **Startup reports missing `DATABASE_URL`:** copy `.env.example` to `.env`, set a
  local PostgreSQL URL, then start the server again.
- **Requests return `401`:** use the configured Basic Auth username and password;
  static files and staff API routes are protected. `/healthz` is a public liveness
  endpoint and does not reveal database state.
- **Requests return `500 Authentication is not configured`:** both `APP_AUTH_USER`
  and `APP_AUTH_PASSWORD` must be set in the server environment.
- **Health returns `503`:** check PostgreSQL is reachable from the app and the
  `DATABASE_URL` points at the intended database.
- **Migration refuses an existing database without history:** back it up, then verify
  it matches a supported LaundryLog schema state before using `npm run migrate -- --baseline`.
- **Database tests are skipped:** set `TEST_DATABASE_URL` to a disposable database
  initialized with `npm run setup`. Without it, integration tests skip and do not
  connect to `DATABASE_URL`; HTTP tests still need permission to bind a local port.

## 11. What I would do next

- Add payment correction/refund handling with an audit trail and expand API tests.
- Add browser-level regression coverage for tabs and inventory forms.
- Verify the current hosting provider's database backup, retention and upgrade
  requirements in its dashboard; add undoable status changes with an audit reason.

## 12. AI use

![Built with AI assistance](https://img.shields.io/badge/built%20with-AI%20assistance-0b5fff)

AI assistance has been used for project reviews, documentation and application
implementation during this work. Earlier Claude assistance is described in
[AI-USAGE.md](AI-USAGE.md).
