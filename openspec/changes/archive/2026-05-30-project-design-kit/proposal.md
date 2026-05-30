## Why

The app currently ships shadcn/ui's default achromatic "neutral" tokens (grayscale
OKLCH values, no brand identity, no configured typeface). DecisionMirror is a calm,
trustworthy "private journal" product that needs a distinct, consistent visual
language before more UI is built — otherwise every new screen re-litigates color,
spacing, and type decisions ad hoc. Establishing a single source of truth for design
tokens now keeps the growing component surface coherent and themeable (dark/light).

We take visual inspiration from [preply.com](https://preply.com/): a warm,
high-contrast aesthetic built on a near-black ink as the brand primary, clean
white/cream surfaces, a friendly Inter/Figtree-style type pairing, moderately rounded
corners (~8px), generous spacing, and restrained pops of accent color (sky, mint,
pink, yellow). This reads as approachable and trustworthy — a good fit for a reflective
decision-support tool.

## What Changes

- Define the **color system** as CSS variables for both light and dark themes
  (background, foreground, card, popover, primary, secondary, muted, accent,
  destructive, border, input, ring, plus chart/data-viz colors), replacing the default
  neutral palette with a Preply-inspired ink + warm-neutral + accent scheme.
- Define a small set of **brand accent colors** (sky, mint, pink, yellow) as named
  tokens for highlights, illustrations, and data visualization.
- Define the **typography scale**: a display/heading family (Figtree-style) and a body
  family (Inter-style) wired via `next/font/google`, plus font-size / line-height /
  weight tokens for headings and body text.
- Define the **spacing, radius, and elevation** conventions (base spacing scale,
  border-radius tokens centered on ~8px, shadow/elevation tokens).
- Wire **dark/light theming** with `next-themes` (system default, user-toggleable,
  persisted) — replacing the unmanaged `.dark` class with a real theme provider.
- Document the design kit so contributors apply tokens instead of hard-coded values.

This change introduces tokens and theming infrastructure only. It does **not**
redesign existing pages; migrating ad-hoc styles to tokens is incremental follow-up.

## Capabilities

### New Capabilities
- `design-system`: The project's visual design language — color tokens (light/dark),
  brand accent palette, typography scale and font wiring, spacing/radius/elevation
  scales, and the dark/light theming mechanism — exposed as Tailwind v4 `@theme`
  tokens and consumed by shadcn/ui components.

### Modified Capabilities
<!-- None: no existing spec's requirements change. project-foundation describes stack
     choices but not concrete design tokens; this adds a dedicated capability. -->

## Impact

- **Code**: `app/globals.css` (token definitions, `@theme` mappings), the locale
  `app/[locale]/layout.tsx` (font wiring + `ThemeProvider`), `components.json`
  (base color reference), a new `components/theme-provider.tsx` and theme-toggle.
- **Dependencies**: add `next-themes`; fonts via `next/font/google` (no new runtime
  dep). No new heavy UI libraries — reuse existing shadcn primitives.
- **Docs**: update `architecture/03-ui-ux.md` to reference the realized token set.
- **Systems**: Recharts/data-viz pick up the new chart color tokens. No data model,
  API, auth, or agent impact.
