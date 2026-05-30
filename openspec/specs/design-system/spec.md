# design-system Specification

## Purpose

Defines the Decision Mirror design kit: a token-driven visual system layered on
shadcn/ui. It establishes semantic color tokens for light and dark themes, a brand accent
palette, a typography scale wired through `next/font`, spacing/radius/elevation tokens, a
dark/light theming mechanism, and the rule that tokens are the single source of truth for
all UI styling.

## Requirements

### Requirement: Semantic color tokens for light and dark themes

The system SHALL define a complete set of semantic color tokens — `background`,
`foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `primary`,
`primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`,
`accent`, `accent-foreground`, `destructive`, `destructive-foreground`, `border`,
`input`, and `ring` — as CSS custom properties, with a distinct value for each token
in both the light theme (`:root`) and the dark theme (`.dark`). Every token defined for
light MUST also be defined for dark. The brand primary SHALL be a near-black ink in
light mode (Preply-inspired `#121117`) rather than the default neutral gray.

#### Scenario: Both themes define every semantic token

- **WHEN** the global stylesheet is loaded
- **THEN** each semantic token name has a defined value under `:root`
- **AND** each of those same token names has a defined value under `.dark`
- **AND** no semantic token is left at its shadcn default neutral value

#### Scenario: Text on every surface meets contrast

- **WHEN** any `*-foreground` token is rendered on its paired surface token (e.g.
  `foreground` on `background`, `primary-foreground` on `primary`)
- **THEN** the contrast ratio is at least 4.5:1 for body text in both light and dark
  themes

### Requirement: Brand accent palette

The system SHALL expose a named brand accent palette — at minimum sky/blue, mint/teal,
pink, and yellow (Preply-inspired) — as Tailwind theme color tokens usable for
highlights, illustrations, and data visualization, in addition to the semantic
`accent` token. These accents SHALL have values tuned for legibility on both light and
dark surfaces.

#### Scenario: Accent tokens are available as utilities

- **WHEN** a developer uses an accent token (e.g. a `bg-` or `text-` utility for the
  sky accent)
- **THEN** Tailwind resolves it to the defined accent color
- **AND** the same named accents are available for chart/data-viz series

### Requirement: Typography scale and font wiring

The system SHALL define a display/heading font family and a body font family loaded via
`next/font/google` (Figtree-style display + Inter-style body, mirroring Preply), and
SHALL expose a typographic scale (font sizes, line heights, and weights) covering at
least display, heading levels, body, and caption. Heading elements SHALL use the
display family and body text SHALL use the body family by default.

#### Scenario: Fonts are applied without layout shift

- **WHEN** any page renders
- **THEN** the body family is applied to body text and the display family to headings
- **AND** fonts are self-hosted via `next/font` (no render-blocking external font
  request and no uncontrolled FOUT)

#### Scenario: Type scale tokens are consumed, not hard-coded

- **WHEN** a component needs a heading or body size
- **THEN** it uses a defined type-scale token/utility rather than an arbitrary pixel
  value

### Requirement: Spacing, radius, and elevation tokens

The system SHALL define a base spacing scale, a set of border-radius tokens centered on
a moderate ~8px corner (Preply-inspired), and elevation/shadow tokens. shadcn/ui
components SHALL derive their radii from the radius tokens (via the `--radius` variable
and its `sm`/`md`/`lg`/`xl` derivations).

#### Scenario: Radius flows from a single source

- **WHEN** the base `--radius` token is changed
- **THEN** the derived radius tokens and component corners update consistently
- **AND** default button/card corners reflect the ~8px moderate-rounding convention

### Requirement: Dark/light theming mechanism

The system SHALL provide a theme provider that supports `light`, `dark`, and `system`
modes, defaults to following the OS preference, persists the user's explicit choice,
and toggles the `.dark` class on the document root. A user-facing control SHALL allow
switching the theme. Theme resolution MUST NOT cause a flash of incorrect theme on
initial load.

#### Scenario: System preference is the default

- **WHEN** a first-time visitor with OS dark mode loads the app
- **THEN** the app renders in dark theme without a flash of light theme

#### Scenario: Explicit choice persists across reloads

- **WHEN** the user selects light or dark via the theme control
- **THEN** that choice is persisted
- **AND** the same theme is applied on the next visit regardless of OS preference

### Requirement: Tokens are the single source of truth

UI code SHALL consume design tokens (semantic color tokens, accent tokens, type-scale,
spacing, radius, elevation) rather than hard-coded color, font, or size literals. The
design kit SHALL be documented so contributors know which token to apply.

#### Scenario: New component uses tokens

- **WHEN** a new component is added
- **THEN** it references semantic/accent/scale tokens
- **AND** it requires no change to render correctly in both light and dark themes
