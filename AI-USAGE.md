# AI Usage — LaundryLog

This document records how I used AI assistance during LaundryLog planning, implementation, testing, troubleshooting, and documentation. It explains how AI contributed and what I reviewed or changed as the project author.

**Accuracy note:** The request descriptions below are concise summaries rather than verbatim prompts. I reviewed these entries against the conversation and project history available to me. Commit links identify related changes, but do not by themselves establish authorship of individual lines.

## 1. How I used AI

### 2026-09-27 — Load-based laundry pricing

- **Tool:** ChatGPT
- **Request summary:** Help implement pricing based on laundry service, machine type, and load requirements.
- **AI assistance:** Suggested a pricing utility and test cases for Regular and Titan washing, drying, and folding.
- **What I used and reviewed:** Pricing logic and related tests were added. I checked intended prices and load rules against the laundry shop's requirements.
- **Why:** To calculate order prices consistently based on service and machine requirements.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/275b930

### 2026-09-27 — Combined service pricing

- **Tool:** ChatGPT
- **Request summary:** Help calculate a total when an order includes more than one laundry service.
- **AI assistance:** Suggested combined-pricing logic and tests for single and combined services.
- **What I used and reviewed:** Combined pricing logic and tests were committed. I refined the pricing rules as the service model developed, including checking how folding is counted.
- **Why:** The total needed to reflect the selected services without charging incorrectly for included services.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/e893acd

### 2026-09-27 — Split-load planning

- **Tool:** ChatGPT
- **Request summary:** Help split an order's weight into loads that fit a machine's capacity.
- **AI assistance:** Suggested a load-splitting utility, an API endpoint for load plans, and tests for capacity limits and invalid input.
- **What I used and reviewed:** The load-planning approach, endpoint, and validation tests were incorporated. I checked expected load sizes against Regular and Titan machine capacities.
- **Why:** Staff need to divide heavier orders without exceeding machine capacity.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/aad890a

### 2026-09-28 — Order services and automatic pricing

- **Tool:** ChatGPT
- **Request summary:** Help support different laundry services, preserve older records, and calculate prices automatically.
- **AI assistance:** Suggested changes to service handling, validation, pricing, and tests.
- **What I used and reviewed:** Service and pricing changes were incorporated, with attention to keeping legacy records readable. I checked the changes against the service options and order workflow.
- **Why:** New service options needed to work without losing compatibility with existing data.
- **Related commits:**
  - https://github.com/rnzcrt/LaundryLog/commit/29f0e8e
  - https://github.com/rnzcrt/LaundryLog/commit/ac9075b

### 2026-09-28 — Payment status and outstanding balance

- **Tool:** ChatGPT
- **Request summary:** Help track how much an order has been paid and how much remains due.
- **AI assistance:** Suggested backend and interface changes for payment status and outstanding balance.
- **What I used and reviewed:** Payment and balance functionality was added. I reviewed it in the context of how staff record payments and check what is still owed.
- **Why:** Staff need to identify unpaid, partially paid, and fully paid orders.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/74ef47b

### 2026-09-30 — Split payments and payment history

- **Tool:** ChatGPT
- **Request summary:** Help support multiple payment transactions for one order while keeping payment history.
- **AI assistance:** Suggested database and API changes for split payments and payment records.
- **What I used and reviewed:** Split-payment support and payment history were implemented. I checked that partial payments were represented as separate transactions.
- **Why:** New partial payments should not replace or erase earlier payment records.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/411469c

### 2026-09-30 — Sales and collections reporting

- **Tool:** ChatGPT
- **Request summary:** Help distinguish order value from money collected and display reporting totals.
- **AI assistance:** Suggested a reporting endpoint, interface changes, and tests for sales and collections.
- **What I used and reviewed:** Reporting was added to distinguish sales from collected payments. I checked the feature against order and payment records.
- **Why:** Order value and money actually received are different measures.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/2151657

### 2026-09-30 — Customer and inventory interface

- **Tool:** ChatGPT
- **Request summary:** Help improve how customer and inventory information is displayed and managed.
- **AI assistance:** Suggested interface and styling changes for customer and inventory tables.
- **What I used and reviewed:** Table redesign changes were committed. I reviewed the interface against the information staff need to browse and manage.
- **Why:** Clearer tables make customer and stock records easier to browse.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/bb591f0

### 2026-10-01 — Order workflow and add-on catalog

- **Tool:** ChatGPT
- **Request summary:** Help improve order stages, machine assignment, completion add-ons, inventory validation, and test reliability.
- **AI assistance:** Suggested backend workflow validation, frontend changes, add-on catalog updates, migration changes, and tests.
- **What I used and reviewed:** Workflow and catalog changes were committed. I applied the required catalog migration to the production database and checked the deployed app after it appeared.
- **Why:** The app needed consistent workflow rules, validated catalog choices, and reliable tests across environments.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/543a85667f7853f469b96ab889fa9387cbbfa9f5

### 2026-10-03 — README organization and setup instructions

- **Tool:** ChatGPT
- **Request summary:** Organize and finish the README as a step-by-step guide.
- **AI assistance:** Drafted a reorganized README covering overview, local setup, app workflow, API, project structure, screenshots, deployment, security, limitations, AI use, and license.
- **What I used and reviewed:** The README was updated in the repository. I reviewed the structure and checked it against the project details available to me.
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
- **What was wrong or unsuitable:** The mockup images were stored under `docs/assets/`, while the earlier paths pointed to a different assets-folder location. Those references would not resolve correctly from the documented file location.
- **What I did instead:** I used the actual `docs/assets/` folder structure when organizing the screenshot and mockup references.
- **How I checked it:** I compared the paths with the project folder structure. The exact existence of every referenced image still needs a final check before submission.
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

### My contribution — Requirements and acceptance testing

- **Feature area:** Laundry order workflow, pricing rules, machine capacity, payment handling, and completion add-ons.
- **My contribution:** I specified the expected order stages, Regular and Titan machine capacities and prices, included versus optional folding, supported add-on choices, and how payments and outstanding balances should behave. I used those requirements to review the implementation and identify what needed to work in the deployed app.
- **How it works:** These requirements define expected behavior from order creation through machine processing and completion. They also define how service and machine choices affect prices, how partial payments affect the remaining balance, and which optional products or services can be added.
- **How I verified it:** I reviewed the workflow and pricing behavior, ran project checks and tests during development, checked the deployed order flow, and confirmed the add-on catalog appeared after applying the production migration.
- **Related files:** src/utils/orderWorkflow.js, pricing and order route logic, add-on catalog validation, and related tests. These files were AI-assisted; this entry describes my requirements, decisions, review, and verification rather than claiming sole authorship of their code.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/543a85667f7853f469b96ab889fa9387cbbfa9f5

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
- [ ] Re-read src/utils/orderWorkflow.js and practice explaining it in my own words.
- [ ] Confirm every referenced mockup image exists in docs/assets/.
- [ ] Recheck the README setup commands and API paths against the current repository before submission.
- [ ] Make any final edits needed so every statement matches my own experience.
