# AI Usage — LaundryLog

This project was built with AI assistance. I used ChatGPT during planning, implementation, debugging, testing, and documentation. This file summarizes the assistance and links it to related commits. The entries below are reconstructed from the project history and should be reviewed and edited to reflect my actual prompts, decisions, and contributions.

## 1. How I used AI

### 2026-09-27 — Load-based laundry pricing

* **Tool:** ChatGPT
* **What I asked for:** Help implementing pricing based on laundry service, machine type, and number of loads.
* **What it gave back:** A pricing utility and test cases for Regular and Titan washing, drying, and folding.
* **What I kept, what I changed, and why:** The pricing utility and related tests were committed. I reviewed the values against the project's intended service prices. I should confirm the final pricing behavior against the current implementation.
* **Commit:** https://github.com/rnzcrt/LaundryLog/commit/275b930

### 2026-09-27 — Combined service pricing

* **Tool:** ChatGPT
* **What I asked for:** Help calculating a total when an order includes more than one service.
* **What it gave back:** A combined pricing function and tests for single-service and combined-service orders.
* **What I kept, what I changed, and why:** The combined pricing logic and tests were added. The pricing rules were later refined to reflect the project's actual service model.
* **Commit:** https://github.com/rnzcrt/LaundryLog/commit/e893acd

### 2026-09-27 — Split-load planning

* **Tool:** ChatGPT
* **What I asked for:** Help planning how to divide an order's weight into loads that fit the selected machine's capacity.
* **What it gave back:** A load-splitting utility, an API endpoint for load plans, and tests for different capacities and invalid input.
* **What I kept, what I changed, and why:** The load-splitting approach and validation tests were included. The resulting load weights make it easier to plan machine assignments without exceeding capacity.
* **Commit:** https://github.com/rnzcrt/LaundryLog/commit/aad890a

### 2026-09-28 — Order services and automatic pricing

* **Tool:** ChatGPT
* **What I asked for:** Help supporting different laundry service selections, preserving older records, and calculating order prices automatically.
* **What it gave back:** Suggested changes to service handling, validation, pricing, and tests.
* **What I kept, what I changed, and why:** The service and pricing updates were incorporated and tested. Legacy records needed to remain readable, so the implementation had to account for existing data as well as new orders.
* **Commit:** https://github.com/rnzcrt/LaundryLog/commit/29f0e8e
  Related commit: https://github.com/rnzcrt/LaundryLog/commit/ac9075b

### 2026-09-28 — Payment status and outstanding balance

* **Tool:** ChatGPT
* **What I asked for:** Help tracking how much an order has been paid and how much remains outstanding.
* **What it gave back:** Backend and interface changes for payment status and outstanding balance.
* **What I kept, what I changed, and why:** The payment and balance functionality was added to the order workflow. I reviewed it in the context of the existing order data and payment process.
* **Commit:** https://github.com/rnzcrt/LaundryLog/commit/74ef47b

### 2026-09-30 — Split payments and payment history

* **Tool:** ChatGPT
* **What I asked for:** Help allowing customers to pay an order in multiple transactions while retaining payment history.
* **What it gave back:** Database and API changes to support split payments and payment records.
* **What I kept, what I changed, and why:** The split-payment approach and payment history were implemented so partial payments could be tracked without losing previous transactions.
* **Commit:** https://github.com/rnzcrt/LaundryLog/commit/411469c

### 2026-09-30 — Sales and collections reporting

* **Tool:** ChatGPT
* **What I asked for:** Help distinguishing order sales from money actually collected and displaying reporting totals.
* **What it gave back:** A reporting endpoint, interface changes, and tests for sales and collections.
* **What I kept, what I changed, and why:** The reporting feature was added to distinguish completed sales from payments received. I reviewed the calculations against the application's order and payment records.
* **Commit:** https://github.com/rnzcrt/LaundryLog/commit/2151657

### 2026-09-30 — Customer and inventory interface

* **Tool:** ChatGPT
* **What I asked for:** Help improving how customer and inventory information is displayed and managed.
* **What it gave back:** Interface and styling changes for customer and inventory tables.
* **What I kept, what I changed, and why:** The redesigned tables were included to make records easier to browse and manage. I reviewed the interface against the application's actual workflows.
* **Commit:** https://github.com/rnzcrt/LaundryLog/commit/bb591f0

### 2026-10-01 — Order workflow and add-on catalog

* **Tool:** ChatGPT
* **What I asked for:** Help improving the order stages, machine assignment flow, completion add-ons, inventory validation, and test reliability.
* **What it gave back:** Suggested backend workflow validation, frontend changes, add-on catalog updates, migration changes, and tests.
* **What I kept, what I changed, and why:** The changes were incorporated into the order workflow and add-on catalog. The production database needed the migration applied for the new catalog to appear. I reviewed the deployed application after the migration.
* **Commit:** https://github.com/rnzcrt/LaundryLog/commit/543a85667f7853f469b96ab889fa9387cbbfa9f5

## 2. Where the AI got it wrong

**Replace these prompts with three genuine cases from your own experience.** The examples below are reminders of areas to inspect, not claims that these mistakes definitely occurred. Only keep a case if it accurately describes an AI suggestion you received and how you corrected it.

### Case 1 — Pricing assumptions

* **What it gave me:** *Describe the specific pricing logic or code suggested by AI.*
* **What was wrong with it:** *Explain exactly how the suggestion differed from the pricing rules you intended, if this happened.*
* **What I did instead:** *Describe the change you made and how you checked the result.*
* **Commit:** https://github.com/rnzcrt/LaundryLog/commit/275b930

### Case 2 — Workflow or machine assignment

* **What it gave me:** *Describe a specific incorrect or incomplete workflow or machine-assignment suggestion, if applicable.*
* **What was wrong with it:** *Explain the actual issue, such as a transition or capacity rule it failed to handle.*
* **What I did instead:** *Describe your correction and how you tested it.*
* **Commit:** https://github.com/rnzcrt/LaundryLog/commit/efcf044

### Case 3 — Documentation or deployment

* **What it gave me:** *Describe a specific inaccurate README, setup, security, or deployment suggestion, if applicable.*
* **What was wrong with it:** *Explain which part did not match the actual repository or deployment.*
* **What I did instead:** *Describe how you verified and corrected the documentation or configuration.*
* **Commit:** https://github.com/rnzcrt/LaundryLog/commit/543a85667f7853f469b96ab889fa9387cbbfa9f5

## 3. Who wrote what

The commit history shows changes associated with my GitHub account, but that alone does not establish which lines were written by me or generated with AI. The sections below are a starting point. I need to confirm them based on my actual work and ability to explain the code.

### Written by me

* **File:** `*Add a file or feature you personally wrote or substantially implemented.*`
* **Commit:** `*Add the relevant commit URL.*`
* **What it does and why it is built this way:** Explain the code in your own words. Describe its inputs, outputs, key decisions, and how you tested it. Be specific about the part you personally wrote and understand.

### The AI-written part I understand best

* **File:** `src/utils/orderWorkflow.js` *(confirm this is the file you want to discuss)*
* **Commit:** https://github.com/rnzcrt/LaundryLog/commit/543a85667f7853f469b96ab889fa9387cbbfa9f5
* **What it does and why we kept it:** This utility supports the application's order-stage rules. The workflow moves an order through Waiting, Washing, Drying, Folding, Ready, and Completed, and validates whether a requested status change is allowed. Keeping workflow rules in a shared utility helps the backend apply consistent checks instead of relying only on the interface. I should be able to explain the specific functions and tests in the current file.

---

**Before submitting:** replace the three “Where the AI got it wrong” prompts with real examples, and complete “Written by me” with code you can explain confidently. Check each entry against your ChatGPT history and Git commits; edit or remove anything that does not reflect what actually happened. Add new entries as you use AI, rather than relying only on this reconstructed history.
