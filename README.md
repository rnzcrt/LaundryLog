# LaundryLog

## 1. Overview

LaundryLog is an order-tracking tool for a small, single-branch laundry shop. Staff
log a customer's drop-off at the counter and follow it through washing, drying and
pickup, so nothing is lost on a busy day and anyone on shift can answer "is my
laundry ready?" without digging through a notebook.

It is built for the one or two people working the counter, not for customers.

## 2. Setup and installation

### What to install first

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | 18 or newer (built on 22) | Runs the server |
| PostgreSQL | 14 or newer | Stores customers, orders, status history and payments |
| psql | ships with PostgreSQL | Used to create and seed the database |

### Get the code

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO
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
| `DATABASE_URL` | Postgres connection string | `postgres://postgres:your_password_here@localhost:5432/laundrylog` |
| `PORT` | Port the server listens on (optional, defaults to 3000) | `3000` |

`.env` is listed in `.gitignore`. Real credentials are never committed; the example
file only contains placeholders.

### Create and seed the database

Create the database once:

```bash
createdb laundrylog
```

Then load the tables and the sample rows:

```bash
psql "postgres://postgres:your_password_here@localhost:5432/laundrylog" -f db/schema.sql
psql "postgres://postgres:your_password_here@localhost:5432/laundrylog" -f db/seed.sql
```

`db/schema.sql` drops and recreates the tables, so it is safe to run again while the
schema is still changing. `db/seed.sql` adds four customers and seven orders spread
across the four statuses, which is enough to see every screen state.

## 3. How to run it

```bash
npm start
```

The terminal prints `LaundryLog is running at http://localhost:3000`. Open that
address and you should see the LaundryLog header, the status filter tabs, and the
seeded orders as cards.

To check the server and the database separately, open
<http://localhost:3000/api/health>. A healthy install returns:

```json
{ "status": "ok", "database": "connected" }
```

If it returns `"database": "unreachable"`, Postgres is not running or `DATABASE_URL`
is wrong.

## 4. Features and usage

### The main flow

1. A customer walks in. Staff press **+ New order** and fill in the name, phone,
   load type, measurement and price. Wash-and-fold and wash-only loads are measured
   in kilograms; dry clean and press-only are counted in items, and the form swaps
   the field automatically.
2. Saving the order files it as **Received**. If the phone number has been seen
   before, the order is attached to that existing customer instead of creating a
   duplicate.
3. Staff press a card to open the order, and move it along with the button at the
   bottom: Received → Washing → Ready → Picked up, one step at a time. Every change
   is appended to the order's timeline with a timestamp.
4. The filter tabs at the top narrow the list to one status, which is how staff see
   what is waiting to be washed or ready for pickup.

### API endpoints

| Method | Path | What it does |
| --- | --- | --- |
| `GET` | `/api/health` | Reports whether the server can reach the database |
| `GET` | `/api/orders` | Lists orders, newest first. Optional `?status=` (`received`, `washing`, `ready`, `picked_up`) and `?q=` to search customer name or phone |
| `POST` | `/api/orders` | Creates an order, creating the customer if the phone is new. Returns `201` |
| `GET` | `/api/orders/:id` | One order with its customer, status timeline and payment |
| `PATCH` | `/api/orders/:id/status` | Moves the order to the next status. Returns `409` if the step is not allowed |
| `POST` | `/api/orders/:id/payment` | Records payment for an order. Returns `201` |
| `GET` | `/api/customers` | Customer directory with order counts and open-order counts |
| `GET` | `/api/customers/:id` | One customer and their order history |
| `POST` | `/api/customers` | Adds a customer without starting an order |

Example — logging a drop-off:

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"name":"Maria Santos","phone":"0917-555-0142","load_type":"wash_fold","weight_kg":4.5,"price":315}'
```

Example — moving it along:

```bash
curl -X PATCH http://localhost:3000/api/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{"status":"washing"}'
```

### What the API does when something is wrong

| Situation | Status | Response |
| --- | --- | --- |
| Missing or invalid fields | `400` | `{ "error": "Validation failed", "details": [{ "field": "price", "message": "..." }] }` |
| Unknown order or customer id | `404` | `{ "error": "No order with id 99" }` |
| Skipping a status step, or repeating one | `409` | `{ "error": "An order that is received can only move to washing" }` |
| Phone number already registered | `409` | `{ "error": "That record already exists" }` |
| Postgres not running | `503` | `{ "error": "Database unavailable", ... }` |

## 5. Project structure

```
.
├── db/
│   ├── schema.sql          tables, constraints and indexes
│   └── seed.sql            sample customers and orders
├── public/                 the staff-facing page, served as static files
│   ├── index.html
│   ├── styles.css          design tokens and component styles
│   └── app.js              fetches the API and renders the list, form and detail
├── src/
│   ├── server.js           starts the server, closes the pool on shutdown
│   ├── app.js              Express app: JSON, logging, static files, routers
│   ├── db.js               connection pool, query helper, transaction helper
│   ├── middleware/
│   │   ├── httpError.js    HttpError class and async route wrapper
│   │   └── errorHandler.js the one place errors become responses
│   ├── routes/
│   │   ├── orders.js       /api/orders
│   │   └── customers.js    /api/customers
│   └── validators/
│       └── orderValidators.js   input rules and allowed status transitions
├── docs/screenshots/
├── .env.example
└── REPORT.md               weekly increment report
```

### Data model

- **customers** — name, phone (unique), notes.
- **orders** — belongs to a customer; load type, weight *or* item count, price,
  status, note. A database-level check keeps weight-based and piece-based loads from
  being mixed up.
- **order_status_history** — one row per status change, giving each order a timeline
  rather than just a current value.
- **payments** — one payment per order, with amount and method.

## 6. Screenshots

| | |
| --- | --- |
| Order list with status filters | ![Order list](docs/screenshots/order-list.png) |
| Logging a new order | ![New order form](docs/screenshots/new-order.png) |
| Order detail and timeline | ![Order detail](docs/screenshots/order-detail.png) |

## 7. Known issues and next steps

Honest state of things:

- **No tests.** Everything has been checked by hand with the browser and curl.
- **No authentication.** Anyone who can reach the server can change any order. Fine
  for one shop counter on a local machine, not fine if it is ever deployed.
- **Status only moves forward.** There is no way to undo a mistaken status change,
  which will bite a real user eventually. A correction route with a reason field is
  planned.
- **Payments are minimal.** One payment per order, no partial payments, and marking
  an order picked up does not require it to be paid.
- **No pagination.** `GET /api/orders` returns everything. That is fine with seven
  seeded orders and wrong after a few hundred.
- **The frontend is plain JavaScript,** not React. The page is served straight from
  `public/`, which keeps the focus on the API for now.
- **Not deployed.** It runs locally only.

Next: undoable status changes, pagination and search on the order list, a customers
screen in the UI, and deployment with a hosted Postgres.
