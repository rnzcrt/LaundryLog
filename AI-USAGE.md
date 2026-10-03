# AI Usage — LaundryLog

This document records AI assistance used during LaundryLog planning, implementation, testing, troubleshooting, and documentation. It explains how AI contributed and what I reviewed or changed as the project author.

**Accuracy note:** Some entries below are summaries reconstructed from conversation and Git history, not verbatim prompts. Compare them with the actual chat history and edit or remove anything inaccurate before submitting. A commit link identifies related code changes; it does not prove which lines were written by me or AI.

## 1. How I used AI

The following entries summarize the task, assistance received, implementation outcome, and related commit. Confirm the details against the actual conversation and code.

### 2026-09-27 — Load-based laundry pricing

- **Tool:** ChatGPT
- **Prompt/request summary (not verbatim):** Help implement pricing based on laundry service, machine type, and load requirements.
- **AI output:** A pricing utility and test cases for Regular and Titan washing, drying, and folding.
- **What I kept or changed:** Pricing logic and related tests were committed. Confirm the exact suggestions retained and adjustments made.
- **Why:** The app needed a consistent way to calculate prices from service and machine requirements.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/275b930

### 2026-09-27 — Combined service pricing

- **Tool:** ChatGPT
- **Prompt/request summary (not verbatim):** Help calculate a total when an order includes more than one laundry service.
- **AI output:** A combined-pricing function and tests for single and combined services.
- **What I kept or changed:** Combined pricing logic and tests were committed; pricing rules were refined as the service model developed. Confirm the specific changes made.
- **Why:** The total needed to reflect the services selected for an order.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/e893acd

### 2026-09-27 — Split-load planning

- **Tool:** ChatGPT
- **Prompt/request summary (not verbatim):** Help split an order's weight into loads that fit a machine's capacity.
- **AI output:** A load-splitting utility, an API endpoint for load plans, and tests for capacity limits and invalid input.
- **What I kept or changed:** The load-planning approach, endpoint, and tests were included. Confirm any manual changes made.
- **Why:** Staff need to divide heavier orders without exceeding machine capacity.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/aad890a

### 2026-09-28 — Order services and automatic pricing

- **Tool:** ChatGPT
- **Prompt/request summary (not verbatim):** Help support different laundry services, preserve older records, and calculate prices automatically.
- **AI output:** Suggested changes to service handling, validation, pricing, and tests.
- **What I kept or changed:** Service and pricing changes were incorporated, while legacy records also needed to remain readable. Confirm which suggestions were used, revised, or rejected.
- **Why:** New service options needed to work without losing compatibility with existing data.
- **Related commits:**
  - https://github.com/rnzcrt/LaundryLog/commit/29f0e8e
  - https://github.com/rnzcrt/LaundryLog/commit/ac9075b

### 2026-09-28 — Payment status and outstanding balance

- **Tool:** ChatGPT
- **Prompt/request summary (not verbatim):** Help track how much an order has been paid and how much remains due.
- **AI output:** Backend and interface changes for payment status and outstanding balance.
- **What I kept or changed:** Payment and balance functionality was added. Confirm the exact suggestions retained and how the behavior was checked.
- **Why:** Staff need to identify unpaid, partially paid, and fully paid orders.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/74ef47b

### 2026-09-30 — Split payments and payment history

- **Tool:** ChatGPT
- **Prompt/request summary (not verbatim):** Help support multiple payment transactions for one order while keeping payment history.
- **AI output:** Database and API changes for split payments and payment records.
- **What I kept or changed:** Split-payment support and payment history were implemented. Confirm the specific review, edits, and tests performed.
- **Why:** Partial payments should be recorded separately instead of replacing earlier transactions.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/411469c

### 2026-09-30 — Sales and collections reporting

- **Tool:** ChatGPT
- **Prompt/request summary (not verbatim):** Help distinguish order value from money collected and display reporting totals.
- **AI output:** A reporting endpoint, interface changes, and tests for sales and collections.
- **What I kept or changed:** Reporting was added to distinguish sales from collected payments. Confirm the calculations against the code and original discussion.
- **Why:** Order value and money received are different measures.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/2151657

### 2026-09-30 — Customer and inventory interface

- **Tool:** ChatGPT
- **Prompt/request summary (not verbatim):** Help improve how customer and inventory information is displayed and managed.
- **AI output:** Interface and styling changes for customer and inventory tables.
- **What I kept or changed:** Table redesign changes were committed. Confirm which suggestions were retained and what was manually adjusted.
- **Why:** Clearer tables make customer and stock records easier to browse.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/bb591f0

### 2026-10-01 — Order workflow and add-on catalog

- **Tool:** ChatGPT
- **Prompt/request summary (not verbatim):** Help improve order stages, machine assignment, completion add-ons, inventory validation, and test reliability.
- **AI output:** Suggested backend workflow validation, frontend changes, add-on catalog updates, migration changes, and tests.
- **What I kept or changed:** Workflow and catalog changes were committed. A production database migration was needed before the catalog appeared in the deployed app. Confirm exact suggestions retained and checks performed.
- **Why:** The app needed consistent workflow rules, validated catalog choices, and reliable tests.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/543a85667f7853f469b96ab889fa9387cbbfa9f5

### 2026-10-03 — README organization and setup instructions

- **Tool:** ChatGPT
- **Prompt/request summary:** Organize and finish the README as a step-by-step guide.
- **AI output:** A reorganized README covering overview, local setup, app workflow, API, project structure, screenshots, deployment, security, limitations, AI use, and license.
- **What I kept or changed:** The README was updated in the repository. Screenshot paths, setup steps, and feature descriptions still need final verification.
- **Why:** Readers should be able to understand the project and follow setup and usage instructions in order.
- **Related commit:** https://github.com/rnzcrt/LaundryLog/commit/c404665535130bd3eb3a30efaff4bc30804833d6

## 2. Where the AI got it wrong

The assignment asks for examples of AI output that was unsuitable, incomplete, or incorrect and how I corrected it. **These must be genuine examples from my own experience.** I have not invented mistakes to fill this section. Replace the prompts below with real cases from the chat history, or remove a case if it did not happen.

### Case 1 — Genuine example to add

- **Tool and prompt/request:** [Paste or accurately summarize the actual prompt.]
- **What the AI suggested:** [Describe the specific output.]
- **What was wrong or unsuitable:** [Explain the concrete mismatch, missing rule, or error.]
- **What I changed instead:** [Describe the correction and how I verified it.]
- **Evidence/related commit:** [Add a relevant commit URL, test, or other evidence.]

### Case 2 — Genuine example to add

- **Tool and prompt/request:** [Paste or accurately summarize the actual prompt.]
- **What the AI suggested:** [Describe the specific output.]
- **What was wrong or unsuitable:** [Explain the concrete mismatch, missing rule, or error.]
- **What I changed instead:** [Describe the correction and how I verified it.]
- **Evidence/related commit:** [Add a relevant commit URL, test, or other evidence.]

### Case 3 — Genuine example to add

- **Tool and prompt/request:** [Paste or accurately summarize the actual prompt.]
- **What the AI suggested:** [Describe the specific output.]
- **What was wrong or unsuitable:** [Explain the concrete mismatch, missing rule, or error.]
- **What I changed instead:** [Describe the correction and how I verified it.]
- **Evidence/related commit:** [Add a relevant commit URL, test, or other evidence.]

## 3. Who wrote what

Git commits show when changes were recorded, but authorship should be described from my actual contribution, not inferred from commit authorship alone. Complete this section in my own words and make sure I can explain the selected code.

### Written or substantially implemented by me

- **File or feature:** [Name a file or feature I personally wrote or substantially implemented.]
- **My contribution:** [Explain which parts I designed, wrote, edited, or tested.]
- **How it works:** [Describe its inputs, outputs, and important decisions in my own words.]
- **How I verified it:** [Name the tests, manual checks, or review performed.]
- **Related commit:** [Add the relevant commit URL.]

### AI-assisted part I understand best

- **File or feature:** [Choose a real AI-assisted file or feature I have reviewed and can explain.]
- **Related commit:** [Add the relevant commit URL.]
- **What the code does:** [Explain its main functions and how the app uses it.]
- **What AI contributed:** [Identify AI suggestions or code provided, as accurately as possible.]
- **What I reviewed or changed:** [Describe my decisions, edits, and verification.]

A possible topic, if it matches my actual experience, is the order workflow utility at src/utils/orderWorkflow.js, associated with https://github.com/rnzcrt/LaundryLog/commit/543a85667f7853f469b96ab889fa9387cbbfa9f5. Use it only after reading the current file and confirming I can explain its actual functions and tests.

---

## Final review before submission

- [ ] Compare each entry with the original conversation and correct or remove anything inaccurate.
- [ ] Keep prompt summaries labelled as summaries; use quotation marks only for exact prompts.
- [ ] Confirm each commit contains the related change.
- [ ] Add at least three genuine AI-mistake examples if required by the rubric.
- [ ] Complete the “Written or substantially implemented by me” section with a real contribution.
- [ ] Complete the AI-assisted code section with a file I have reviewed and can explain.
- [ ] Ensure the README's AI disclosure links here and is accurate.
