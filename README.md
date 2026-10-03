# LaundryLog

LaundryLog is a web-based laundry shop management system for shop owners and staff. It brings customer orders, machine assignments, payments, inventory, and daily reporting into one place.

- **Live application:** https://laundrylog.onrender.com
- **API liveness:** https://laundrylog.onrender.com/healthz
- **Source code:** https://github.com/rnzcrt/LaundryLog
- **Demo video:** Add the public Google Drive link after recording.

## 1. Project overview

LaundryLog helps staff follow an order from drop-off to pickup while keeping machine loads, payment activity, and optional products or services connected to the order.

### Main features

- Create orders and connect them to customer records.
- Track orders through Waiting, Washing, Drying, Folding, Ready, and Completed.
- Assign washer and dryer loads while checking machine capacity and availability.
- Split an order's weight into machine-sized loads.
- Calculate prices from the selected service, machine type, and load requirements.
- Record full or partial payments and view payment history and outstanding balances.
- Manage customer details and view customer order history.
- Manage machines, supported laundry products, and stock movements.
- Add optional services or laundry products to an order.
- View sales, collections, outstanding balances, and daily totals.

## 2. Technology

| Part | Technology |
| --- | --- |
| Frontend | HTML, CSS, vanilla JavaScript |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| Hosting | Render |

The Express application serves the frontend and JSON API from the same service. The browser sends requests to the API, and the backend validates input and applies business rules before reading or writing PostgreSQL.

## 3. Run LaundryLog locally

Follow these steps to set up a local development copy.

### Step 1 — Install the requirements

Install Git, Node.js 18 or newer with npm, and PostgreSQL.

### Step 2 — Clone the repository

Open a terminal and run:

    git clone https://github.com/rnzcrt/LaundryLog.git
    cd LaundryLog

### Step 3 — Install dependencies

    npm install

### Step 4 — Create and configure the environment file

    cp .env.example .env

Open the new .env file in your editor and set the values for your local machine. The example file contains placeholders only.

| Variable | Purpose | Local example |
| --- | --- | --- |
| DATABASE_URL | PostgreSQL connection string | postgres://postgres:your_password_here@localhost:5432/laundrylog |
| PORT | Port used by the server | 3000 |
| APP_AUTH_USER | Shared Basic Auth username | Set your own value |
| APP_AUTH_PASSWORD | Shared Basic Auth password | Set your own value |

Keep .env private. Do not commit it to GitHub, include credentials in screenshots, or put secrets in frontend code. Use the hosting provider's environment settings for deployed values.

### Step 5 — Create a local database

Make sure PostgreSQL is running, then create a database:

    createdb laundrylog

If your PostgreSQL installation uses a different username or port, adjust DATABASE_URL in .env to match it.

### Step 6 — Apply migrations and add sample data

From the project folder, run:

    npm run setup

This runs the ordered database migrations and then adds sample data. The migration runner records completed migrations so they are not replayed. Sample seed data is intended for local development.

**Important:** Use a local or disposable database for setup and tests. Do not run npm run setup against production because it also inserts sample data. Back up and review the production database before applying migrations.

### Step 7 — Run project checks and tests

    npm run check
    npm test

Database integration tests require a separate, disposable test database configured with TEST_DATABASE_URL. Never point it at production or at a database containing records you need to keep. Example:

    createdb laundrylog_test
    DATABASE_URL="postgres://postgres:your_password_here@localhost:5432/laundrylog_test" npm run setup
    TEST_DATABASE_URL="postgres://postgres:your_password_here@localhost:5432/laundrylog_test" npm test

The test suite should use only the disposable test database. Without TEST_DATABASE_URL, database integration tests are skipped.

### Step 8 — Start the server

    npm start

Open http://localhost:3000 in your browser and sign in using the Basic Auth username and password configured in .env.

For development with automatic server restarts when files change, use:

    npm run dev

### Step 9 — Check server health

Open http://localhost:3000/healthz to check whether the web service is responding. This liveness endpoint does not check the database.

The authenticated endpoint at http://localhost:3000/api/health checks database connectivity. If the database is unreachable, check that PostgreSQL is running and DATABASE_URL is correct.

## 4. Use the application step by step

### Step 1 — Create a laundry order

1. Open the Orders view.
2. Select **New Order**.
3. Enter the customer's name and phone number.
4. Select the requested service and enter the laundry weight.
5. Select the applicable machine type where prompted.
6. Review the order details and save.

New orders enter the **Waiting** stage. Existing customer phone numbers connect repeat orders to the existing customer record.

### Step 2 — Plan and assign machine loads

1. Open the order details.
2. Review the load plan for the order's weight.
3. Choose an available washer for a washing load.
4. Confirm the assignment and continue the order workflow.
5. Assign a dryer when the order reaches the drying stage.

Regular machines have an 8 kg capacity and Titan machines have a 10 kg capacity. Loads are planned and validated against machine capacity and availability. Do not assign a load to a machine that is unavailable or under maintenance.

### Step 3 — Update the order status

Move the order through the stages in sequence:

**Waiting → Washing → Drying → Folding → Ready → Completed**

The backend validates status changes, so the interface alone is not relied on to enforce the workflow. Older records may contain the legacy status **new**; move these to Waiting before continuing through the current stages.

### Step 4 — Record payments

1. Open the order details.
2. Enter the amount received.
3. Select the payment method available in the form.
4. Save the payment.
5. Review the payment history and remaining balance.

An order can have multiple payment records. LaundryLog tracks whether an order is unpaid, partially paid, or paid, and checks new payments against the outstanding balance.

### Step 5 — Add optional products or services

When an order is ready to be completed, review the optional add-ons presented by the application. Select any applicable service or laundry product, enter the quantity when requested, and confirm—or skip add-ons if none are needed. Add-ons update the order total while preserving payment history. Historical order add-on names and prices are stored as snapshots.

### Step 6 — Manage customers, machines, and inventory

- **Customers:** Browse the customer directory, search for a customer, update details, and review order history.
- **Machines:** View machine status and manage machine details, capacity, type, and availability.
- **Inventory:** Manage supported laundry products and record stock movements. Verify quantities before saving.

### Step 7 — Review reports

Open the Reports view to review sales, collections, outstanding balances, and daily totals for a selected date range. Sales and collections are different measures: sales reflect order value, while collections reflect payments actually received.

## 5. Pricing overview

Base service prices are defined in the application code rather than through a business-settings screen.

| Service | Regular | Titan |
| --- | ---: | ---: |
| Wash | ₱70 per load (up to 8 kg) | ₱90 per load (up to 10 kg) |
| Dry | ₱90 per load (up to 8 kg) | ₱110 per load (up to 10 kg) |

Wash & Fold and Fold Only include the base folding service. An optional additional Folding add-on is ₱20. Optional laundry-product add-ons have configured prices shown in the application. Saved order totals and add-on prices are retained as historical records when the catalog changes.

## 6. API overview

Staff-facing API routes use HTTP Basic Authentication. The /healthz liveness endpoint is public and returns no database details.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | /api/health | Check database connectivity |
| GET, POST | /api/orders | List or create orders |
| GET | /api/orders/:id | Retrieve an order and related history |
| PATCH | /api/orders/:id/status | Advance an order's status |
| POST | /api/orders/:id/payment | Record a payment |
| GET | /api/orders/:id/load-plan | Calculate a machine-capacity load plan |
| POST | /api/orders/:id/loads | Assign a load to a machine |
| PATCH | /api/orders/:orderId/loads/:loadId/status | Update a machine load's status |
| GET, POST, PATCH | /api/machines and /api/machines/:id | View and manage machines |
| GET | /api/customers and /api/customers/:id | View customers and customer history |
| POST, PATCH | /api/customers and /api/customers/:id | Create or update customer records |
| GET, POST, PATCH | /api/addons | View and manage optional add-ons |
| GET, POST, PATCH | /api/products | View and manage inventory products |
| POST, GET | /api/products/:id/movements | Record or view inventory movements |
| GET | /api/reports/summary | Retrieve sales and collections summaries |

The orders endpoint supports status and customer-search filters. The load-plan endpoint accepts a machine capacity value. The reports endpoint accepts from and to dates. Refer to the route files in src/routes/ for exact request fields, validation rules, and response shapes.

## 7. Project structure

    LaundryLog/
    ├── db/
    │   ├── migrations/       Ordered database migrations
    │   ├── migrate.js        Migration runner
    │   ├── run-migrations.js Migration command
    │   ├── run-seed.js       Sample-data command
    │   └── seed.sql          Sample data
    ├── public/
    │   ├── index.html        Application page
    │   ├── styles.css        Layout and component styles
    │   └── app.js            Browser-side application logic
    ├── scripts/
    │   └── check.js          Project preflight checks
    ├── src/
    │   ├── app.js            Express app configuration
    │   ├── server.js         Server entry point
    │   ├── db.js             PostgreSQL helpers
    │   ├── middleware/       Authentication and error handling
    │   ├── routes/           API route handlers
    │   ├── utils/            Pricing, workflow, and load planning
    │   └── validators/       Server-side request validation
    ├── docs/
    │   ├── assets/           Mockup screenshots
    │   └── design-system/    Design-system reference PDFs
    ├── .env.example          Environment-variable template
    ├── AI-USAGE.md           AI assistance record
    ├── LICENSE               Project license
    └── README.md

## 8. Screenshots and design references

Mockup screenshots are stored in docs/assets/.

### Desktop

![Order list mockup](docs/assets/mockup-order-list.png)

![New order mockup](docs/assets/mockup-new-order.png)

![Order detail mockup](docs/assets/mockup-order-detail.png)

![Machine management mockup](docs/assets/mockup-machines.png)

![Customer management mockup](docs/assets/mockup-customers.png)

![Inventory management mockup](docs/assets/mockup-inventory.png)

![Reports mockup](docs/assets/mockup-reports.png)

### Mobile

![Mobile order list mockup](docs/assets/mockup-mobile-order-list.png)

![Mobile new order mockup](docs/assets/mockup-mobile-new-order.png)

![Mobile order detail mockup](docs/assets/mockup-mobile-order-detail.png)

Design references are available in docs/design-system/. Mockups are design references; check the live application to see the currently implemented interface.

## 9. Deployment notes

The live demo is hosted on Render. Service availability and account-specific configuration can change, so verify the Render dashboard before relying on it.

Typical service settings:

- **Build command:** npm install
- **Start command:** npm start
- **Node.js:** version 18 or newer
- **Environment variables:** DATABASE_URL, APP_AUTH_USER, APP_AUTH_PASSWORD; the host may provide PORT
- **Health check:** /healthz

Set secrets through the hosting provider's environment settings, not in source code. Use HTTPS to protect Basic Auth credentials in transit. Back up and review the production database before applying migrations. Do not use npm run setup against production because it also seeds sample data. Confirm the current database plan, backup arrangements, and expiry or upgrade requirements in the hosting dashboard.

## 10. Security and privacy notes

- The application uses shared HTTP Basic Authentication rather than individual staff accounts and roles.
- Keep environment files, passwords, database URLs, and real customer information out of the repository and public screenshots.
- Backend validation is used for important order, machine, payment, add-on, and inventory operations.
- Use HTTPS for deployed access.
- Use fictional or anonymized data in demonstrations and course submissions.
- This is a course project and should not be treated as a fully audited commercial system. Review the separate security and privacy documentation before using real customer data.

## 11. Known limitations and future improvements

- Staff share one Basic Auth login; individual accounts and role-based permissions are not available.
- Payment corrections and refunds do not have a dedicated workflow.
- Order status changes move forward through the workflow; there is no general undo flow.
- There is no pagination for large order lists.
- Base service prices are code-defined rather than editable in a business-settings page.
- Hosting and database plan details should be rechecked in the provider dashboard.

Potential future work includes payment corrections with an audit trail, browser-level regression tests, improved reporting, and more complete account and permission management.

## 12. Author and course

**Ranz Cuarto**  
6APSI — Holy Angel University  
GitHub: [rnzcrt](https://github.com/rnzcrt)

## 13. AI use

![Built with AI assistance](https://img.shields.io/badge/built%20with-AI%20assistance-0b5fff)

AI tools, including ChatGPT, assisted with parts of planning, implementation, testing support, troubleshooting, and documentation. The project author is responsible for reviewing and understanding the submitted work. See [AI-USAGE.md](AI-USAGE.md) for the AI-use record; review its reconstructed entries and complete any remaining reflection sections so they accurately represent the actual work.

## 14. License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file.
