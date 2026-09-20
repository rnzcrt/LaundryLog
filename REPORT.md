# Weekly Increment Report

## Week of: September 14–20, 2026 (Finals Week 1)

**Submitted:** Sunday, September 20, 2026

## What changed this week

I started on September 15, but I didn't get to the hands-on work until September 19. The setup, the additions and the deployment described below all happened on the 19th, and the commit dates show that. The LaundryLog files in the supplied archive (the Express/Postgres backend, `db/schema.sql`, `db/seed.sql`, the routes, validators, error handling, the plain-JavaScript frontend, and the first version of the README) are the project backbone. I am not claiming them as my own work. Everything below is what I added on top of it or did with it.

### Files I added

- `.gitignore`: keeps `node_modules/`, `.env`, `.DS_Store` and npm logs out of Git.
- `.env.example`: documents `DATABASE_URL` and `PORT` with placeholder values only.
- `scripts/check.js` and the `npm run check` script in `package.json`: a repeatable preflight that confirms the 13 required files exist and that every JavaScript file passes a syntax check. Run against the project as submitted, it prints `Preflight passed: 13 required files present; 10 JavaScript files passed syntax checks.`
- `REPORT.md`: this report.

### Setup and verification (local)

- Installed dependencies with `npm install`.
- Created a local PostgreSQL database named `laundrylog` and loaded `db/schema.sql` and `db/seed.sql`.
- Configured a local `.env` (not committed; confirmed it does not appear in the Git history).
- Started the app at `http://localhost:3000` and confirmed the dashboard shows database-backed orders.
- Created a local test order (#8) and moved it through Received → Washing → Ready → Picked up, and confirmed the status filters show the right orders.

### Deployment

- Created the public GitHub repository https://github.com/rnzcrt/LaundryLog and pushed the project to `main`.
- Created a Render PostgreSQL database (`laundrylog-db`, PostgreSQL 17, Free plan, Singapore region).
- Created and deployed the `LaundryLog` Render web service (Node, Free plan) from the `main` branch, with auto-deploy on push, and connected it to the database through the `DATABASE_URL` environment variable.
- Loaded the schema and seed data into the hosted database.
- Verified the public site at https://laundrylog.onrender.com. It shows all 7 seeded orders from the hosted database (screenshots in `docs/screenshots/`).

### Documentation update (this submission)

- README: replaced the placeholder clone URL with the real repository, added the live site link, added the `npm run check` and `npm run db:setup` / `db:seed` steps, added a new Deployment (Render) section, replaced the "Not deployed" note with the real state of the deployment, and updated Known issues.
- Screenshots: added `order-list.png` (live site), `render-deploys.png` and `render-database.png` to `docs/screenshots/` and linked them from the README. I removed the links to the two screenshots that do not exist yet.
- Added the reflection journal entry for this week in `journal/`.

### Commits that back this up

| Commit | Date (UTC+8) | What it contains |
| --- | --- | --- |
| `c7df593` Complete M8A1 local setup and verification | Sep 19, 08:36 | The whole project in one commit: the supplied files plus my additions listed above |
| `dbd1a12` Update M8A1 increment report | Sep 19, 09:26 | `REPORT.md` only |

`c7df593` is large because my local repository started from the supplied archive, so the diff does not separate my files from the supplied ones. The list of added files above is the accurate record. From here on I am committing changes in small, separate commits so the history shows what changed and why.

## Why

The goal of this increment was to get a working, publicly accessible LaundryLog backed by PostgreSQL, so the remaining finals increments build on something that is actually deployed rather than something that only runs on my laptop.

The preflight check gives me a fast, repeatable way to catch a missing file or a syntax error before I push. `.gitignore` and `.env.example` keep local credentials and dependencies out of the repository. Testing locally first meant that when the deployed site broke, I knew the problem was in the hosting setup rather than the code. The README and screenshot changes are there so someone else could set up and run the project, or deploy it, using only the repository.

## What broke or what I got stuck on

- **First Render deploy showed a server error.** The hosted PostgreSQL database was empty, so the app had no tables to query. A new hosted database has no schema. I fixed it by loading `db/schema.sql` and then `db/seed.sql` into the Render database.
- **My local history and the GitHub repository did not match.** The new GitHub repository already contained an "Initial commit" (`27ba469`) that my local repository did not have. I replaced it with `git push --force`. That was acceptable here because it was the only commit on the remote, but a force push overwrites history and is easy to get wrong, so next time I should create the remote repository empty.
- **A leftover GitHub Pages workflow.** `.github/workflows/deploy-pages.yml` builds a `client/` Vite app and publishes it to GitHub Pages. This project has no `client/` folder and is deployed on Render, so I deleted it. It had never been committed, so it is not in the history.
- **Free-tier deadlines.** The Render dashboard says the free database expires on **October 19, 2026** and will be deleted unless upgraded, and that the free web service spins down when idle and can delay requests by 50 seconds or more. I need a decision on the database before October 19.
- **A small bug I found while checking the live site:** an order with one item is shown as "1 items" (`public/app.js`, line 62). I have not fixed it yet.
- **The deployed site has no authentication.** Anyone with the URL can create or change orders. That is acceptable for sample data in a class project, and I have documented it in the README.
- **The supplied project existed before this week.** I am not claiming its original implementation.

## What is left

- Fix the "1 items" label.
- Test the API's validation and error cases (400, 404, 409) and record the results.
- Add automated tests for the important API paths.
- Capture screenshots of the new-order form and the order detail/timeline view, and add them to the README.
- Decide how to keep the app running after the free database expires on October 19, 2026 (migrate or upgrade).
- Continue with the planned improvements from the README: undoable status changes, pagination and search, and a customers screen.
- Keep this report updated with only work that is actually completed.

## Live Project

**Website:** https://laundrylog.onrender.com

**GitHub:** https://github.com/rnzcrt/LaundryLog
