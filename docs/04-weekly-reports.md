# Weekly Increment Reports

## Week of 2026-09-14

**Project:** LaundryLog

**Done.**

* Set up the supplied LaundryLog project locally using Node.js, Express, and PostgreSQL.
* Installed dependencies, created a local PostgreSQL database, and loaded the schema and seed data.
* Added `.gitignore` and `.env.example` to help keep local credentials and dependencies out of Git.
* Added a preflight check using `npm run check` to verify required files and JavaScript syntax.
* Started the app locally and confirmed that the dashboard displayed database-backed orders.
* Created a test order and moved it through the original workflow: Received, Washing, Ready, and Picked up.
* Created the public GitHub repository and deployed the app to Render with a hosted PostgreSQL database.
* Loaded the schema and seed data into the hosted database and verified the live site.
* Updated the README with the repository URL, live site, setup instructions, deployment details, and screenshots.
* Added the Week 1 reflection journal entry.

**Stuck.**
The first Render deployment showed a server error because the hosted database did not yet have its schema and seed data. I loaded both into the hosted database, after which the app displayed the seeded orders. I also resolved a mismatch between the local Git history and the newly created GitHub repository. The Render free database had an expiry date of October 19, 2026, which needed to be considered for continued hosting.

**Hours.** 2–3 hours

**Next.**

* Fix the remaining item-count display issue.
* Add automated tests for important API validation and error cases.

---

## Week of 2026-09-21

**Project:** LaundryLog

**Done.**

* Fixed the singular/plural display issue for item counts.
* Expanded automated API tests for validation and error handling.
* Added basic authentication using environment variables, improved health-endpoint error handling, and enabled GitHub secret protection.
* Added a customer directory with search by name or phone number and a customer order-history view.
* Added machine inventory with three Regular washers, three Regular dryers, one Titan washer, and one Titan dryer.
* Added machine-load tracking and backend validation for capacity, active double-booking, and maintenance status.
* Added split-load planning for machine capacity without changing the original order weight.
* Updated the order form with the service names Wash + Dry + Fold, Wash Only, Dry Only, and Fold Only.
* Added reusable load-based pricing for Regular and Titan machines, including combined-service calculations.
* Preserved historical orders using legacy service values during the service migration.

**Stuck.**
Some seeded historical orders used the old `dry_clean` and `press_only` service values and stored item counts rather than weight. I updated the migration to preserve those records without treating item counts as kilograms. Automatic pricing also needed a clearer machine-selection design, so I kept the pricing utility independently tested rather than connecting it to order creation based on an untested assumption.

**Hours.** 4–5 hours

**Next.**

* Connect automatic pricing to order creation.
* Continue improving the order workflow, payments, reporting, and machine-management features.

---

## Week of 2026-09-28

**Project:** LaundryLog

**Done.**

* Updated the order workflow to use Waiting, Washing, Drying, Folding, Ready, and Completed.
* Improved machine assignment with backend validation for capacity and availability.
* Added an order-completion flow with optional add-ons.
* Added the current add-on catalog and restricted inventory products to supported brands.
* Improved test isolation and expanded backend tests for order transitions, machine assignment, add-ons, and inventory.
* Applied migration `011_completion_addon_catalog.sql` to the production database and verified that the add-ons appeared in the deployed app.
* Pushed the changes to GitHub in commit `543a856` and confirmed the Render deployment succeeded.

**Stuck.**
The production database initially did not contain the new completion add-on catalog after deployment. I applied migration `011_completion_addon_catalog.sql` using the migration runner. The migration completed, and the add-ons appeared after refreshing the app.

**Hours.** 2–3 hours

**Next.**

* Update the project documentation to reflect the current workflow and deployed features.
* Prepare the final presentation materials, including the demo video, slides, and required image.
