# LaundryLog

**Project repository URL:** https://github.com/rnzcrt/LaundryLog  
**Live site URL:** https://laundrylog.onrender.com

![The LaundryLog order list](https://raw.githubusercontent.com/rnzcrt/LaundryLog/main/docs/screenshots/order-list.png)

> The site runs on Render's free tier. If nobody has visited for a while the server
> spins down, and the first page load can take **50 seconds or more** while it wakes up.

## 1. Overview

LaundryLog is an order-tracking tool for a small, single-branch laundry shop. Staff
log a customer's drop-off at the counter and follow it through washing, drying and
pickup, so nothing is lost on a busy day and anyone on shift can answer "is my
laundry ready?" without digging through a notebook.

It is built for the one or two people working the counter, not for customers.

**Stack:** Node.js + Express, PostgreSQL, plain HTML/CSS/JavaScript frontend served
from `public/`. Hosted on Render (web service + PostgreSQL).

## 2. Setup and installation

### What to install first

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | 18 or newer (built on 22) | Runs the server |
| PostgreSQL | 14 or newer | Stores customers, orders, status history and payments |
| psql | ships with PostgreSQL | Used to create and seed the database |

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

`.env` is listed in `.gitignore`. Real credentials are never committed; the example
file only contains placeholders.

### Create and seed the database

Create the database once:

```bash
createdb laundrylog
```

Then load the tables and the sample rows:

```bash
npm run db:setup     # runs db/schema.sql against $DATABASE_URL
npm run db:seed      # runs db/seed.sql against $DATABASE_URL
```

Both scripts read `DATABASE_URL`, so export it first (or run them as
`DATABASE_URL="postgres://..." npm run db:setup`). They are shortcuts for:

```bash
psql "postgres://postgres:your_password_here@localhost:5432/laundrylog" -f db/schema.sql
psql "postgres://postgres:your_password_here@localhost:5432/laundrylog" -f db/seed.sql
```

> **Warning:** `db/schema.sql` **drops and recreates every table**. That is convenient
> while developing locally, but never run it against the live Render database unless
> you intend to erase all of its orders.

`db/seed.sql` adds four customers and seven orders spread across the four statuses,
which is enough to see every screen state.

### Check the project before you run it

```bash
npm run check
```

This preflight script confirms the 13 required files exist and that every JavaScript
file passes a syntax check. A healthy project prints:

```
Preflight passed: 13 required files present; 10 JavaScript files passed syntax checks.
```

## 3. How to run it

```bash
npm start
```

The terminal prints `LaundryLog is running at http://localhost:3000`. Open that
address and you should see the LaundryLog header, the status filter tabs, and the
seeded orders as cards. (`npm run dev` does the same but restarts on file changes.)

To check the server and the database separately, open
<http://localhost:3000/api/health> (or
<https://laundrylog.onrender.com/api/health> for the live site). A healthy install
returns:

```json
{ "status": "ok", "database": "connected" }
```

If it returns `"database": "unreachable"`, Postgres is not running or `DATABASE_URL`
is wrong.

## 4. Deployment (Render)

The live site is two Render services in the same account:

| Service | Type | Notes |
| --- | --- | --- |
| `laundrylog-db` | PostgreSQL 17, Free, Singapore region | Holds all the data |
| `LaundryLog` | Web Service, Node, Free | Deploys from the `main` branch of `rnzcrt/LaundryLog` |

To reproduce it:

1. **Create the database first.** In Render, create a PostgreSQL instance and copy its
   connection URLs from the Info page.
2. **Load the schema and seed data into it.** A new hosted database is empty, and the
   app returns a server error until the tables exist. From your own machine, use the
   database's *External* URL:
   ```bash
   DATABASE_URL="<external database url>" npm run db:setup
   DATABASE_URL="<external database url>" npm run db:seed
   ```
3. **Create a Web Service** from the GitHub repo, branch `main`, runtime Node. The
   commands come straight from `package.json`: build `npm install`, start `npm start`.
4. **Add the environment variable** `DATABASE_URL` to the web service, set to the
   database's connection URL. `PORT` does not need to be set; Render provides it.
5. **Deploy.** Render redeploys automatically on every push to `main`. Open
   `/api/health` on the new URL to confirm it can reach the database.

Free-tier limits to know about:

- The free PostgreSQL database **expires on October 19, 2026** and is deleted unless
  upgraded to a paid plan (see the second screenshot below).
- The free web service spins down when idle, so the first request after a quiet period
  is slow.

## 5. Features and usage

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

Valid values: `load_type` is `wash_fold`, `wash_only`, `dry_clean` or `press_only`;
payment `method` is `cash`, `gcash` or `card`.

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

Example — listing only what is ready for pickup on the live site:

```bash
curl "https://laundrylog.onrender.com/api/orders?status=ready"
```

### What the API does when something is wrong

| Situation | Status | Response |
| --- | --- | --- |
| Missing or invalid fields | `400` | `{ "error": "Validation failed", "details": [{ "field": "price", "message": "..." }] }` |
| Unknown order or customer id | `404` | `{ "error": "No order with id 99" }` |
| Skipping a status step, or repeating one | `409` | `{ "error": "An order that is received can only move to washing" }` |
| Phone number already registered | `409` | `{ "error": "That record already exists" }` |
| Postgres not running | `503` | `{ "error": "Database unavailable", ... }` |

## 6. Project structure

```
.
├── db/
│   ├── schema.sql          tables, constraints and indexes
│   └── seed.sql            sample customers and orders
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
│   │   ├── orders.js       /api/orders
│   │   └── customers.js    /api/customers
│   └── validators/
│       └── orderValidators.js   input rules and allowed status transitions
├── docs/screenshots/       screenshots used in this README
└── .env.example
```

### Data model

- **customers** — name, phone (unique), notes.
- **orders** — belongs to a customer; load type, weight *or* item count, price,
  status, note. A database-level check keeps weight-based and piece-based loads from
  being mixed up.
- **order_status_history** — one row per status change, giving each order a timeline
  rather than just a current value.
- **payments** — one payment per order, with amount and method.

## 7. Screenshots

**The live order list** at https://laundrylog.onrender.com, showing the seven seeded
orders from the hosted database:

![Order list on the live site](https://raw.githubusercontent.com/rnzcrt/LaundryLog/main/docs/screenshots/order-list.png)

**The Render web service**, deployed from `main` and marked Live:

![Render web service deploys](https://raw.githubusercontent.com/rnzcrt/LaundryLog/main/docs/screenshots/render-deploys.png)

**The Render PostgreSQL database**, status Available, with its expiry notice:

![Render PostgreSQL database info](https://raw.githubusercontent.com/rnzcrt/LaundryLog/main/docs/screenshots/render-database.png)

## 8. Known issues

Honest state of things:

- **No authentication, and the site is now public.** Anyone who has the URL can
  create orders and change any order's status. This is acceptable for a class
  demo with sample data, and unacceptable for a real shop.
- **Thin hardening.** There is no `helmet`, no rate limiting, and no length limit on
  the customer name, phone or note fields. Queries are parameterised and server
  errors do not return stack traces, but that is not the same as hardened.
- **No automated tests.** Everything has been checked by hand with the browser and
  curl; `npm run check` only verifies files and syntax.
- **"1 items" wording.** An order with a single item displays as "1 items"
  (`public/app.js`, the item-count label has no singular case).
- **Free-tier limits.** The database expires on October 19, 2026 and the web service
  has slow cold starts (see section 4).
- **Status only moves forward.** There is no way to undo a mistaken status change,
  which will bite a real user eventually. A correction route with a reason field is
  planned.
- **Payments are minimal.** One payment per order, no partial payments, and marking
  an order picked up does not require it to be paid.
- **No pagination.** `GET /api/orders` returns everything. That is fine with seven
  seeded orders and wrong after a few hundred.
- **The frontend is plain JavaScript,** not React. The page is served straight from
  `public/`, which keeps the focus on the API for now.
- **Screenshots are incomplete.** The new-order form and the order detail/timeline
  view have not been captured yet.

## 9. Architecture

One Express service on Render does two jobs: it serves the staff page (plain HTML,
CSS and JavaScript from `public/`) and it answers the JSON API under `/api`. The
browser talks to that same service, so there is no separate front-end host and no
CORS configuration. The API reads and writes PostgreSQL (a separate Render database
in Singapore) through the connection pool in `src/db.js`, using the `DATABASE_URL`
environment variable. Every query passes its values as parameters, not inside the SQL
text.

## 10. What I would do next

- Put the site behind a login, and add `helmet`, rate limiting and length limits on
  the text fields, because right now anyone with the link can change any order.
- Fix the "1 items" label and add automated tests for the API's validation and
  error cases, so changes stop depending on me clicking through the page.
- Move or upgrade the database before it expires on October 19, 2026, then add
  undoable status changes.

## 11. AI use

![Built with AI assistance](https://img.shields.io/badge/built%20with-AI%20assistance-0b5fff)

I used Claude (Anthropic) in its chat interface to review the project and draft the
documentation. It did not write or change any of the application code. The full
account, with commit links, is in [AI-USAGE.md](AI-USAGE.md).
