# LaundryLog — Mockup

**Author:** Ranz Emmanuel G. Cuarto
**Course:** CS-403 — APSI
**Last Updated:** October 2, 2026

## Overview

LaundryLog is a web-based laundry shop management system for managing customer orders, tracking laundry progress, assigning machines, managing inventory, and monitoring payments and collections.

This document contains the visual mockups for the application's screens, based on the revised project proposal and LaundryLog Design System.

## Design System

LaundryLog follows a consistent design system for its colours,
typography, spacing, reusable components, responsive layouts,
and accessibility.

- [Written Design System](03-design-system.md)
- [Visual Design System (PDF)](03-design-system.pdf)
- [Colour Tokens](design-system/colour-tokens.pdf)
- [Typography and Spacing](design-system/type-spacing.pdf)
- [Buttons and Tags](design-system/button-tag.pdf)
- [Responsive Plan](design-system/responsive-plan.pdf)
- [Figma Source](YOUR_FIGMA_LINK_HERE)

## Desktop Mockups

### 1. Order List / Dashboard

Displays orders and their current processing statuses, allowing staff to find and manage orders.

![Order List](../assets/mockup-order-list.png)

### 2. New Order

Allows staff to record a new customer order, select laundry services, enter load details, and view calculated pricing.

![New Order](../assets/mockup-new-order.png)

### 3. Order Detail

Displays customer and order information, processing status, machine assignments, payment history, outstanding balance, and available add-ons.

![Order Detail](../assets/mockup-order-detail.png)

### 4. Machine Management

Displays machine types, capacities, availability, and current assignments.

![Machine Management](../assets/mockup-machines.png)

### 5. Customer Management

Displays customer records and relevant contact and order information.

![Customer Management](../assets/mockup-customers.png)

### 6. Inventory Management

Displays supported laundry products, stock information, and inventory management controls.

![Inventory Management](../assets/mockup-inventory.png)

### 7. Sales and Collections Reporting

Displays recorded sales and collection information to help staff review shop activity.

![Sales and Collections](../assets/mockup-reports.png)

## Empty State

### Order List — No Matching Orders

The empty state represents what staff see when no orders match the selected filter.

This is a separately designed mockup and does not require deleting any records from the production database. It can be created using a design tool or a separate mock-data view.

**Suggested message:**

"No orders found. Try another filter or create a new order."

![Empty Order List](../assets/mockup-order-list-empty.png)

## Mobile Mockups

The mobile layouts adapt the interface to narrow screens, stacking content into a single column and avoiding horizontal scrolling at a 375px viewport width.

### Mobile Order List

![Mobile Order List](../assets/mockup-mobile-order-list.png)

### Mobile Order Detail

![Mobile Order Detail](../assets/mockup-mobile-order-detail.png)

### Mobile New Order

![Mobile New Order](../assets/mockup-mobile-new-order.png)

## Accessibility

The mockups follow these accessibility requirements:

* Text and background combinations should meet a contrast ratio of at least 4.5:1.
* Use semantic elements for page structure and interactive controls.
* Provide suitable alternative text for meaningful images.
* Associate each form input with a label.
* Ensure links and buttons are keyboard accessible.
* Provide visible keyboard focus states.

These requirements should be verified against the implemented application.

## Mockup and Implementation Alignment

The mockups represent the current LaundryLog features:

* Order workflow: Waiting, Washing, Drying, Folding, Ready, and Completed.
* Machine management and assignment.
* Load planning and automatic pricing.
* Customer management.
* Split payments and payment history.
* Completion add-ons.
* Inventory management.
* Sales and collections reporting.

Any element shown in the mockups that is not implemented in the final application should be explained in the reflection journal, including what changed and why.

## Assets

Export mockup images into the repository's `assets/` directory using the filenames referenced above. The images should show realistic content and match the final application.

| Filename                         | Screen                |
| -------------------------------- | --------------------- |
| `mockup-order-list.png`          | Desktop Order List    |
| `mockup-order-list-empty.png`    | Empty Order List      |
| `mockup-new-order.png`           | New Order             |
| `mockup-order-detail.png`        | Order Detail          |
| `mockup-machines.png`            | Machine Management    |
| `mockup-customers.png`           | Customer Management   |
| `mockup-inventory.png`           | Inventory Management  |
| `mockup-reports.png`             | Sales and Collections |
| `mockup-mobile-order-list.png`   | Mobile Order List     |
| `mockup-mobile-order-detail.png` | Mobile Order Detail   |
| `mockup-mobile-new-order.png`    | Mobile New Order      |

## Final Review

* [ ] All screens from the revised proposal are represented.
* [ ] Mockups use the LaundryLog Design System.
* [ ] Realistic sample content is used.
* [ ] An empty state is included as a separate mockup.
* [ ] Mobile layouts are shown.
* [ ] Images are exported to `assets/`.
* [ ] Image links work in the repository.
* [ ] Mockups have been compared with the final application.
* [ ] Unimplemented features are documented in the reflection journal.
