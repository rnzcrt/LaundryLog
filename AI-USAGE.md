# AI Usage — LaundryLog

I used AI heavily on this project: ChatGPT for most feature work, pricing and workflow logic, and README/docs drafting, and Claude (Anthropic) for a backend code review and refactor. I supplied the requirements, reviewed what came back, tested it, and deployed it. Request summaries below are not verbatim prompts, and a commit linked here may contain AI-assisted lines I did not type myself.

## 1. How I used AI

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
- **Kept / changed:** Checked service options and that older records still work.
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
- **Kept / changed:** I made the changes in those three files plus `test/security.test.js` and checked them against the intended behaviour.
- **Testing:** Full run: 70 tests, 55 passed, 0 failed, 15 skipped. Skipped tests are not passes; the 15 are the PostgreSQL integration tests, which need `TEST_DATABASE_URL`.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/685dd127a0455ea201b3768b44e93e4e8a2ef3ee

### 2026-10-03 — README organization
- **Tool:** ChatGPT
- **Asked for:** A README organized as a setup and usage guide.
- **Came back:** Reordered overview, setup, workflow, API, structure, screenshots, deployment, security, limitations and license sections.
- **Kept / changed:** Checked the order and the project-specific steps; added the demo video link.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/c404665535130bd3eb3a30efaff4bc30804833d6

## 2. Where the AI got it wrong

I checked the old versions of each file with `git show 685dd12^:<file>`. The earlier code came from my ChatGPT-assisted commits described in section 1.

### Case 1 — Bad JSON bodies came back as a server error
- **Tool:** ChatGPT-assisted code; found during the Claude review on 2026-10-03.
- **What it gave me:** An error handler that translated my own `HttpError` and Postgres error codes but had no case for body-parser errors. A malformed or oversized JSON request therefore fell through to the catch-all and returned `500 Something went wrong on the server`.
- **What was wrong:** A 500 means "the server broke", but the client sent bad data. It hides the real problem from the caller and fills the logs with fake server errors.
- **What I did instead:** `errorHandler.js` now checks `err.type`: `entity.parse.failed` returns `400` and `entity.too.large` returns `413`, each with a JSON message. I updated `test/security.test.js` to cover it.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/685dd127a0455ea201b3768b44e93e4e8a2ef3ee

### Case 2 — Login checks could leak whether the username was right
- **Tool:** ChatGPT-assisted code; found during the Claude review on 2026-10-03.
- **What it gave me:** Basic Auth that checked `!safeEqual(username, expectedUser) || !safeEqual(password, expectedPassword)`, wrapped `Buffer.from(...)` in a `try/catch`, and repeated the same `res.set('WWW-Authenticate', ...)` plus 401 response in four places.
- **What was wrong:** Because of the `||`, a wrong username skipped the password comparison, so the two failure cases did slightly different work. The helper was built to be constant-time, but the check around it wasn't. The `try/catch` was dead code because `Buffer.from(string, 'base64')` does not throw on bad input, and the copy-pasted rejections invited inconsistencies. This is a small hardening fix, not a big hole: `safeEqual` still returns early when the lengths differ.
- **What I did instead:** `basicAuth.js` now stores both comparison results first, then rejects if either is false. The `try/catch` is gone and every failure goes through one `rejectWith` helper.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/685dd127a0455ea201b3768b44e93e4e8a2ef3ee

### Case 3 — The machine lookup left out `name`, so errors never said which machine
- **Tool:** ChatGPT-assisted code; found during the Claude review on 2026-10-03.
- **What it gave me:** In the old status handler the lookup was `SELECT id, machine_kind, capacity_kg, status FROM machines WHERE id = ANY($1)`, with no `name` column. The error below it used `${machine.name || 'Selected machine'}`.
- **What was wrong:** Since `name` was never selected, `machine.name` was always `undefined`, so the fallback always ran and the message always said "Selected machine is unavailable or too small for its assigned load". The `|| 'Selected machine'` fallback hid the bug, so no test or crash showed it. Staff could not tell which machine was the problem.
- **What I did instead:** The refactored lookup is `SELECT id, name, machine_kind, capacity_kg, status …`, and the message uses `${machine.name}` directly, so it names the actual machine. I removed the fallback so a missing name can't be hidden again.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/685dd127a0455ea201b3768b44e93e4e8a2ef3ee

## 3. Who wrote what

AI helped with a lot of this project, and I do not claim every line in the linked commits. Below are the parts I changed myself and the one AI-written file I understand best, explained the way I would explain them out loud.

### 3.1 Parts I implemented myself

**`src/middleware/basicAuth.js` — the login gate** (added in `685d9fa`, my refactor in `685dd12`)
This runs before every request except `/healthz`. It reads the username and password from environment variables, so the secrets are never in the code. If they are missing, it returns a 500. Otherwise it decodes the `Authorization` header and splits it at the first `:`, so a password can contain a colon. Then it compares the username and password. In my refactor I made both comparisons always run and put all the 401 responses into one helper, so they stay the same.
Commit: https://github.com/rnzcrt/LaundryLog/commit/685dd127a0455ea201b3768b44e93e4e8a2ef3ee

**`src/middleware/errorHandler.js` — one place for error responses**
Every error in the app ends up here. If it is my own `HttpError`, I send back its status and message. Bad JSON now gives a 400 and a too-large body gives a 413. Postgres errors are turned into useful statuses, like 409 for a duplicate and 400 for a bad reference. Anything unexpected is logged briefly and returns a plain 500, so internal details never reach the user.
Commit: https://github.com/rnzcrt/LaundryLog/commit/685dd127a0455ea201b3768b44e93e4e8a2ef3ee

**`src/routes/orders.js` — splitting up the status handler**
The route that moves an order to its next stage had become one huge function. I split it into smaller steps: assigning machines, starting queued washer loads, finishing dryer loads, and handling add-ons at completion. The machine-load changes run inside `db.withTransaction`, so if any step fails, everything is rolled back and an order is never left half-updated. I also moved the repeated kg-to-centi-kg conversion into one helper so weights are compared as whole numbers instead of decimals.
Commit: https://github.com/rnzcrt/LaundryLog/commit/685dd127a0455ea201b3768b44e93e4e8a2ef3ee

**`src/db.js` — database access** (only commit: `c7df593`, from the course's M8A1 setup)
I did not write this file from scratch, so I am not claiming it. I can explain it: it makes one PostgreSQL connection pool from `DATABASE_URL` and refuses to start without it. `query` sends values separately from the SQL text, which prevents SQL injection. `withTransaction` runs `BEGIN`, then my function, then `COMMIT`; if anything throws it runs `ROLLBACK`, and it always releases the client at the end so connections are not leaked.

### 3.2 Requirements and decisions that were mine

I decided the order stages, the Regular and Titan capacities and prices, which folding is included and which is optional, the add-on choices, payment history, and how outstanding balances work. I used these rules to check every AI suggestion and to test the deployed app. This is my design and checking work, not sole authorship of the code.
Related commit: https://github.com/rnzcrt/LaundryLog/commit/543a85667f7853f469b96ab889fa9387cbbfa9f5

### 3.3 The AI-written piece I understand best: `src/utils/orderWorkflow.js`

ChatGPT wrote this file (first added in `efcf044`, extended in `543a856`). It holds the rules for moving an order through the machine stages, and it checks everything before anything is written to the database.

- `requiredMachineKind` says which machine an order needs at each stage. Washing needs a washer for wash-and-fold or wash-only, and drying needs a dryer for wash-and-fold or dry-only.
- `validateMachineAssignments` checks the list of machines and weights. It rejects an empty list, the same machine twice, bad ids, and weights outside 0.01 to 100 kg or with more than two decimals. It converts weights to whole centi-kilograms and then checks that the loads add up exactly to the order weight.
- `validateCompletionChoices` makes staff choose at completion: add add-ons or explicitly skip them. It rejects "skip" with add-ons selected, "add" with none, duplicate add-ons, and quantities outside 1 to 100.

I kept it because the rules match how the shop works. Doing the checks in a plain utility before touching the database keeps the route code short and makes the rules easy to test.
Commits: https://github.com/rnzcrt/LaundryLog/commit/543a85667f7853f469b96ab889fa9387cbbfa9f5 (and `efcf044`)
