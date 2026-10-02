# Proposal

**App Name:** LaundryLog
**Author:** Ranz Emmanuel G. Cuarto
**Course:** CS-403 — APSI
**Original Proposal Date:** August 25, 2026
**Last Updated:** October 2, 2026

## What the App Is For

LaundryLog is a web-based laundry shop management system that helps staff record customer orders, track laundry through each stage of processing, manage machines and inventory, and monitor payments and collections. It is designed to reduce missed orders, improve workflow visibility, and make daily shop operations easier to manage.

## Who It Is For

LaundryLog is intended for staff at a small laundry shop, especially counter staff and employees managing orders during a shift.

Staff can use it to:

* Record new customer orders and their laundry details.
* Check order status when customers ask about their laundry.
* Assign washers and dryers as orders move through the workflow.
* Track payments, outstanding balances, and additional services.
* Manage customer records, machines, and inventory.

## Core Features

### 1. Order Management

* Create and view customer orders.
* Record customer details, service type, laundry weight, pricing, and order information.
* Track orders through the processing workflow.
* View order details, status, and payment information.
* Maintain order history.

### 2. Laundry Workflow

Orders follow the current workflow:

**Waiting → Washing → Drying → Folding → Ready → Completed**

* New orders begin in Waiting.
* Staff assign a washer when an order moves to Washing.
* Staff assign a dryer when an order moves to Drying.
* Staff can track the order through folding and readiness.
* Completing an order can include optional add-on services or products.

### 3. Machine Management

* View available laundry machines.
* Track machine status and capacity.
* Assign machines to orders during the relevant workflow stages.
* Help staff avoid assigning loads beyond machine capacity.

### 4. Pricing and Load Planning

* Calculate laundry prices based on service type, weight, and load.
* Support Regular and Titan machine capacities and pricing.
* Split loads when needed to fit machine capacity.
* Support combined services and automatic order pricing.

### 5. Customers

* Maintain a directory of customers.
* Store customer information for repeat visits.
* Associate orders with customer records.

### 6. Payments and Order Balances

* Record payments against orders.
* Support split payments and payment history.
* Display payment status and outstanding balance.
* Preserve previous payment records when order totals change.

### 7. Add-On Services and Products

* Offer optional add-ons during order completion.
* Include additional folding and laundry products.
* Update the order total and remaining balance when add-ons are selected.

### 8. Inventory Management

* Track laundry product inventory.
* Restrict product selection to the supported catalog.
* Validate inventory-related entries through the backend.

### 9. Sales and Collections Reporting

* Display sales and collections information.
* Help the shop review recorded transactions and payment activity.

## Stretch Goals and Scope Changes

The original proposal focused on an order list, new order form, order detail, and customer directory. The implementation expanded to include machine management, load planning, payments, inventory, add-ons, and reporting.

These expanded features are now part of the implemented project scope rather than being treated as unimplemented promises.

Potential future improvements include:

* More advanced reporting and business analytics.
* Additional user roles and more detailed permissions.
* Automated customer notifications.
* More advanced inventory alerts and stock forecasting.
* Further improvements to mobile usability.

These remain stretch goals unless they are implemented and tested.

## Hosting and Technology

| Component           | Technology / Hosting              |
| ------------------- | --------------------------------- |
| Frontend            | HTML, CSS, and vanilla JavaScript |
| Backend API         | Node.js and Express               |
| Database            | PostgreSQL                        |
| Application hosting | Render                            |
| Live application    | https://laundrylog.onrender.com   |
| Source control      | GitHub                            |

The frontend and API are served through the deployed application on Render, with PostgreSQL used for persistent data storage.

The project uses Render's free-tier services. Free-tier limitations, including database availability and expiry, are operational risks that need to be considered.

**Hosting changes:** The application was deployed to Render. The production database was updated with migration `011_completion_addon_catalog.sql` on October 1, 2026, after the add-on catalog was found to be empty.

## Demo Mode

**Demo mode shutdown date: TO BE CONFIRMED**

The exact date for disabling demo mode was not available in the project information reviewed for this update. Confirm whether demo mode is enabled and record the agreed shutdown date here.

If demo mode is no longer used, state that it has been disabled and record the date. Do not leave demo mode enabled unintentionally after the presentation or final submission.

## Risks and Changes

### 1. Order Status Synchronization

**Original risk:** Updating an order on the detail screen and ensuring the order list reflects the change without a full page reload.

**Current status:** Reduced. Order status updates are handled through the application backend and persisted in the database. The workflow has backend validation and tests. Continue checking that all screens display updated information after changes.

### 2. Invalid Workflow Transitions

**Risk:** Staff could move orders into incorrect stages or skip required machine assignments.

**Current status:** Reduced. Workflow transitions and machine assignment are validated by the backend, with tests covering relevant behavior.

### 3. Machine Capacity

**Risk:** Assigning more laundry than a machine can handle could disrupt processing.

**Current status:** Reduced. Load-splitting and machine-capacity planning have been implemented. Continue verifying edge cases involving different machine types and load weights.

### 4. Incorrect Pricing and Balances

**Risk:** Incorrect calculations or add-ons could cause mismatched order totals and outstanding balances.

**Current status:** Reduced. Pricing, split payments, payment history, and add-on updates have been implemented with automated tests. Changes to totals must continue to preserve payment history and accurately recalculate balances.

### 5. Inventory Catalog Errors

**Risk:** Invalid products or inconsistent inventory entries could affect records.

**Current status:** Reduced. The supported inventory catalog is validated by the backend. Migration `011` was applied to production to populate the completion add-on catalog.

### 6. Database Availability and Expiry

**Risk:** The free-tier PostgreSQL database may have availability limits or an expiry date that could affect the live application.

**Current status:** Still active. The Render Free database was noted as expiring on October 19, 2026. A migration or upgrade plan is needed before that date to avoid losing access to the production database.

### 7. Testing and Data Isolation

**Risk:** Shared test data could cause tests to affect one another or produce misleading results.

**Current status:** Reduced. Test fixtures were updated to isolate machines, orders, payments, history, loads, and reporting dates. The recorded test run passed 69 tests, with `npm run check` and `git diff --check` also passing at that time.

### 8. Security and Privacy

**Risk:** Customer information and operational records need to be protected, and sensitive credentials must not be exposed.

**Current status:** Requires ongoing verification. Continue checking server-side validation, database query safety, access controls, configuration, and the handling of customer information. Do not include secrets or `.env` files in the repository.

## Current Development Status

LaundryLog has progressed beyond the original order-tracking proposal. The application includes order processing, machine assignment, load-based pricing, payments, add-ons, inventory management, and reporting.

The latest recorded implementation commit is `543a856` — *Improve laundry order workflow and add-on catalog*. The application was deployed to Render, and the production add-on catalog migration was applied.

The project should continue to be checked against its live deployment and final submission requirements. Features should only be described as complete when they have been verified in the application.

## Expected Outcome

LaundryLog aims to give small laundry shop staff one place to manage customer orders, follow laundry processing, monitor machine use, record payments, and review shop activity. The goal is to make everyday operations more organized and reduce errors caused by manual tracking.

## Author

**Ranz Emmanuel G. Cuarto**
CS-403 — APSI
