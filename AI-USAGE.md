# AI Usage — LaundryLog

This document records how I used AI assistance during LaundryLog planning, implementation, testing, troubleshooting, and documentation. It explains how AI contributed and what I reviewed or changed as the project author.

**Accuracy note:** The request descriptions below are concise summaries rather than verbatim prompts. I reviewed these entries against the conversation and project history available to me. Commit links identify related changes, but do not by themselves establish authorship of individual lines.

## 1. How I used AI

### 2026-09-27 — Load-based laundry pricing

- **Tool:** ChatGPT
- **Request summary:** Help implement pricing based on laundry service, machine type, and load requirements.
- **AI assistance:** Suggested a pricing utility and test cases for Regular and Titan washing, drying, and folding.
- **What I kept:** The service-and-machine pricing approach and tests covering Regular and Titan washing, drying, and folding.
- **What I changed or checked:** I checked the prices and load rules against the shop's requirements instead of accepting suggested values without review.
- **Why:** To calculate order prices consistently based on service and machine requirements.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/275b930

### 2026-09-27 — Combined service pricing

- **Tool:** ChatGPT
- **Request summary:** Help calculate a total when an order includes more than one laundry service.
- **AI assistance:** Suggested combined-pricing logic and tests for single and combined services.
- **What I kept:** The combined-service calculation and tests for single and combined services.
- **What I changed or checked:** I refined the rules as the service model developed and specifically checked how folding is counted so it is not charged incorrectly.
- **Why:** The total needed to reflect the selected services without charging incorrectly for included services.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/e893acd

### 2026-09-27 — Split-load planning

- **Tool:** ChatGPT
- **Request summary:** Help split an order's weight into loads that fit a machine's capacity.
- **AI assistance:** Suggested a load-splitting utility, an API endpoint for load plans, and tests for capacity limits and invalid input.
- **What I kept:** The load-planning utility, API endpoint, and validation tests for capacity limits and invalid input.
- **What I changed or checked:** I checked that planned loads respect the stated Regular (8 kg) and Titan (10 kg) capacities.
- **Why:** Staff need to divide heavier orders without exceeding machine capacity.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/aad890a

### 2026-09-28 — Order services and automatic pricing

- **Tool:** ChatGPT
- **Request summary:** Help support different laundry services, preserve older records, and calculate prices automatically.
- **AI assistance:** Suggested changes to service handling, validation, pricing, and tests.
- **What I kept:** The service handling, automatic price calculation, and compatibility handling for older records.
- **What I changed or checked:** I reviewed the service options and order workflow and checked that existing records remained readable.
- **Why:** New service options needed to work without losing compatibility with existing data.
- **Related commits:**
  - https://github.com/rnzcrt/LaundryLog/commit/29f0e8e
  - https://github.com/rnzcrt/LaundryLog/commit/ac9075b

### 2026-09-28 — Payment status and outstanding balance

- **Tool:** ChatGPT
- **Request summary:** Help track how much an order has been paid and how much remains due.
- **AI assistance:** Suggested backend and interface changes for payment status and outstanding balance.
- **What I kept:** The payment-status and outstanding-balance behavior across backend and interface changes.
- **What I changed or checked:** I reviewed the unpaid, partially paid, and paid cases against how staff record payments and identify remaining amounts.
- **Why:** Staff need to identify unpaid, partially paid, and fully paid orders.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/74ef47b

### 2026-09-30 — Split payments and payment history

- **Tool:** ChatGPT
- **Request summary:** Help support multiple payment transactions for one order while keeping payment history.
- **AI assistance:** Suggested database and API changes for split payments and payment records.
- **What I kept:** The separate payment-transaction records and payment-history support.
- **What I changed or checked:** I checked the partial-payment flow to ensure a new payment is recorded as another transaction rather than replacing the earlier payment.
- **Why:** New partial payments should not replace or erase earlier payment records.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/411469c

### 2026-09-30 — Sales and collections reporting

- **Tool:** ChatGPT
- **Request summary:** Help distinguish order value from money collected and display reporting totals.
- **AI assistance:** Suggested a reporting endpoint, interface changes, and tests for sales and collections.
- **What I kept:** The reporting endpoint, interface, and tests distinguishing order sales from collected payments.
- **What I changed or checked:** I reviewed the totals against the distinction between an order's value and money actually received.
- **Why:** Order value and money actually received are different measures.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/2151657

### 2026-09-30 — Customer and inventory interface

- **Tool:** ChatGPT
- **Request summary:** Help improve how customer and inventory information is displayed and managed.
- **AI assistance:** Suggested interface and styling changes for customer and inventory tables.
- **What I kept:** The customer and inventory table redesign and its styling changes.
- **What I changed or checked:** I reviewed the displayed information against staff tasks for browsing customer records and managing stock.
- **Why:** Clearer tables make customer and stock records easier to browse.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/bb591f0

### 2026-10-01 — Order workflow and add-on catalog

- **Tool:** ChatGPT
- **Request summary:** Help improve order stages, machine assignment, completion add-ons, inventory validation, and test reliability.
- **AI assistance:** Suggested backend workflow validation, frontend changes, add-on catalog updates, migration changes, and tests.
- **What I kept:** Backend workflow validation, frontend workflow changes, add-on catalog updates, and related tests.
- **What I changed or checked:** I applied the required catalog migration to the production database separately, then refreshed the deployed app and checked that the add-ons appeared.
- **Why:** The app needed consistent workflow rules, validated catalog choices, and reliable tests across environments.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/543a85667f7853f469b96ab889fa9387cbbfa9f5

### 2026-10-03 — Backend refactor and code review

- **Tool:** Claude (Anthropic)
- **Request summary:** I requested a readability refactor and code review of the backend and provided the repository as a ZIP archive.
- **AI assistance:** Claude proposed a decomposition of the long order-status handler in `src/routes/orders.js`, transaction-helper use for two machine-load routes, simplification of `src/middleware/basicAuth.js`, improved JSON error responses in `src/middleware/errorHandler.js`, a correction to a query that omitted the machine name, and consistent quote style. It also prepared `REVIEW.md` with additional findings.
- **What I implemented:** I personally implemented the backend changes in `src/routes/orders.js`, `src/middleware/basicAuth.js`, and `src/middleware/errorHandler.js`, using the review/refactoring work as guidance. I reviewed the resulting code and retained the changes that matched the intended behavior.
- **What I checked:** The review record reports that `scripts/check.js` and 29 selected tests passed, and that all eight order routes loaded and registered. The PostgreSQL integration suite in `test/orders.test.js` was not run because a configured test database was unavailable at that time. I therefore do not claim that the full integration suite passed.
- **Why:** To make the backend easier to read and maintain, reduce repeated logic, and return more appropriate errors for malformed or oversized JSON requests.
- **Related code changes:** The refactored source is present in the project ZIP I reviewed, but it is not yet present on the repository's current `main` branch. I have not attached a commit link because the code has not been committed to GitHub yet.

### 2026-10-03 — README organization and setup instructions

- **Tool:** ChatGPT
- **Request summary:** Organize and finish the README as a step-by-step guide.
- **AI assistance:** Drafted a reorganized README covering overview, local setup, app workflow, API, project structure, screenshots, deployment, security, limitations, AI use, and license.
- **What I kept:** The reorganized overview, setup sequence, workflow, API, project structure, screenshots, deployment, security, limitations, and license sections.
- **What I changed or checked:** I reviewed the section order and checked the content against the project details available to me; I left the demo-video link as a reminder because a public recording link was not yet supplied.
- **Why:** Readers should be able to understand the project and follow setup and usage instructions in order.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/c404665535130bd3eb3a30efaff4bc30804833d6

## 2. Where the AI got it wrong or gave unsuitable output

These examples are based on issues visible in the project work and conversation. They describe incomplete or mismatched AI-assisted outputs and the corrections made.

### Case 1 — README content was duplicated and out of order

- **Tool:** ChatGPT
- **Request:** Help prepare the LaundryLog README using the project details and README template.
- **What the AI produced:** An earlier README draft repeated local setup material, and some API, setup, and documentation sections appeared after the License section.
- **What was wrong or unsuitable:** The repeated and misplaced sections made the README difficult to follow and did not provide a clear reading order.
- **What I did instead:** I asked for the README to be reorganized as a step-by-step process, then reviewed and updated the file so the overview, setup, application usage, technical details, and license appeared in a logical order.
- **How I checked it:** I reviewed the resulting README in the repository and confirmed the update was saved.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/c404665535130bd3eb3a30efaff4bc30804833d6

### Case 2 — Mockup image paths did not match the folder structure

- **Tool:** ChatGPT
- **Request summary:** Help document the LaundryLog mockups and design references.
- **What the AI produced:** An earlier mockup-document draft used image paths that did not match the project's actual asset location.
- **What was wrong or unsuitable:** The actual images are stored in `docs/assets/`; the earlier generic `assets/` instruction did not match the repository layout. The later `docs/02-mockup.md` references use `../assets/...`, which resolves to `docs/assets/` from that document.
- **What I did instead:** I used the actual `docs/assets/` folder structure when organizing the screenshot and mockup references.
- **How I checked it:** I checked the current `docs/02-mockup.md` references against the `docs/assets/` directory. The ten referenced image files are present, but `mockup-order-list-empty.png` is still referenced in the document and is not among those assets, so that image remains missing.
- **Related change:** README organization commit https://github.com/rnzcrt/LaundryLog/commit/c404665535130bd3eb3a30efaff4bc30804833d6

### Case 3 — Suggested UI did not fit the existing frontend code

- **Tool:** ChatGPT
- **Request summary:** Help with the user interface for the Kanban board, add-ons, and services.
- **What the AI suggested:** The AI proposed UI changes for these areas, but the suggested implementation did not fit the HTML structure and JavaScript already used in LaundryLog.
- **What was wrong or unsuitable:** Applying the suggestion as-is would not align with the existing frontend code and its structure.
- **What I did instead:** I adjusted the layout to match the existing HTML and JavaScript rather than adopting the suggested UI unchanged.
- **How I checked it:** This entry records the mismatch and layout adjustment I recall. I am not claiming a specific test result or a separate commit for this correction because I have not identified one.
- **Accuracy note:** The available details establish a mismatch with the existing frontend structure, but do not specify the exact elements or code that conflicted. This description therefore stays at the UI/layout level.
- **Related commit:** No specific commit identified.


## 3. Who wrote what

I contributed by defining the laundry shop's operational requirements, making decisions about how the application should behave, reviewing AI-assisted changes, testing features, and checking the deployed system. AI helped generate and revise code and documentation, so I do not claim every line in the related commits was written manually by me.

### Parts I personally implemented

The following backend changes were personally implemented by me. Claude provided refactoring/review assistance, but I wrote and implemented the final changes described here. These changes are in my reviewed project ZIP, but have not yet been committed to the repository's current `main` branch, so no code commit link is claimed below.

#### 1. Order-status and machine-load route refactor

- **File:** `src/routes/orders.js`
- **My contribution:** I personally refactored the long order-status handler into smaller named helper functions and organized the machine assignment, queued washer-load startup, load assignment, dryer completion, and completion add-on charging logic into more focused operations. I also moved the machine-load transaction handling to the shared `db.withTransaction` helper and extracted repeated centi-kilogram conversion logic into a helper.
- **Why I implemented it this way:** Separating the operations makes the order workflow easier to follow, inspect, and maintain while keeping the intended database operation order.
- **How it was checked:** The review record reports that the project check and 29 selected tests passed and that all eight order routes loaded and registered. The PostgreSQL integration suite was not run, so full database integration remains unverified.

#### 2. Basic authentication middleware improvements

- **File:** `src/middleware/basicAuth.js`
- **My contribution:** I personally simplified the middleware by consolidating repeated unauthorized responses into a helper, removing an unnecessary `try/catch` around `Buffer.from`, and ensuring both credential comparisons are performed.
- **Why I implemented it this way:** Removing duplicated response logic makes the middleware easier to maintain and keeps authentication challenges consistent.
- **How it was checked:** The project check and selected tests are reported in the backend review; full PostgreSQL integration testing was not run.

#### 3. JSON error handling improvements

- **File:** `src/middleware/errorHandler.js`
- **My contribution:** I personally updated error handling so malformed JSON requests return HTTP `400` and oversized request bodies return HTTP `413`, instead of being treated as generic server errors.
- **Why I implemented it this way:** Appropriate status codes make it clearer when a request is invalid or too large, rather than indicating an internal server failure.
- **How it was checked:** The project check and selected tests are reported in the backend review. The PostgreSQL integration suite was not run.

#### 4. Requirements and acceptance testing

- **Feature area:** Laundry order workflow, pricing rules, machine capacity, payment handling, and completion add-ons.
- **My contribution:** I specified the expected order stages, Regular and Titan machine capacities and prices, included versus optional folding, supported add-on choices, and how payments and outstanding balances should behave. I used those requirements to review the implementation and identify what needed to work in the deployed app.
- **How it works:** These requirements define expected behavior from order creation through machine processing and completion. They also define how service and machine choices affect prices, how partial payments affect the remaining balance, and which optional products or services can be added.
- **How I verified it:** I reviewed the workflow and pricing behavior, ran project checks and tests during development, checked the deployed order flow, and confirmed the add-on catalog appeared after applying the production migration.
- **Related files:** `src/utils/orderWorkflow.js`, pricing and order route logic, add-on catalog validation, and related tests. These files were AI-assisted; this entry describes my requirements, decisions, review, and verification rather than claiming sole authorship of their code.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/543a85667f7853f469b96ab889fa9387cbbfa9f5

### Additional personal code modifications

The following are existing files that I modified. These notes describe my modifications, not authorship of every line in each file.

#### Database utilities

- **File:** `src/db.js`
- **My contribution:** I modified the database utility file. The current file configures the PostgreSQL connection pool from `DATABASE_URL`, logs unexpected idle-client errors, provides a parameterized `query(text, params)` helper, and provides `withTransaction(callback)` to run statements in a transaction with commit, rollback, and client release.
- **What I understand:** Parameterized query values are passed separately from SQL text. The transaction helper obtains a client, starts a transaction, commits if the callback succeeds, rolls back if it throws, and releases the client afterward.
- **Related commit:** I have not identified a specific commit that isolates my changes to this file, so I am not assigning a commit link here.

#### Frontend page structure

- **File:** `public/index.html` (lines 1–280)
- **My contribution:** I modified the first 280 lines of the existing HTML page. This portion includes the page header and navigation tabs, the dashboard and order-list area, inventory and customer forms, management sections for machines and add-ons, and the beginning of the reporting interface.
- **What I understand:** The HTML provides the page structure and element IDs/classes that the frontend JavaScript uses to locate forms, buttons, panels, and display areas. It also includes labels and native form controls for staff input.
- **Related commit:** I have not identified a specific commit that isolates my changes to this line range, so I am not assigning a commit link here.

#### Frontend JavaScript setup

- **File:** `public/app.js` (lines 1–60)
- **My contribution:** I modified the opening section of the existing frontend JavaScript. This portion defines labels for laundry load types and order statuses, maps allowed next statuses, retrieves key page elements by their IDs, and defines a helper to create detail sections.
- **What I understand:** The label maps keep user-facing status and service names consistent. The DOM references provide access to page elements, while `detailSection()` creates a section with a heading for order details.
- **Related commit:** I have not identified a specific commit that isolates my changes to this line range, so I am not assigning a commit link here.

#### Graceful server shutdown adapted from online references

- **File:** `src/server.js`
- **My contribution:** I searched online for graceful shutdown examples and adapted the approach for LaundryLog:
  - [GeeksforGeeks — Graceful Shutdown in Distributed Systems and Microservices](https://www.geeksforgeeks.org/system-design/graceful-shutdown-in-distributed-systems-and-microservices/)
  - [DEV Community — A Guide to Graceful Shutdowns](https://dev.to/cliffdoyle/a-guide-to-graceful-shutdowns-40mi)
- **What I changed:** I adapted the `shutdown(signal)` function to log the received signal, close the HTTP server, end the PostgreSQL pool with `pool.end()`, and exit the process. I also registered handlers for `SIGINT` and `SIGTERM`.
- **What I understand:** The handlers start a controlled shutdown when the process receives either signal. Closing the HTTP server stops it from accepting new connections and lets its close callback run before the database pool is ended.
- **Attribution:** This is researched and adapted code, not code I claim to have invented or written entirely from scratch.
- **Related commit:** I have not identified a specific commit that isolates this change, so I am not assigning a commit link here.

### Backend components I understand

**Basic Authentication Middleware (`src/middleware/basicAuth.js`)**

This middleware secures the LaundryLog API using HTTP Basic Authentication. It verifies that server-side credentials are configured, extracts and decodes the request's `Authorization` header, and compares the submitted username and password against the configured values. Valid credentials allow the request to proceed through `next()`, while invalid credentials return `401 Unauthorized`. If the server-side credentials are missing, it returns `500 Internal Server Error`.

**Order Workflow Utility (`src/utils/orderWorkflow.js`)**

The order workflow utility centralizes key business rules to maintain data integrity before database operations. It determines the required machine for each order stage, validates machine assignments and weight limits, and checks completion add-on selections. These validations help prevent invalid or incomplete order data from being processed.

- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/543a85667f7853f469b96ab889fa9387cbbfa9f5
- **AI contribution:** ChatGPT assisted with the order workflow utility and related backend, interface, and test changes. I defined the operational requirements and reviewed the implementation against the laundry process.

---

## Final review before submission

- [x] Review the entries against the conversation and project history available to me.
- [x] Keep summarized requests labelled as summaries rather than presenting them as exact quotations.
- [x] Link entries to related project commits.
- [x] Describe my contribution as requirements, decisions, review, testing, and deployment verification without claiming sole authorship of AI-assisted code.
- [x] Identify an AI-assisted file and summarize its current functions.
- [x] Identify personally implemented backend changes separately from AI-assisted workflow code.
- [x] Record the available check/test results without claiming the unrun PostgreSQL integration suite passed.
- [x] Check the mockup image references against docs/assets/; note that mockup-order-list-empty.png is still missing.
- [ ] Re-read src/middleware/basicAuth.js and src/utils/orderWorkflow.js and practice explaining them in my own words.
- [x] Compare README setup commands with `package.json` scripts and Node.js engine requirement; compare documented API route families with the current route files. Exact request and response schemas still require checking against route implementations.
- [ ] If the reviewed backend refactor is later committed to GitHub, add its real commit link to the October 3 entry.
- [ ] Confirm that Case 3 is acceptable for the rubric, because it documents a deployment gap but not a verified incorrect AI suggestion.
- [ ] Recheck that the descriptions of my modifications to `src/db.js`, `public/index.html`, `public/app.js`, and `src/server.js` match the changes I personally made.
- [ ] Make any final edits needed so every statement matches my own experience.
