# Demo video

**Video:** https://drive.google.com/file/d/1RulvGFkbe7TwSUuY8FcpP8CLDcVocCzV/view?usp=sharing
**All presentation files (video, slides, image):** https://drive.google.com/drive/folders/1OFrIH7C0KXr8tOqPmGT_rm7OcmP1iq77?usp=sharing
**Status:** Recorded; 4:40 Minutes, including the AI usage segment. 
**Live application:** https://laundrylog.onrender.com
**GitHub repository:** https://github.com/rnzcrt/LaundryLog

## Demo Video Link

**Link:** https://drive.google.com/file/d/1RulvGFkbe7TwSUuY8FcpP8CLDcVocCzV/view?usp=sharing


## Demo Outline

| Section               |        Duration | Content                                                                 |
| --------------------- | --------------: | ----------------------------------------------------------------------- |
| Introduction          |      30 seconds | Introduce LaundryLog, its purpose, and intended users                   |
| Main application flow |     2–3 minutes | Demonstrate order management, machine assignment, workflow, and add-ons |
| Technical highlight   |      30 seconds | Explain one technical decision using a source file                      |
| Reflection            |      30 seconds | Discuss one limitation and what I would improve                         |
| **Total**             | **3–5 minutes** |                                                                         |

## Main Features to Demonstrate

* Order management and order details
* Laundry service and pricing information
* Machine assignment and load handling
* Order workflow: Waiting, Washing, Drying, Folding, Ready, and Completed
* Optional add-ons at order completion
* Customer and inventory management, if time allows

## Video Script

Introduction. I introduce LaundryLog, a web app for running a laundry shop: orders, machines, payments, inventory and daily reports.

Demo. On the dashboard I explain that revenue and collections are different measures. I create an order, which is priced automatically and split into loads that fit the Regular 8 kg and Titan 10 kg machines. I move an order through its stages, assign real machines, choose or skip add-ons at completion, record a payment and open the reports.

Technology and code. The frontend is HTML, CSS and JavaScript; the backend is Node and Express; the data is in PostgreSQL on Render. I show that everything is behind Basic Auth except the health check, that SQL always uses parameters, and that multi-table changes run in a transaction.

AI usage.
- I used ChatGPT for most feature work and Claude for a backend review and refactor, all logged in AI-USAGE.md with commit links.
- Three cases where the AI was wrong: malformed JSON returned a 500 instead of 400 or 413; the login check could skip the password comparison for a wrong username; a machine query never selected the machine name, so errors always said "Selected machine".
- What I wrote myself: about 100 lines of Postgres (the machines migration, the order service constraints and the add-on price list), the customer search and history on the frontend, two API tests and the preflight check script. I say plainly that this is about 3% of the backend.
- The AI-written file I understand best is src/utils/orderWorkflow.js, which validates machine assignments and completion choices before anything is written to the database.

Limitations and next steps. One shared login, no refund workflow and limited browser test coverage. Next: individual staff accounts and audited payment corrections.

## Fallback Plan

If the deployed application encounters an issue during recording, use a recording of the working application as a fallback. Screenshots may be used if a recording is unavailable, while clearly explaining any issue encountered.