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

### Case 3 — The deployed add-on catalog needed a separate database migration

- **Tool:** ChatGPT
- **Request:** Help update the completion add-on catalog and its database migration.
- **What the AI-assisted change produced:** The code and migration for the updated add-on catalog were committed, but the deployed application did not show the new catalog until the production database migration was applied.
- **What was incomplete:** Deploying the application code did not, by itself, update the existing production database. The database needed the migration run separately.
- **What I did instead:** I applied migration 011_completion_addon_catalog.sql to the production database using the migration process, then refreshed the deployed app and checked that the add-ons appeared.
- **How I checked it:** The migration runner reported that migration 011 was applied and completed; I then confirmed the catalog appeared in the deployed app.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/543a85667f7853f469b96ab889fa9387cbbfa9f5

## 3. Who wrote what

I contributed by defining the laundry shop's operational requirements, making decisions about how the application should behave, reviewing AI-assisted changes, testing features, and checking the deployed system. AI helped generate and revise code and documentation, so I do not claim every line in the related commits was written manually by me.

### My contribution — Basic authentication middleware

- **Feature area:** Protecting the staff-facing app and API with configured Basic Authentication.
- **My contribution:** I wrote and substantially implemented the Basic Authentication middleware in `src/middleware/basicAuth.js`, including reading configured credentials, handling missing or malformed Authorization headers, returning authentication challenges for rejected requests, and allowing valid requests to continue. This is my code contribution; the related commit records when the feature was added, not proof of who authored each line.
- **How it works:** The middleware reads `APP_AUTH_USER` and `APP_AUTH_PASSWORD`, parses the Basic Authorization header, separates username and password at the first colon, and compares both values using a timing-safe comparison helper. If credentials are missing from configuration, it returns an error instead of allowing unauthenticated access. Otherwise, it calls `next()` only after both values match.
- **Why I implemented it:** LaundryLog is intended for shop staff, so the staff interface and API needed a simple access gate configured outside the source code.
- **How I verified it:** I reviewed the middleware behavior and its integration in `src/app.js`; the repository also contains automated API validation tests. Only describe additional manual test cases here if I personally ran them.
- **Related files:** `src/middleware/basicAuth.js`, `src/app.js`, `.env.example`, and the API test setup.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/685d9fa1

### AI-assisted part I understand best — Order workflow validation

- **File:** src/utils/orderWorkflow.js
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/543a85667f7853f469b96ab889fa9387cbbfa9f5
- **What the code does:** This utility provides three workflow-related functions:
  - requiredMachineKind(loadType, destination) identifies whether a washer or dryer is required for a supported load type and destination stage.
  - validateMachineAssignments(assignments, totalWeightKg) checks the assignment list, machine IDs, duplicate assignments, valid load weights, and whether assigned weights add up to the order's total weight.
  - validateCompletionChoices(body) checks whether add-ons were selected or explicitly skipped, and validates add-on IDs and quantities.
- **What AI contributed:** ChatGPT assisted with the workflow implementation and related backend, interface, and test changes.
- **What I reviewed or changed:** I defined the required order stages and operational rules, then reviewed the implementation against the laundry process. I checked that workflow enforcement belonged on the backend and reviewed related tests and deployed behavior. I can explain the three functions above using the current source file.

---

## Final review before submission

- [x] Review the entries against the conversation and project history available to me.
- [x] Keep summarized requests labelled as summaries rather than presenting them as exact quotations.
- [x] Link entries to related project commits.
- [x] Describe my contribution as requirements, decisions, review, testing, and deployment verification without claiming sole authorship of AI-assisted code.
- [x] Identify an AI-assisted file and summarize its current functions.
- [ ] Re-read src/middleware/basicAuth.js and src/utils/orderWorkflow.js and practice explaining them in my own words.
- [x] Check the mockup image references against docs/assets/; note that mockup-order-list-empty.png is still missing.
- [ ] Recheck the README setup commands and API paths against the current repository before submission.
- [ ] Make any final edits needed so every statement matches my own experience.
