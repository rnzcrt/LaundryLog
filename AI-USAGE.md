
# AI Usage — LaundryLog

This document records AI assistance during planning, implementation, testing support, troubleshooting, and documentation. Request summaries are not verbatim prompts. Related commits identify changes but do not establish authorship of every line.

## 1. AI assistance log

### 2026-09-27 — Load-based laundry pricing
- **Tool:** ChatGPT
- **Request:** Help price laundry by service, machine type, and load requirements.
- **Assistance:** Suggested pricing utility and Regular/Titan test cases.
- **My review:** Checked prices and load rules against requirements.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/275b930

### 2026-09-27 — Combined service pricing
- **Tool:** ChatGPT
- **Request:** Calculate totals for orders with multiple services.
- **Assistance:** Suggested combined-pricing logic and tests.
- **My review:** Refined service rules and checked that included folding was not charged twice.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/e893acd

### 2026-09-27 — Split-load planning
- **Tool:** ChatGPT
- **Request:** Split order weight into loads that respect machine capacity.
- **Assistance:** Suggested utility, API endpoint, and validation tests.
- **My review:** Checked Regular 8 kg and Titan 10 kg capacity rules.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/aad890a

### 2026-09-28 — Services, automatic pricing, and older records
- **Tool:** ChatGPT
- **Request:** Support service options, automatic pricing, and compatibility with existing records.
- **Assistance:** Suggested service handling, validation, pricing, and tests.
- **My review:** Checked service options and older-record compatibility.
- **Commits:** https://github.com/rnzcrt/LaundryLog/commit/29f0e8e ; https://github.com/rnzcrt/LaundryLog/commit/ac9075b

### 2026-09-28 — Payment status and balance
- **Tool:** ChatGPT
- **Request:** Track amount paid and amount still due.
- **Assistance:** Suggested backend and interface changes.
- **My review:** Reviewed unpaid, partially paid, and paid scenarios.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/74ef47b

### 2026-09-30 — Split payments and payment history
- **Tool:** ChatGPT
- **Request:** Support multiple transactions for one order.
- **Assistance:** Suggested database/API changes for payment records.
- **My review:** Checked that each partial payment remains a separate transaction.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/411469c

### 2026-09-30 — Sales and collections reporting
- **Tool:** ChatGPT
- **Request:** Distinguish order value from money collected.
- **Assistance:** Suggested reporting endpoint, interface changes, and tests.
- **My review:** Checked that sales and collections represent different measures.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/2151657

### 2026-09-30 — Customer and inventory interface
- **Tool:** ChatGPT
- **Request:** Improve customer and inventory data presentation.
- **Assistance:** Suggested table and styling changes.
- **My review:** Checked the displayed information against staff tasks.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/bb591f0

### 2026-10-01 — Workflow and add-on catalog
- **Tool:** ChatGPT
- **Request:** Improve workflow, machine assignment, completion add-ons, inventory validation, and tests.
- **Assistance:** Suggested backend/frontend changes, catalog migration, and tests.
- **My review:** Reviewed workflow and catalog behavior, applied the required catalog migration separately to production, refreshed the deployed app, and checked that add-ons appeared.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/543a85667f7853f469b96ab889fa9387cbbfa9f5

### 2026-10-03 — Backend refactor and code review
- **Tool:** Claude (Anthropic)
- **Request:** Review and refactor backend code from a supplied repository ZIP.
- **Assistance:** Proposed decomposing the order-status handler in `src/routes/orders.js`, using transaction helpers for machine-load routes, simplifying `src/middleware/basicAuth.js`, improving JSON error responses in `src/middleware/errorHandler.js`, correcting a query that omitted the machine name, and preparing `REVIEW.md`.
- **My implementation:** I implemented changes in `src/routes/orders.js`, `src/middleware/basicAuth.js`, and `src/middleware/errorHandler.js`, with a related update to `test/security.test.js`, then reviewed the changes against intended behavior.
- **Testing:** An earlier review separately reported `scripts/check.js` and 29 selected tests passing, and all eight order routes loading/registering. A later full test run reported 70 tests: 55 passed, 0 failed, and 15 skipped. Skipped tests are not passing tests. PostgreSQL integration coverage remains unverified unless those tests are run with a configured disposable test database.
- **Commit:** The refactor and related test updates were committed and pushed to the repository's `main` branch on October 3, 2026.
- **Commit URL:** https://github.com/rnzcrt/LaundryLog/commit/685dd127a0455ea201b3768b44e93e4e8a2ef3ee

### 2026-10-03 — README organization
- **Tool:** ChatGPT
- **Request:** Organize the README as a clear setup and usage guide.
- **Assistance:** Drafted/reorganized overview, setup, workflow, API, structure, screenshots, deployment, security, limitations, and license.
- **My review:** Checked the order and project-specific instructions. I added a Google Drive folder link for the demo; the recording's availability and instructor access should still be verified.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/c404665535130bd3eb3a30efaff4bc30804833d6

## 2. AI errors or unsuitable suggestions

### Case 1 — Duplicated and out-of-order README
- **Tool:** ChatGPT
- **Issue:** An earlier draft repeated setup content and placed technical/documentation sections after the License.
- **Correction:** I requested a step-by-step organization and reviewed the resulting order.
- **Check:** Reviewed the updated README in the repository.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/c404665535130bd3eb3a30efaff4bc30804833d6

### Case 2 — Mockup asset paths
- **Tool:** ChatGPT
- **Issue:** An earlier mockup-document draft used paths inconsistent with the repository. Assets are stored in `docs/assets/`; `../assets/...` from `docs/02-mockup.md` resolves there. `mockup-order-list-empty.png` was referenced but absent from the checked asset set.
- **Correction:** I aligned references with the actual `docs/assets/` structure.
- **Check:** Compared document references with the asset directory. The missing image reference still needs to be removed or the asset supplied.
- **Related change:** https://github.com/rnzcrt/LaundryLog/commit/c404665535130bd3eb3a30efaff4bc30804833d6

### Case 3 — UI suggestion did not fit the existing frontend
- **Tool:** ChatGPT
- **Issue:** A suggested Kanban/add-on/service UI did not fit the existing HTML structure and JavaScript.
- **Correction:** I adjusted the layout to fit the existing frontend rather than applying the suggestion unchanged.
- **Check:** Project notes confirm the mismatch and adjustment but do not identify exact conflicting elements or a separate test/commit. No specific test result or commit is claimed.

## 3. My contributions and understanding

AI assisted with code and documentation. I supplied operational requirements, made implementation decisions, reviewed outputs, tested features, and checked deployed behavior. I do not claim every line in related commits was written manually by me.

### Backend refactor I implemented

The following backend changes were personally implemented by me. Claude provided refactoring and review assistance, but I wrote and implemented the final changes described here. The refactor and related test updates were committed and pushed to the repository's `main` branch on October 3, 2026.

- **`src/routes/orders.js`:** Refactored the long status handler into smaller operations; organized machine assignment, queued washer-load startup, load assignment, dryer completion, and completion add-on logic; used `db.withTransaction` for machine-load transactions; and extracted repeated centi-kilogram conversion logic.
- **`src/middleware/basicAuth.js`:** Consolidated unauthorized responses, removed an unnecessary `try/catch` around `Buffer.from`, and ensured both credential comparisons are performed.
- **`src/middleware/errorHandler.js`:** Made malformed JSON return HTTP `400` and oversized request bodies return HTTP `413`.
- **`test/security.test.js`:** Updated related security tests.

**Related commit:** https://github.com/rnzcrt/LaundryLog/commit/685dd127a0455ea201b3768b44e93e4e8a2ef3ee

**Latest test run:** 70 total, 55 passed, 0 failed, and 15 skipped. Skipped tests are not counted as passed. PostgreSQL integration tests require a configured disposable test database; no claim is made that database integration passed without that run.

### Requirements and acceptance testing

I defined and reviewed order stages, Regular/Titan capacities and prices, included versus optional folding, add-on choices, payment history, and outstanding balances. I used these requirements to review implementation and deployed order flow and checked that add-ons appeared after the production migration. Related code includes `src/utils/orderWorkflow.js`, pricing/order routes, add-on validation, and tests. This describes my requirements, decisions, review, and verification, not sole authorship of AI-assisted code.

**Related commit:** https://github.com/rnzcrt/LaundryLog/commit/543a85667f7853f469b96ab889fa9387cbbfa9f5

### Additional modifications and technical understanding

- **`src/db.js`:** Modified database utilities. The file configures the PostgreSQL pool from `DATABASE_URL`, provides parameterized queries, and offers a transaction helper that commits on success, rolls back on error, and releases the client. No isolated commit identified.
- **`public/index.html` (lines 1–280):** Modified page structure for navigation, dashboard/order list, customer and inventory forms, machine/add-on sections, and reports. I understand that IDs/classes connect HTML elements to frontend JavaScript. No isolated commit identified.
- **`public/app.js` (lines 1–60):** Modified service/status labels, allowed next statuses, DOM references, and a detail-section helper. No isolated commit identified.
- **`src/server.js`:** Adapted graceful-shutdown guidance from [GeeksforGeeks](https://www.geeksforgeeks.org/system-design/graceful-shutdown-in-distributed-systems-and-microservices/) and [DEV Community](https://dev.to/cliffdoyle/a-guide-to-graceful-shutdowns-40mi). The shutdown closes the HTTP server, ends the PostgreSQL pool, and handles `SIGINT`/`SIGTERM`. This is adapted work, not an original invention; no isolated commit identified.
- **Basic Auth middleware:** I understand that it reads server-side credentials, validates the Basic Auth header, allows valid requests to continue with `next()`, and rejects invalid credentials.
- **Order workflow utility (`src/utils/orderWorkflow.js`):** I understand that it centralizes workflow rules, machine-stage requirements, machine assignment and weight validation, and completion add-on checks before database operations.