# Weekly Increment Report

## Week of: September 14–20, 2026 (Finals Week 1)

## What changed this week

I started the finals project work on September 19. I had not made progress on the finals deliverables before today, so the existing LaundryLog files in the supplied archive are being treated as the project backbone/reference rather than work I am claiming as my own before this week.

Today I:

- Audited the supplied LaundryLog project structure and identified the existing Express/Postgres backend, database schema and seed files, frontend, routes, validators, and error handling.
- Added a `.gitignore` so local dependencies, environment files, and OS/log files are not committed.
- Added `.env.example` documenting the required `DATABASE_URL` and `PORT` configuration without putting real credentials in the repository.
- Added a repeatable `npm run check` preflight command in `scripts/check.js`. It verifies required project files exist and runs Node syntax checks over the JavaScript source, frontend script, and checker itself.
- Ran the preflight check successfully: 13 required files were present and 10 JavaScript files passed syntax validation.
- Installed the project dependencies successfully with `npm install`.
- Created the local PostgreSQL database named `laundrylog`.
- Loaded `db/schema.sql` successfully.
- Loaded `db/seed.sql` successfully, creating the supplied sample data.
- Configured the local application environment using `.env` while keeping `.env` excluded from Git.
- Started the Express application successfully at `http://localhost:3000`.
- Verified that the LaundryLog dashboard loaded and displayed database-backed orders.
- Created a new test order (#8) through the website with a 2 kg wash-and-fold service priced at ₱140 and a test note.
- Verified that order details and order history are displayed.
- Tested the order status workflow for the test order: Received → Washing → Ready → Picked up.
- Verified that the status filters display the corresponding orders.
- Confirmed that the total number of orders remained 8 after the workflow test.

## Why

The first goal was to establish a clean, checkable, database-backed starting point for the finals increment. The preflight check helps catch missing files or JavaScript syntax errors before further changes. The environment example and ignore rules also make the project safer to publish without committing local database credentials.

The local functional test also provides evidence that the existing LaundryLog backbone can run against PostgreSQL and that the core order workflow is functioning locally.

## What broke or what I got stuck on

- The supplied project backbone existed before I began this finals-week work, so I am not claiming its original implementation as work completed by me this week.
- I have not yet produced a live public deployment URL.
- I have not yet placed the project in the required public GitHub repository.
- Automated API tests have not yet been added.
- Additional validation and error-case testing still needs to be completed.

## What is left

- Review and test important API validation and error cases.
- Add automated tests for important API paths where required.
- Put the project in the required public GitHub repository.
- Deploy the application and database so the required live website URL is available.
- Complete the remaining M8A1 submission requirements before moving on to M8A2.
- Keep this report updated with only work that is actually completed.
