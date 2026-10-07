# AI Usage — LaundryLog

I used AI heavily on this project: ChatGPT for most feature work, pricing and workflow logic, and README/docs drafting, and Claude (Anthropic) for a backend code review and refactor. I supplied the requirements, reviewed what came back, tested it, and deployed it. Request summaries below are not verbatim prompts, and a commit linked here may contain AI-assisted lines I did not type myself.

## 1. How I used AI

### 2026-09-25 — Customer search and order history (planning)
- **Tool:** ChatGPT
- **Asked for:** A plan for searching customers by name or phone and showing a customer's order history, using the customer endpoints that already existed.
- **Came back:** An outline of the steps and the existing endpoints to reuse. I wrote the frontend code myself (see section 3).
- **Kept / changed:** Followed the outline; wrote and tested the code in `public/app.js` and `public/index.html`.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/247c616

### 2026-09-26 — Machine inventory and load assignment
- **Tool:** ChatGPT
- **Asked for:** Help planning a machine inventory and machine-load assignment feature that keeps the existing database and app structure.
- **Came back:** A plan and the code for the machine API and the order-route changes (`src/routes/machines.js`, `src/routes/orders.js`, `src/validators/orderValidators.js`).
- **Kept / changed:** I wrote the database migration `db/migrations/001_add_machines.sql` myself (see section 3). I tested the authenticated machine API, a valid load, a load that was too heavy for a machine, and a machine that was already in use.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/66c8b4e

### 2026-09-27 — Load-based laundry pricing
- **Tool:** ChatGPT
- **Asked for:** Help pricing laundry by service, machine type and load requirements.
- **Came back:** A pricing utility and Regular/Titan test cases.
- **Kept / changed:** Kept the utility; checked prices and load rules against my requirements.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/275b930

### 2026-09-27 — Combined service pricing
- **Tool:** ChatGPT
- **Asked for:** Totals for orders with multiple services.
- **Came back:** Combined-pricing logic and tests.
- **Kept / changed:** Refined the service rules and made sure included folding is not charged twice.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/e893acd

### 2026-09-27 — Split-load planning
- **Tool:** ChatGPT
- **Asked for:** Split an order's weight into loads that respect machine capacity.
- **Came back:** A utility, an API endpoint and validation tests.
- **Kept / changed:** Checked the Regular 8 kg and Titan 10 kg capacity rules.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/aad890a

### 2026-09-28 — Services, automatic pricing and older records
- **Tool:** ChatGPT
- **Asked for:** Service options, automatic pricing, and compatibility with existing records.
- **Came back:** Service handling, validation, pricing and tests.
- **Kept / changed:** Checked service options and that older records still work. I wrote the migration `db/migrations/002_update_order_services.sql` myself (see section 3).
- **Commits:** https://github.com/rnzcrt/LaundryLog/commit/29f0e8e ; https://github.com/rnzcrt/LaundryLog/commit/ac9075b

### 2026-09-28 — Payment status and balance
- **Tool:** ChatGPT
- **Asked for:** Track amount paid and amount still due.
- **Came back:** Backend and interface changes.
- **Kept / changed:** Walked through unpaid, partially paid and paid scenarios.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/74ef47b

### 2026-09-30 — Split payments and payment history
- **Tool:** ChatGPT
- **Asked for:** Several transactions for one order.
- **Came back:** Database and API changes for payment records.
- **Kept / changed:** Checked that each partial payment stays a separate transaction.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/411469c

### 2026-09-30 — Sales and collections reporting
- **Tool:** ChatGPT
- **Asked for:** Separate order value from money actually collected.
- **Came back:** A reporting endpoint, interface changes and tests.
- **Kept / changed:** Checked that "sales" and "collections" are different measures.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/2151657

### 2026-09-30 — Customer and inventory interface
- **Tool:** ChatGPT
- **Asked for:** Clearer customer and inventory screens.
- **Came back:** Table and styling changes.
- **Kept / changed:** Checked that the columns match what staff need to see.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/bb591f0

### 2026-10-01 — Workflow and add-on catalog
- **Tool:** ChatGPT
- **Asked for:** Better workflow, machine assignment, completion add-ons, inventory validation and tests.
- **Came back:** Backend and frontend changes, a catalog migration and tests.
- **Kept / changed:** Reviewed the workflow and catalog, applied the catalog migration to production myself, refreshed the deployed app and confirmed the add-ons appeared.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/543a85667f7853f469b96ab889fa9387cbbfa9f5

### 2026-10-03 — Backend review and refactor
- **Tool:** Claude (Anthropic)
- **Asked for:** A review and refactor of the backend from a ZIP of the repository.
- **Came back:** A plan to split the long order-status handler in `src/routes/orders.js`, use the transaction helper for machine-load routes, simplify `src/middleware/basicAuth.js`, return proper JSON-error statuses from `src/middleware/errorHandler.js`, and fix a query that left out the machine name.
- **Kept / changed:** I applied the suggested changes to those three files and `test/security.test.js` and checked them against the intended behaviour. The refactored code itself came from Claude (see section 3).
- **Testing:** Full run: 70 tests, 55 passed, 0 failed, 15 skipped. Skipped tests are not passes; the 15 are the PostgreSQL integration tests, which need `TEST_DATABASE_URL`.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/685dd127a0455ea201b3768b44e93e4e8a2ef3ee

### 2026-10-03 — README organization
- **Tool:** ChatGPT
- **Asked for:** A README organized as a setup and usage guide.
- **Came back:** Reordered overview, setup, workflow, API, structure, screenshots, deployment, security, limitations and license sections.
- **Kept / changed:** Checked the order and the project-specific steps; added the demo video link.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/c404665535130bd3eb3a30efaff4bc30804833d6

## 2. Where the AI got it wrong

I looked at the old versions of the files with `git show 685dd12^:<file>`. The old code came from my ChatGPT-assisted commits in section 1.

### Case 1 — Bad JSON gave a 500 error
- **Tool:** ChatGPT (found during the Claude review, 2026-10-03)
- **What it gave me:** An error handler with no case for bad JSON bodies.
- **What was wrong:** Broken or too-big JSON fell through to the catch-all and returned `500 Something went wrong on the server`, even though the client was the one that sent bad data.
- **Fix:** `errorHandler.js` now returns 400 for bad JSON and 413 for a body that is too large. I added a test in `test/security.test.js`.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/685dd127a0455ea201b3768b44e93e4e8a2ef3ee

### Case 2 — Login check skipped the password
- **Tool:** ChatGPT (found during the Claude review, 2026-10-03)
- **What it gave me:** Basic Auth that used `!safeEqual(username, expectedUser) || !safeEqual(password, expectedPassword)`, a `try/catch` around `Buffer.from`, and the same 401 response copied in four places.
- **What was wrong:** Because of the `||`, a wrong username never reached the password check, so the two failures did different work. The `try/catch` could never trigger. It is a small issue, not a big hole.
- **Fix:** `basicAuth.js` now runs both comparisons every time, uses one helper for the 401 responses, and the `try/catch` is gone.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/685dd127a0455ea201b3768b44e93e4e8a2ef3ee

### Case 3 — Error never said which machine
- **Tool:** ChatGPT (found during the Claude review, 2026-10-03)
- **What it gave me:** A machine query of `SELECT id, machine_kind, capacity_kg, status`, with no `name`, and an error message using `${machine.name || 'Selected machine'}`.
- **What was wrong:** `name` was never selected, so the message always said "Selected machine". The fallback hid the bug, so nothing crashed and no test caught it.
- **Fix:** The query now selects `name` and the message uses `${machine.name}`, so it shows the real machine.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/685dd127a0455ea201b3768b44e93e4e8a2ef3ee

## 3. Who wrote what

The first commit (`c7df593`) has the starter app from the course archive. I did not write that. Most later features were built with ChatGPT (section 1). The Oct 3 refactor of `basicAuth.js`, `errorHandler.js` and `orders.js` came from Claude; I applied and tested it, but I am not counting it as mine.

My own part is small. I did not write the routes, validators or application queries, so I am not claiming one fifth of the Node and Express code. What I wrote is about 100 lines of Postgres SQL (roughly 3% of the 3,500 lines of backend code), one frontend feature, two small API tests and the check script.

### Written by me

**Machines migration (Postgres)**
- **File:** `db/migrations/001_add_machines.sql` (57 lines)
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/66c8b4e
- **What it does:** ChatGPT helped me plan it; I wrote the SQL. It creates `machines` (name, regular or titan, washer or dryer, capacity, status) and `machine_loads` (one load of an order on one machine). `CHECK` constraints make the database reject bad values, and there are indexes on type, kind and status. `order_id` is `ON DELETE CASCADE`, so deleting an order deletes its loads. `machine_id` is `ON DELETE RESTRICT`, so a machine that has loads can't be deleted. `UNIQUE (order_id, load_number)` stops duplicate load numbers. `IF NOT EXISTS` and `ON CONFLICT DO NOTHING` let me run it twice safely. It adds the 8 machines: 3 regular washers and 3 regular dryers (8 kg), and 1 Titan washer and 1 Titan dryer (10 kg).

**Order services migration (Postgres)**
- **File:** `db/migrations/002_update_order_services.sql` (35 lines)
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/29f0e8e
- **What it does:** Sets the allowed service types (`wash_fold`, `wash_only`, `dry_only`, `fold_only`, `dry_clean`, `press_only`) and adds a rule: weight-based services need a weight and no item count, and `dry_clean` and `press_only` need an item count and no weight. So an order can't be priced by kilos and by pieces at once. It drops and recreates the constraints so old orders still work. The file has `BEGIN`/`COMMIT`, but my migration runner removes them and runs the file in its own transaction, so it still applies all or nothing.

**Add-on prices (Postgres)**
- **File:** `db/migrations/011_completion_addon_catalog.sql` (only the `INSERT INTO service_addons`, about 10 lines)
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/543a856
- **What it does:** The add-ons staff can pick when completing an order: Folding ₱20, the detergent and conditioner products ₱10, Zonrox Colorsafe ₱5. The rest of that migration came from ChatGPT.

**Customer search and order history (frontend)**
- **File:** `public/app.js` (about 114 lines added) and `public/index.html` (16 lines)
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/247c616
- **What it does:** I planned it with ChatGPT and wrote the code myself, using the customer endpoints that already existed. `loadCustomers` calls `/api/customers?q=...` and `escapeHtml` cleans names and phones before they go into `innerHTML`, so a name like `<script>` can't run. There is one click listener on the list that uses `closest('.customer-history')`, so cards added after a new search still work. `openCustomerHistory` loads `/api/customers/:id` and shows "No orders yet." if there are none. ChatGPT later changed the list to a table in `bb591f0`; this commit is my version.

**Singular item label**
- **File:** `public/app.js` (`measure()`)
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/5d12768
- **What it does:** Fixed "1 items" so the "s" only shows when the count isn't 1. A three-line change.

**First API tests**
- **File:** `test/orders.test.js` (first version) and `package.json`
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/dd5a735
- **What it does:** Two tests: a missing order returns 404, and an empty order returns 400 with validation errors. A small helper starts the app on a random free port (`listen(0)`) and always closes it in `finally`. I used Node's built-in test runner, so no extra framework.

**Preflight check script**
- **File:** `scripts/check.js`
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/c7df593
- **What it does:** Checks that every required file exists and runs `node --check` on each `.js` file, so I catch a missing file or a syntax error before deploying. `c7df593` also contains the starter code, so git can't separate them; my Week 1 report lists this file as mine.

**Ignore rules and example env file**
- **File:** `.gitignore`, `.env.example`
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/c7df593
- **What it does:** Keeps `.env` and `node_modules` out of the repo. `.env.example` lists the variables the app needs, with placeholder values.

### The AI-written part I understand best

- **File:** `src/utils/orderWorkflow.js`
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/543a85667f7853f469b96ab889fa9387cbbfa9f5 (first added in `efcf044`)
- **What it does:** ChatGPT wrote it. It checks the order workflow before anything is saved to the database.
  - `requiredMachineKind` says which machine an order needs: a washer for wash-and-fold or wash-only, a dryer for wash-and-fold or dry-only.
  - `validateMachineAssignments` rejects an empty list, the same machine twice, bad ids, and bad weights. It turns weights into whole centi-kilograms and checks the loads add up exactly to the order weight.
  - `validateCompletionChoices` makes staff either add add-ons or skip them. It rejects "skip" with add-ons, "add" with none, duplicates, and quantities outside 1 to 100.
- **Why I kept it:** The rules match how the shop works, and checking in one place keeps the route code short and easy to test.

### Requirements and decisions that were mine

I decided the order stages, the Regular and Titan capacities and prices, which folding is included, the add-ons, payment history and how outstanding balances work. I used these to check every AI suggestion and to test the deployed app. That is design and checking work, not sole authorship of the code.
