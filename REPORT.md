# Weekly Increment Report

## Week of: September 14–20, 2026 (Finals Week 1)

## What changed this week

I started the finals project work on September 19. I had not made progress on the finals deliverables before today, so the existing LaundryLog files in the supplied archive are being treated as the project backbone/reference rather than work I am claiming as my own before this week.

Today I:

- Audited the supplied LaundryLog project structure and identified the existing Express/Postgres backend, database schema and seed files, frontend, routes, validators, and error handling.
- Added a `.gitignore` so local dependencies, environment files, and OS/log files are not committed.
- Added `.env.example` documenting the required `DATABASE_URL` and `PORT` configuration without putting real credentials in the repository.
- Added a repeatable `npm run check` preflight command in `scripts/check.js`.
- Ran the preflight check successfully: 13 required files were present and 10 JavaScript files passed syntax validation.
- Installed the project dependencies successfully with `npm install`.
- Created the local PostgreSQL database named `laundrylog`.
- Loaded the database schema and seed data locally.
- Configured the local application environment using `.env` while keeping `.env` excluded from Git.
- Started the Express application successfully at `http://localhost:3000`.
- Verified that the local LaundryLog dashboard loaded and displayed database-backed orders.
- Created a local test order (#8) and verified the order status workflow: Received → Washing → Ready → Picked up.
- Verified that the status filters displayed the corresponding orders.
- Created the required public GitHub repository at `https://github.com/rnzcrt/LaundryLog`.
- Pushed the LaundryLog project to the repository.
- Created a Render PostgreSQL database for the deployed application.
- Created and deployed the LaundryLog web service on Render using the `main` branch.
- Connected the Render web service to the Render PostgreSQL database using the deployment environment configuration.
- Loaded the database schema into the hosted PostgreSQL database.
- Loaded the supplied seed data into the hosted database successfully.
- Verified the public deployment at `https://laundrylog.onrender.com`.
- Confirmed that the live website displays all 7 seeded orders from the hosted database.

## Why

The goal of this increment was to establish a working, publicly accessible LaundryLog application backed by PostgreSQL.

The preflight check provides a repeatable way to catch missing files and JavaScript syntax errors before further development. The environment example and ignore rules also prevent local credentials and dependencies from being committed to the repository.

The local testing confirmed that the application could run successfully before deployment. The Render deployment then provided a public website and hosted PostgreSQL database for the required live project.

## What broke or what I got stuck on

- The supplied project backbone existed before I began this finals-week work, so I am not claiming its original implementation as work completed by me this week.
- The initial Render deployment displayed a server error because the hosted PostgreSQL database had not yet been initialized. I resolved this by loading the database schema and seed data into the Render database.
- The Render free PostgreSQL database has a limited free-service lifetime, so the deployment may need to be migrated or upgraded if the project must remain available after the free database period.
- Automated API tests have not yet been added.
- Additional validation and error-case testing still needs to be completed.

## What is left

- Review and test important API validation and error cases.
- Add automated tests for important API paths where required.
- Continue improving the project for the remaining finals increments.
- Keep this report updated with only work that is actually completed.

## Live Project

**Website:** https://laundrylog.onrender.com

**GitHub:** https://github.com/rnzcrt/LaundryLog
