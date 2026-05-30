## Context

The repo uses **Tailwind v4 (CSS-first `@theme`)** + **shadcn/ui (new-york, CSS
variables, `neutral` base)**. Tokens live in `app/globals.css` as OKLCH custom
properties under `:root` / `.dark`, mapped into Tailwind via `@theme inline`. Today
they are shadcn's default achromatic neutrals; no font is configured and `next-themes`
is not installed (the `.dark` class is unmanaged). `architecture/03-ui-ux.md` already
calls for a calm, trustworthy aesthetic and planned `next-themes` dark mode.

Design direction is drawn from a live inspection of **preply.com**:

| Role | Preply (observed) | Hex |
|---|---|---|
| Brand ink / primary | `rgb(18,17,23)` | `#121117` |
| Secondary text | `rgb(56,64,71)` / `rgb(77,76,92)` | `#384047` / `#4D4C5C` |
| Surface (warm) | `rgb(250,249,245)` | `#FAF9F5` |
| Border (light) | `rgb(220,220,229)` | `#DCDCE5` |
| Accent — sky | `rgb(40,133,253)` / `rgb(153,197,255)` | `#2885FD` / `#99C5FF` |
| Accent — mint | `rgb(61,218,190)` / `rgb(123,234,214)` | `#3DDABE` / `#7BEAD6` |
| Accent — pink | `rgb(255,122,172)` | `#FF7AAC` |
| Accent — yellow | `rgb(255,223,61)` | `#FFDF3D` |
| Display font | "Platform" / "Figtree" | → Figtree |
| Body font | "PreplyInter" | → Inter |
| Button radius / padding / weight | — | `8px` / `6px 28px` / `600` |

## Goals / Non-Goals

**Goals:**
- One source of truth for color, type, spacing, radius, elevation as Tailwind v4 tokens.
- Light + dark themes with full semantic coverage and ≥4.5:1 body-text contrast.
- A Preply-inspired identity: ink primary, warm neutrals, playful accent pops.
- Real `next-themes` theming (system default, persisted, no flash) + a toggle.
- Self-hosted Inter + Figtree via `next/font/google`.

**Non-Goals:**
- Redesigning or restyling existing pages/components (incremental follow-up).
- Building new component variants beyond what shadcn already ships.
- Licensing Preply's proprietary "Platform"/"PreplyInter" fonts — we use look-alike
  Google fonts (Figtree/Inter), not Preply's assets, and only borrow the *language*.

## Decisions

**1. Keep OKLCH + shadcn semantic-token shape.** Extend the existing `:root`/`.dark`
structure rather than inventing a parallel system — shadcn components already bind to
these names. Convert the Preply hex values to OKLCH for perceptual consistency with the
current file.

Proposed semantic tokens (illustrative OKLCH; tune during apply):

```css
:root {
  --radius: 0.5rem;                      /* 8px base, was 0.625rem */
  --background: oklch(1 0 0);            /* #FFFFFF */
  --foreground: oklch(0.17 0.01 285);   /* #121117 ink */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.17 0.01 285);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.17 0.01 285);
  --primary: oklch(0.17 0.01 285);      /* ink */
  --primary-foreground: oklch(0.99 0 0);
  --secondary: oklch(0.97 0.004 90);    /* warm #FAF9F5 surface */
  --secondary-foreground: oklch(0.17 0.01 285);
  --muted: oklch(0.97 0.004 90);
  --muted-foreground: oklch(0.45 0.01 285);  /* ~#4D4C5C */
  --accent: oklch(0.70 0.13 250);       /* sky #2885FD as semantic accent */
  --accent-foreground: oklch(0.17 0.01 285);
  --destructive: oklch(0.62 0.20 12);   /* warm red */
  --destructive-foreground: oklch(0.99 0 0);
  --border: oklch(0.90 0.005 285);      /* #DCDCE5 */
  --input: oklch(0.90 0.005 285);
  --ring: oklch(0.70 0.13 250);         /* sky focus ring */
}
.dark {
  --background: oklch(0.17 0.01 285);   /* near-ink */
  --foreground: oklch(0.98 0 0);
  --card: oklch(0.21 0.01 285);
  --primary: oklch(0.98 0 0);           /* inverted: light primary on dark */
  --primary-foreground: oklch(0.17 0.01 285);
  --secondary: oklch(0.27 0.01 285);
  --muted: oklch(0.27 0.01 285);
  --muted-foreground: oklch(0.72 0.01 285);
  --accent: oklch(0.75 0.12 250);       /* brighter sky for dark */
  --border: oklch(1 0 0 / 12%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.75 0.12 250);
  /* …remaining tokens mirror :root, inverted */
}
```

**2. Named accent palette + chart tokens.** Add brand accents and reuse them as the
data-viz series (Recharts already consumes `--chart-*`):

```css
@theme inline {
  --color-brand-sky:    oklch(0.70 0.13 250);  /* #2885FD */
  --color-brand-mint:   oklch(0.82 0.13 175);  /* #3DDABE */
  --color-brand-pink:   oklch(0.74 0.16 5);    /* #FF7AAC */
  --color-brand-yellow: oklch(0.90 0.16 95);   /* #FFDF3D */
  --color-chart-1: var(--color-brand-sky);
  --color-chart-2: var(--color-brand-mint);
  --color-chart-3: var(--color-brand-pink);
  --color-chart-4: var(--color-brand-yellow);
  --color-chart-5: var(--primary);
}
```

**3. Typography: Inter (body) + Figtree (display) via `next/font/google`.** Load both
in `app/[locale]/layout.tsx`, assign CSS variables (`--font-sans`, `--font-display`),
and map them in `@theme`. Chosen because they closely match Preply's PreplyInter +
Figtree/Platform, are free/open, and `next/font` self-hosts them (no FOUT, no external
request). Alternative considered: a single family — rejected, the display/body contrast
is part of the Preply feel. Type scale (display 3rem+, h1 2.25rem … caption 0.75rem)
defined as `--text-*` tokens with paired line-heights.

**4. Theming via `next-themes`.** `attribute="class"`, `defaultTheme="system"`,
`enableSystem`, `disableTransitionOnChange`. Wrap the locale layout in a
`ThemeProvider` (`components/theme-provider.tsx`) and add a `suppressHydrationWarning`
on `<html>` to avoid the theme-flash. Add a small `ThemeToggle` (shadcn dropdown +
lucide sun/moon). Alternative considered: hand-rolled `localStorage` + class toggling —
rejected; `next-themes` already solves SSR flash and system sync and is the documented
plan in `03-ui-ux.md`.

**5. Spacing & elevation.** Adopt Tailwind's default 4px spacing scale (no override —
it already matches the generous Preply rhythm via consistent `gap`/`p` usage) and
define `--shadow-sm/md/lg` elevation tokens for cards/popovers tuned softer than
Tailwind defaults to match Preply's gentle depth.

## Risks / Trade-offs

- **OKLCH values are approximations of Preply hex** → verify each converted token with a
  contrast checker during apply; treat the table above as a starting point, not final.
- **Theme flash (FOUT/FOIT) on first paint** → mitigated by `next-themes`
  `disableTransitionOnChange` + `suppressHydrationWarning` + `next/font` self-hosting.
- **Two web fonts add weight** → mitigated by subsetting (`latin` + `latin-ext` for
  Ukrainian), `display: "swap"`, and loading only required weights.
- **Changing `--radius` (0.625→0.5rem) shifts existing component corners** → intended,
  but visually review existing shadcn components after the change.
- **Borrowed-look vs. trademark** → we replicate a *style* with our own open fonts and
  tuned colors; we do not copy Preply logos, proprietary fonts, or assets.

## Migration Plan

1. Add `next-themes`; wire `ThemeProvider` + `next/font` in the locale layout.
2. Replace token blocks in `app/globals.css`; add accent/chart/elevation + `@theme` maps.
3. Add `ThemeToggle`; update `components.json` notes; update `architecture/03-ui-ux.md`.
4. Visual smoke-check key screens in light + dark; run `pnpm lint && typecheck && test`.
   Rollback = revert the CSS/layout commits (tokens are additive/isolated).

## Open Questions

- Do we want a separate warm-cream `background` in light mode (Preply uses `#FAF9F5`
  for sections) or keep pure white `#FFFFFF` for the base and reserve cream for
  `secondary`/sections? (Leaning: white base, cream as `secondary`/`muted`.)
- Confirm the Ukrainian (`uk`) locale renders well in Figtree/Inter Cyrillic subsets.
