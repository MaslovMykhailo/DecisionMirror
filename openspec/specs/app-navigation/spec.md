# app-navigation Specification

## Purpose

Define the shared authenticated navigation surface for Decision Mirror: a single navigation bar
rendered across all authenticated pages that exposes the primary destinations and interface
controls, and adapts responsively to small screens.

## Requirements

### Requirement: Shared authenticated navigation bar

The system SHALL provide a single shared navigation bar rendered on every authenticated page —
the home/capture page, the decision history list, the decision detail view, and the analytics
dashboard. The navigation bar MUST present a control that returns the user to the home/capture
page, and links to the analytics dashboard and the decision history list, alongside the language
control, the theme control, and the logout control.

#### Scenario: Navigation bar appears on every authenticated page

- **WHEN** an authenticated user opens the home/capture, history, decision detail, or analytics page
- **THEN** the same navigation bar is rendered on that page
- **AND** it exposes a home/capture link, a dashboard link, a history link, the language control,
  the theme control, and the logout control

#### Scenario: Return to home from a deep page

- **WHEN** an authenticated user is on the history, decision detail, or analytics page
- **THEN** the navigation bar provides a control that navigates back to the home/capture page

#### Scenario: Active destination is reflected

- **WHEN** an authenticated user is on a page that the navigation bar links to
- **THEN** the navigation control for the current page is marked as the active destination

### Requirement: Responsive compact navigation on small screens

The navigation bar SHALL adapt to small (mobile) viewports with a compact layout that keeps every
navigation destination reachable without horizontal overflow.

#### Scenario: Compact layout on mobile

- **WHEN** the navigation bar is rendered on a small (mobile) viewport
- **THEN** the bar lays out without horizontal overflow
- **AND** every navigation destination remains reachable

#### Scenario: Full layout on wide screens

- **WHEN** the navigation bar is rendered on a wide (desktop) viewport
- **THEN** the navigation destinations and controls are presented inline
