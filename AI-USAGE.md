# AI usage

This project was built with AI assistance. This file is the record of it. It is
graded as the finals badge, and it is worth 100 points.

Start it in week 1 and keep it up as you go. The commit history of this file is
part of the evidence: a file written all at once the night before the deadline
looks exactly like what it is.

> **Status (Week 1):** entries below are real, but every `TODO-SHA` must be
> replaced with the actual commit link before this is submitted, and section 3
> has to be filled in by me. Nothing here should be submitted with a TODO left in it.

## 1. How I used AI

### 2026-09-20 - Checking the project archive against its documentation

- **Tool:** Claude (Anthropic), chat interface
- **What I asked for:** Read the project archive, my terminal history and my
  screenshots, and help me produce the Week 1 deliverables.
- **What it gave back:** A check that the README's nine API endpoints, its error
  codes and the "13 required files, 10 JavaScript files" claim matched the code, plus
  a list of things I had not written down (the "1 items" wording bug, the database
  expiry date, and that the deployed site has no login).
- **What I kept, what I changed, and why:** I kept all of the findings because I
  could see each one in the code or the Render dashboard. I did not change any
  application code as a result.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/e47fff3

### 2026-09-20 - First draft of the Week 1 increment report

- **Tool:** Claude (Anthropic), chat interface
- **What I asked for:** A report in the course's format from my commits, terminal
  history and screenshots.
- **What it gave back:** A report covering what changed, why, what broke, and what
  is left, with a table of the commits that back it up.
- **What I kept, what I changed, and why:** I kept the structure and the list of
  problems. I corrected the start date, because the draft said I began on
  September 19 and I actually started on September 15, with the real work beginning on September 17.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/c4324e0 (first version), https://github.com/rnzcrt/LaundryLog/commit/f2e6b94 (date correction)

### 2026-09-20 - README update

- **Tool:** Claude (Anthropic), chat interface
- **What I asked for:** Bring the README up to date with the live site, the real
  clone URL, deployment steps and screenshots.
- **What it gave back:** A rewritten README with a Render deployment section,
  corrected known issues, and later an architecture section, a next-steps list and
  the AI use section from the template.
- **What I kept, what I changed, and why:** I kept the setup and API sections after checking them against `package.json` and the routes. I changed the README to document the actual Render deployment, local setup, screenshots, known issues, project structure, architecture, and AI use. I also corrected details that did not match the current project.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/e47fff3 (first version), https://github.com/rnzcrt/LaundryLog/commit/2de2465 (template sections)

### 2026-09-20 - Reflection journal draft and rewrite

- **Tool:** Claude (Anthropic), chat interface
- **What I asked for:** A journal entry from the week's evidence, and then a
  version that sounds more like a person wrote it.
- **What it gave back:** A journal in first person covering the goal, what I did,
  what got in the way, what I learned, and the security paragraph the template asks for.
- **What I kept, what I changed, and why:** I used the draft as a starting point, but I rewrote parts of it to match what I actually did and what I actually learned. I checked the dates, setup work, database work, deployment, and testing against my terminal history, project files, screenshots, and the running application. I did not keep statements that did not match my actual work.
- **Commit:** Journal is maintained in my private workspace repository; its commit is not present in the public LaundryLog repository.

### 2026-09-20 - Screenshot processing

- **Tool:** Claude (Anthropic), chat interface
- **What I asked for:** Rename and shrink the three screenshots for the README, and
  later remove the browser tab strip and menu bar from them.
- **What it gave back:** Three page-only images in `docs/screenshots/`.
- **What I kept, what I changed, and why:** I kept the crops because the original
  screenshots showed the names of my other browser tabs, including a private
  repository, which does not belong in a public repo.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/376fbb9 (first version), https://github.com/rnzcrt/LaundryLog/commit/8868aa5 (cropped versions)

### 2026-09-20 - Reading the course template and checking against it

- **Tool:** Claude (Anthropic), chat interface
- **What I asked for:** Which database options the template allows, and whether my
  files followed the template.
- **What it gave back:** The template's rules for the AI-USAGE file, the security
  checklist audit of my code (no `helmet`, no rate limiting, no length limits on text
  fields), and that the template expects a React client, an Express API and a
  PostgreSQL database, which my project does not match.
- **What I kept, what I changed, and why:** I kept the security findings and put them
  in the README and my journal. The React question I am taking to my instructor
  rather than deciding myself.
- **Commit:** [https://github.com/rnzcrt/LaundryLog/commit/2de2465](https://github.com/rnzcrt/LaundryLog/commit/2de2465) (README sections), [https://github.com/rnzcrt/LaundryLog/commit/cb87b61](https://github.com/rnzcrt/LaundryLog/commit/cb87b61) (AI-USAGE.md)

## 2. Where the AI got it wrong

### Case 1 - Wrong start date

- **What it gave me:** A report and a journal that both said I started on
  September 19 and had made no progress before then.
- **What was wrong with it:** It inferred the date from my commit dates and file
  timestamps. I started on September 15, so the two written files were inaccurate
  until I corrected them.
- **What I did instead:** I told it the real date, and both files were rewritten to
  say I started on September 15, began the real work on September 17, and completed the setup, additions and deployment on September 19.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/f2e6b94

### Case 2 - Report in the wrong repository

- **What it gave me:** Instructions to put `REPORT.md` in both my workspace and my
  public project repo.
- **What was wrong with it:** The course rules say everything I write about the
  project lives in the private workspace, and the public repo holds only the project.
  It had not been given that rule yet, and it also left a duplicate that could drift.
- **What I did instead:** I removed `REPORT.md` from the public repo and kept the
  graded copy in `project/REPORT.md` in my workspace.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/34e747e

### Case 3 - Screenshots that showed private information

- **What it gave me:** Downscaled screenshots that still included my browser's tab
  strip and menu bar.
- **What was wrong with it:** The tab strip showed the name of my private workspace
  repository and my other open tabs. The AI did not think about what a public README
  should not show until the privacy rule was pasted into the chat.
- **What I did instead:** I replaced them with crops that remove the tab strip and menu bar. The first versions
  are still in the repository history.
- **Commit:** https://github.com/rnzcrt/LaundryLog/commit/376fbb9 (the wrong version), https://github.com/rnzcrt/LaundryLog/commit/8868aa5 (the fix)

## 3. Who wrote what

At this point, most of the LaundryLog application came from the supplied project archive. I did not write the original application backbone, so I am not counting that code as my own.

The code and project changes I can honestly identify as mine so far are listed below. I will add to this section as I write more of the project in later weeks.

### Written by me

- **File:** `scripts/check.js`
- **Commit:** `c7df593`
- **What it does and why it is built this way:** This is a preflight check I added to make sure required project files exist and that the JavaScript files pass syntax checks before I continue working on the project. I wanted a quick local check instead of discovering basic file or syntax problems later.

- **File:** `public/app.js`
- **Commit:** `5d12768`
- **What it does and why it is built this way:** I fixed the item-count display so an order with one item says `1 item` and an order with more than one says `2 items`, `3 items`, and so on. I kept the change small because the existing display logic already worked except for the singular wording.

- **File:** `test/orders.test.js`
- **Commit:** `dd5a735`
- **What it does and why it is built this way:** I added automated API tests for two validation cases I manually tested: requesting an order that does not exist should return HTTP 404, and creating an order without required fields should return HTTP 400. I used Node's built-in test runner so the tests can run with `npm test` without adding another test framework.

- **File:** `package.json`
- **Commit:** `dd5a735`
- **What it does and why it is built this way:** I added the `npm test` script so the automated tests can be run with one consistent command.

- **File:** `.gitignore`
- **Commit:** `c7df593`
- **What it does and why it is built this way:** I added ignore rules for local files that should not be committed, including the local environment file containing database credentials.

- **File:** `.env.example`
- **Commit:** `c7df593`
- **What it does and why it is built this way:** I added a safe example of the environment variables needed to run the project without putting my actual local database credentials into the repository.

### The AI-written part I understand best

- **File:** `src/routes/orders.js`
- **Commit:** `c7df593`
- **What it does and why we kept it:** This was part of the supplied project backbone rather than code I wrote from scratch. I understand it as the Express router responsible for the order API: listing and searching orders, retrieving an individual order, creating orders, changing order status, and recording payments. I kept it because it provides the main backend API used by the LaundryLog frontend, and I tested its behavior through local API requests.

I am not claiming that the supplied code is mine. The initial `c7df593` commit contains the starting LaundryLog application, including the Express application, routes, database code, validators, frontend, schema, seed data, and styling. I reviewed and tested that code while completing the project, but I distinguish that from code I personally added or changed.
## Week 2 AI usage

### Customer search and order history

- **AI tool:** ChatGPT
- **Task:** I used ChatGPT to help me inspect the existing LaundryLog customer API and plan a manageable enhancement from the provided project requirements.
- **What I personally implemented:** I wrote the frontend customer directory functionality in `public/app.js` and added the customer search section to `public/index.html`. This includes customer search by name or phone, customer result rendering, and opening customer order history.
- **Existing code reused:** The existing `src/routes/customers.js` API already provided customer search and customer order history endpoints. I reused those endpoints rather than rebuilding the backend.
- **Testing:** I tested customer search with existing customers, searched by phone number, tested a search with no results, and opened customer history for multiple customers. I also ran `node --check public/app.js`, `npm run check`, and `npm test`; all automated tests passed.
- **Commit:** `247c616`
- **Result:** The customer directory and order-history feature works locally without breaking the existing order workflow.
