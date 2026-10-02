# Mockup

**App Name:** LaundryLog
**Author:** Ranz Emmanuel G. Cuarto
**Course:** CS-403 — APSI
**Last Updated:** October 2, 2026

## Overview

This document presents the visual design direction and screen mockups for LaundryLog, a web-based laundry shop management system.

The preliminary wireframes established the initial screen layouts. The design system defines the colours, typography, spacing, reusable components, responsive behavior, and accessibility considerations used to style the application.

The mockups should represent the actual implemented application, including its current order workflow, machine management, customer records, payments, inventory, and reporting features.

## Design System

The mockups follow the LaundryLog design system.

### Colour Palette

| Token      | Colour    | Purpose                        |
| ---------- | --------- | ------------------------------ |
| Primary    | `#2563EB` | Links, buttons, active states  |
| Accent     | `#F59E0B` | Calls to action and highlights |
| Background | `#F8FAFC` | Main page background           |
| Surface    | `#FFFFFF` | Cards and panels               |
| Text       | `#1E293B` | Body text                      |

### Typography

| Text Style | Size | Weight  | Usage                             |
| ---------- | ---: | ------- | --------------------------------- |
| Heading    | 24px | Bold    | Screen and section titles         |
| Body       | 16px | Regular | Paragraphs and lists              |
| Small      | 13px | Regular | Captions, labels, and footer text |

### Spacing

The design uses an 8px base spacing unit.

| Token       | Value | Purpose                             |
| ----------- | ----: | ----------------------------------- |
| `--space-1` |   8px | Tight spacing between related items |
| `--space-2` |  16px | Screen-edge padding                 |
| `--space-4` |  32px | Standard spacing between sections   |

### Reusable Components

* **Button:** Primary and secondary variants for actions throughout the application.
* **Tag:** Status indicator for orders, with colours mapped to the current order status.
* **Status Filter:** Tabs or controls for filtering orders by status.
* **Header:** Displays the screen title and relevant navigation actions.
* **Order Card:** Displays a customer's order summary and current status.

## Screen Mockups

Export the finished mockup images as PNG, JPG, or PDF and place them in the repository's `assets/` directory. Replace the image placeholders below with the actual filenames once the exports are available.

### 1. Order List / Dashboard

**Purpose:** Displays active orders and allows staff to review orders by processing status.

**Expected content:**

* LaundryLog header and navigation.
* New Order button.
* Status filters.
* Order cards with customer names, services, weights, and statuses.
* Relevant order information at a glance.

**Mockup image:**
`assets/mockup-order-list.png` — *Add exported mockup.*

### 2. New Order

**Purpose:** Allows staff to record a customer's laundry when it is received.

**Expected content:**

* Customer selection or customer details.
* Laundry service selection.
* Weight and load information.
* Pricing information.
* Order creation action.

**Mockup image:**
`assets/mockup-new-order.png` — *Add exported mockup.*

### 3. Order Detail

**Purpose:** Displays the full details of an order and allows staff to manage its progress.

**Expected content:**

* Customer and order information.
* Current status and workflow actions.
* Laundry weight, service, and pricing.
* Assigned machine information, where applicable.
* Payment history, amount paid, and outstanding balance.
* Available completion add-ons.

**Mockup image:**
`assets/mockup-order-detail.png` — *Add exported mockup.*

### 4. Machine Management

**Purpose:** Helps staff view machines, check their status, and assign machines to orders.

**Expected content:**

* Machine list.
* Machine type and capacity.
* Machine availability or current status.
* Assigned order information, where applicable.
* Machine assignment controls.

**Mockup image:**
`assets/mockup-machines.png` — *Add exported mockup.*

### 5. Customer Management

**Purpose:** Provides a directory of customers and their related information.

**Expected content:**

* Customer list or table.
* Customer name and contact details.
* Relevant order information.
* Actions for managing customer records.

**Mockup image:**
`assets/mockup-customers.png` — *Add exported mockup.*

### 6. Inventory Management

**Purpose:** Allows staff to view and manage laundry products and stock information.

**Expected content:**

* Inventory list or table.
* Supported product brands and product names.
* Stock information.
* Inventory management actions.

**Mockup image:**
`assets/mockup-inventory.png` — *Add exported mockup.*

### 7. Sales and Collections Reporting

**Purpose:** Displays recorded sales and payment collections to help staff review shop activity.

**Expected content:**

* Sales and collections summaries.
* Relevant reporting information.
* Transaction or payment-related figures.
* Clear date or reporting context, where supported by the application.

**Mockup image:**
`assets/mockup-reports.png` — *Add exported mockup.*

## Empty State

At least one screen must show what the user sees when there is no data to display.

### Order List — No Orders

**Expected content:**

* LaundryLog header.
* Status filters.
* Clear message indicating that no orders match the selected filter.
* An action to create a new order, where appropriate.

**Suggested message:**
"No orders found. Create a new order to get started."

**Mockup image:**
`assets/mockup-order-list-empty.png` — *Add exported mockup.*

## Mobile Layout

LaundryLog should remain usable on mobile screens, especially for staff who need to check orders while moving around the shop.

The design system specifies that at 375px width, layouts should stack into a single column below the responsive breakpoint without horizontal scrolling.

The mobile mockups should show:

* A compact header and accessible navigation.
* Order cards stacked vertically.
* Readable status labels and action buttons.
* Forms arranged in a single column.
* Tables or wide content adapted for narrow screens.
* Buttons and controls that remain easy to tap.

**Mobile mockup images:**

* `assets/mockup-mobile-order-list.png` — *Add exported mockup.*
* `assets/mockup-mobile-order-detail.png` — *Add exported mockup.*
* `assets/mockup-mobile-new-order.png` — *Add exported mockup.*

## Accessibility

The design system identifies the following accessibility requirements:

* Text and background colour combinations should meet a contrast ratio of at least 4.5:1.
* Use semantic elements for headers, navigation, main content, and interactive controls.
* Provide appropriate alternative text for meaningful images.
* Associate form inputs with labels.
* Ensure links and buttons are keyboard accessible with visible focus states.

These are design requirements and should be verified against the implemented application before being marked as fully satisfied.

## Mockup and Implementation Alignment

The mockups should reflect the current application rather than only the original preliminary wireframes.

The current project includes:

* Order tracking through Waiting, Washing, Drying, Folding, Ready, and Completed.
* Machine assignment and load planning.
* Automatic pricing and combined services.
* Split payments and payment history.
* Add-on services and products.
* Customer and inventory management.
* Sales and collections reporting.

Any visual element shown in the final mockups that is not implemented by the end of the project should be documented in the reflection journal, including what changed and why.

## Asset Checklist

* [ ] Finished, styled order list mockup
* [ ] New order mockup
* [ ] Order detail mockup
* [ ] Machine management mockup
* [ ] Customer management mockup
* [ ] Inventory management mockup
* [ ] Sales and collections reporting mockup
* [ ] Empty-state mockup
* [ ] Mobile order list mockup
* [ ] Mobile order detail mockup
* [ ] Mobile new order mockup
* [ ] Exported images or PDF saved in `assets/`
* [ ] Image links updated in this document
* [ ] Mockups compared against the final implemented application

## Source Design System

The colour palette, typography, spacing rules, reusable components, responsive layout guidance, and accessibility checklist are based on the LaundryLog Design System document supplied for this project.
