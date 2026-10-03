# LaundryLog — Design System

**Author:** Ranz Emmanuel G. Cuarto
**Course:** CS-403 — APSI
**Last Updated:** October 2, 2026

## 1. Overview

The LaundryLog Design System defines the visual rules used throughout the application to maintain consistency across all screens.

It documents the colour palette, typography, spacing, reusable components, component states, responsive behavior, and accessibility requirements.

The design system applies to the Order List, New Order, Order Detail, Machine Management, Customer Management, Inventory Management, and Sales and Collections Reporting screens.

## 2. Styling Approach

The original design specification identifies CSS Modules with `:root` custom properties as the styling approach.

LaundryLog is built using HTML, CSS, and vanilla JavaScript. The actual stylesheet and styling approach should be confirmed against the current repository before treating this as the implementation description.

The design tokens below define the intended visual values.

## 3. Colour Tokens

LaundryLog uses blue as its primary colour, amber as an accent, a light background, white surfaces, and dark text.

| Colour Name   | CSS Token         | Hex Value | Usage                          |
| ------------- | ----------------- | --------- | ------------------------------ |
| Primary Blue  | `--color-primary` | `#2563EB` | Links, buttons, active states  |
| Accent Amber  | `--color-accent`  | `#F59E0B` | Calls to action and highlights |
| Background    | `--color-bg`      | `#F8FAFC` | Page background                |
| Surface White | `--color-surface` | `#FFFFFF` | Cards and panels               |
| Text Dark     | `--color-text`    | `#1E293B` | Body text                      |

### Colour Guidelines

* **Primary Blue:** Used for links, buttons, and active interface states.
* **Accent Amber:** Used for a call to action and highlights.
* **Background:** Used as the main page background.
* **Surface White:** Used for cards, panels, and content containers.
* **Text Dark:** Used for body text and readable content.

### Contrast

The original design system records that text-on-background combinations pass a 4.5:1 contrast ratio check using the WebAIM Contrast Checker.

The current implementation should be checked again, particularly for small text, button labels, status tags, and text placed on coloured backgrounds.

**Minimum contrast requirement:** 4.5:1 for normal text.

## 4. Typography

The original design system defines three text sizes.

| Name    | Size | Weight  | Usage                             |
| ------- | ---: | ------- | --------------------------------- |
| Heading | 24px | Bold    | Screen and section titles         |
| Body    | 16px | Regular | Paragraphs and lists              |
| Small   | 13px | Regular | Captions, labels, and footer text |

**Font family:** To be confirmed from the actual application stylesheet.

### Typography Guidelines

* Use Heading for screen titles and section headings.
* Use Body for primary content, descriptions, and lists.
* Use Small for captions, labels, and secondary information.
* Maintain consistent text hierarchy across all screens.

## 5. Spacing

LaundryLog follows an 8px base spacing unit.

| Token       | Value | Usage                               |
| ----------- | ----: | ----------------------------------- |
| `--space-1` |   8px | Tight spacing between related items |
| `--space-2` |  16px | Screen-edge padding                 |
| `--space-4` |  32px | Standard spacing between sections   |

### Spacing Guidelines

* Use the spacing scale consistently across all screens.
* Keep related elements visually grouped.
* Maintain consistent padding in cards, forms, and panels.
* Use section spacing to distinguish separate content areas.
* Avoid arbitrary spacing values where an existing spacing token is appropriate.

## 6. Reusable Components

The original design system identifies the following reusable components.

### 6.1 Button

**Type:** Atom
**Usage:** Appears throughout the application.

**Properties:**

* `variant`: primary or secondary
* `onClick`
* `children`

**Examples:**

* New Order
* Cancel

**Component states:**

| State    | Expected Appearance                     |
| -------- | --------------------------------------- |
| Normal   | Primary or secondary button appearance  |
| Hover    | Visible pointer-hover feedback          |
| Focused  | Visible keyboard focus indicator        |
| Disabled | Muted appearance and unavailable action |
| Loading  | Loading feedback while processing       |

The hover, focus, disabled, and loading states must be verified against the implemented buttons.

### 6.2 Tag

**Type:** Atom
**Usage:** Order List and Order Detail.

**Properties:**

* `status`
* `color`, mapped from status

Tags display an order's current status.

The original design shows status examples such as Received, Washing, Ready, and Picked up. The current LaundryLog workflow uses:

* Waiting
* Washing
* Drying
* Folding
* Ready
* Completed

| State    | Expected Appearance                                |
| -------- | -------------------------------------------------- |
| Normal   | Coloured label indicating the order status         |
| Hover    | No change unless the tag is interactive            |
| Focused  | Visible focus indicator if interactive             |
| Disabled | Muted appearance if applicable                     |
| Loading  | Placeholder if status information is still loading |

### 6.3 StatusFilter

**Type:** Organism
**Usage:** Order List.

**Properties:**

* `activeStatus`
* `onChange`

The StatusFilter allows staff to display orders according to their current status.

| State    | Expected Appearance                            |
| -------- | ---------------------------------------------- |
| Normal   | Inactive filter styling                        |
| Hover    | Visible hover feedback                         |
| Focused  | Visible keyboard focus indicator               |
| Selected | Primary styling for the active filter          |
| Disabled | Muted and unavailable                          |
| Loading  | Interaction temporarily restricted if required |

### 6.4 Header

**Type:** Organism
**Usage:** All screens.

**Properties:**

* `title`
* `showBackButton`

The Header displays the current screen title and relevant navigation actions.

| State    | Expected Appearance                             |
| -------- | ----------------------------------------------- |
| Normal   | Header with screen title                        |
| Hover    | Hover feedback on interactive controls          |
| Focused  | Visible focus indicator on interactive controls |
| Disabled | Muted disabled controls                         |
| Loading  | Header remains visible while content loads      |

### 6.5 OrderCard

**Type:** Molecule
**Usage:** Order List, repeated once per order.

**Properties:**

* `order`
* `onClick`

The OrderCard presents an order summary, such as the customer's name, service, weight, and status.

| State    | Expected Appearance                   |
| -------- | ------------------------------------- |
| Normal   | Card displaying order details         |
| Hover    | Visual feedback when interactive      |
| Focused  | Visible keyboard focus indicator      |
| Disabled | Muted appearance if unavailable       |
| Loading  | Skeleton or placeholder while loading |

The proposed states above should be compared with the actual implementation and adjusted to match it.

## 7. Interface States

The application should use consistent designs for loading, empty, error, and data states.

### 7.1 Loading State

Used when the application is retrieving data or processing an action.

Expected design:

* Display a loading indicator or placeholder.
* Keep the page structure recognizable.
* Prevent accidental duplicate submissions where appropriate.
* Avoid showing incomplete data as final.

### 7.2 Empty State

Used when there is no data to display or no records match the selected filter.

**Example: Order List**

Suggested message:

"No orders found. Try another filter or create a new order."

The empty state can be created as a separate mockup with sample data. It does not require deleting actual database records.

### 7.3 Error State

Used when an operation fails, information cannot be loaded, or submitted data is invalid.

Expected design:

* Display a clear error message.
* Explain what the user can do next.
* Highlight invalid fields when appropriate.
* Avoid displaying sensitive technical details or server stack traces.

### 7.4 Data State

Used when information has loaded successfully.

Expected design:

* Display actual order, customer, machine, inventory, or payment information.
* Use consistent typography, spacing, and components.
* Clearly display statuses and relevant actions.
* Keep the information organized and readable.

## 8. Responsive Plan

The original design system specifies that no horizontal scrolling should occur at a viewport width of 375px. Layouts should stack into a single column below the responsive breakpoint.

### Desktop

* Display content using the available screen width.
* Keep navigation and important actions accessible.
* Use cards, tables, and sections with consistent spacing.

### Mobile

* Stack content into a single column.
* Display order cards vertically.
* Adapt forms for narrow screens.
* Keep buttons and controls accessible.
* Prevent horizontal scrolling.
* Preserve readability and visual hierarchy.

The responsive mockups should reflect the actual layout of LaundryLog on desktop and mobile screens.

## 9. Accessibility

The original design system includes the following accessibility checks:

* [ ] Every text-on-background pair passes a contrast ratio of at least 4.5:1.
* [ ] Use semantic elements such as `<header>`, `<nav>`, `<main>`, and `<button>`.
* [ ] Every meaningful image has appropriate alternative text.
* [ ] Decorative images use `alt=""`.
* [ ] Every form input has a matching `<label>`.
* [ ] Every link and button is reachable using the Tab key.
* [ ] Interactive elements have visible focus states.

These checks should be performed on the actual application before being marked as verified.

## 10. Implementation in Code

The original design specification proposes CSS custom properties for design tokens.

Example:

```css
:root {
  --color-primary: #2563EB;
  --color-accent: #F59E0B;
  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-text: #1E293B;

  --space-1: 8px;
  --space-2: 16px;
  --space-4: 32px;
}
```

The actual stylesheet path should be confirmed from the repository and documented here.

**Implementation file:** `To be verified against the project stylesheet.`

The values in this document should stay synchronized with the application's actual CSS.

## 11. Visual Design System

The visual design system is supported by the separately prepared PDF and Figma source.

The visual reference should demonstrate:

* Colour swatches with names, hex values, and CSS tokens.
* Typography samples for Heading, Body, and Small.
* The spacing scale.
* Reusable components.
* Component states, including hover, focus, disabled, and loading.
* Responsive layouts.
* Accessibility examples where applicable.

**Visual PDF:** Not currently exported.
**Figma source:** https://www.figma.com/design/wjQzXcK2bsT21CItqNcJrp/LaundryLog-Wireframes?node-id=13-36&t=A4vR3ztlLSA6iEys-1

## 12. Maintenance

Update the design system whenever the application changes its colours, typography, spacing, components, interaction states, or responsive behavior.

The mockups in `02-mockup.md` should follow this document and be compared with the final implemented application.

## 13. Design System Checklist

* [ ] All colours have names, tokens, and hex values.
* [ ] Contrast has been checked.
* [ ] Actual font family has been recorded.
* [ ] Typography sizes match the application.
* [ ] A consistent spacing scale is used.
* [ ] Reusable components are documented.
* [ ] Normal, hover, focus, disabled, and loading states are reviewed.
* [ ] Loading, empty, error, and data states are documented.
* [ ] Desktop and mobile layouts are reviewed.
* [ ] Keyboard accessibility and visible focus states are tested.
* [ ] Documented tokens match the actual code.
* [ ] Visual PDF is exported if required, and Figma source is linked.
