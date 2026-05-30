# 03 — UI / UX

The product is auth-gated and reflective in tone: calm, readable, trustworthy. The UI should
feel like a private journal, not a dashboard tool.

---

## Component system — shadcn/ui

- **shadcn/ui** = Tailwind + Radix primitives, copy-pasted into `components/ui/` (we own the
  code, not a black-box dependency). Accessible by default (Radix), themeable via CSS
  variables.
- Composed feature components live in `components/<feature>/` and build on the `ui/` primitives.
- **Base color:** `components.json` records `baseColor: "neutral"` as the generator seed, but
  the realized base is the custom Preply-inspired ink + warm-neutral set in `app/globals.css`.
  Because `cssVariables: true`, anything added via `shadcn add` binds to our semantic tokens
  automatically — do not re-run with a different base color or hand-edit generated colors.
- **Recharts** for the analytics dashboard, styled to the same token set.
- Why shadcn over Ant Design: it composes with what the design already chose (Tailwind,
  next-themes, Recharts), keeps the bundle lean, and gives full control over the reflective
  visual tone. Ant Design's batteries-included speed wasn't worth its heavier, more
  opinionated styling and separate theming/i18n systems here.

### Design tokens & theming — the realized kit

The kit is a Preply-inspired visual language: a near-black ink primary, warm-neutral
surfaces, moderate ~8px rounding, and restrained accent pops. All tokens live in
**`app/globals.css`** as OKLCH custom properties under `:root` / `.dark`, mapped into
Tailwind v4 via `@theme inline`. **Consume tokens through utilities — never hard-code a
color, font, or size literal.** The `/design` route renders the full kit for visual review
in both themes.

**Color (semantic).** The standard shadcn set — `background`, `foreground`, `card`,
`popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`,
`ring` (+ their `-foreground` pairs) — defined for both `:root` and `.dark`. `primary` is
the ink `#121117`; `accent`/`ring` are a deepened sky tuned so white text clears WCAG AA
(≥4.5:1). Parity and contrast are enforced by `tests/design-tokens.test.ts` and
`tests/design-contrast.test.ts`.

**Brand accents & data-viz.** Named tokens `--color-brand-{sky,mint,pink,yellow}` for
highlights and illustrations; `--color-chart-1..5` map onto the four accents + `primary`, so
Recharts inherits the palette. Use `bg-brand-sky`, `text-brand-mint`, etc.

**Typography.** Body = **Inter** (`font-sans`), display/headings = **Figtree**
(`font-display`), both self-hosted via `next/font/google` (no FOUT, Cyrillic via
`latin-ext`). Headings default to the display family. Use the paired size/line-height scale
tokens (`text-display`, `text-h1`…`text-h4`, `text-body`, `text-small`, `text-caption`) — not
arbitrary pixel values.

**Radius & elevation.** Single `--radius: 0.5rem` (~8px) source; `sm/md/lg/xl` derive from
it. Softer-than-default `shadow-sm/md/lg` elevation tokens for gentle depth.

**Theming.** `next-themes` via `components/theme-provider.tsx` (`attribute="class"`,
`defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`); `<html>` carries
`suppressHydrationWarning` to avoid a theme flash. `components/theme-toggle.tsx` (shadcn
dropdown + lucide sun/moon) is the user-facing control. System default, user-toggleable,
preference persisted; charts and tokens both have light/dark variants.

### First-class UX states

Every async surface explicitly handles four states (per the `app-ux` spec):

```
loading  ─  "Analyzing… this takes a moment"   (skeleton / spinner)
ready    ─  the reflection
failed   ─  human-readable reason + Retry action
empty    ─  not-yet-ready / no-decisions-yet, with a clear next step
```

The `processing` state is designed to read as *intentional* (reflection takes thought), so
LLM latency feels like product behaviour, not lag.

---

## Internationalization (English + Ukrainian)

- **next-intl** for the App Router. UI strings live in `messages/en.json` and
  `messages/uk.json`; components consume them via `useTranslations` / `getTranslations`.
- **Locale routing:** `app/[locale]/...` segment. A language switcher sets the active locale;
  preference persists (cookie) and the unmatched/default locale resolves cleanly. (`en` is the
  default; `uk` is fully supported.)
- **Formatting:** dates, numbers, and relative times go through next-intl's formatters so they
  are locale-correct in both languages.
- **Controlled taxonomies are translated, not regenerated:** decision categories and the
  8 cognitive biases are fixed enums, so their *labels and explanations-of-the-bias-name* are
  translated in `messages/*`. The underlying enum value stored in the DB stays language-neutral
  — which is exactly why filtering and the dashboard remain deterministic across locales.

### The LLM-output localization decision

This is the subtle part. The analysis has two kinds of text:

```
┌─ enum-backed (category, bias names) ─────┐   translated in messages/*.json (UI layer)
│                                          │   DB stores the neutral enum value
└──────────────────────────────────────────┘

┌─ free-form (missed alternatives, premortem
│  risks, assumptions, warning signs) ─────┐   GENERATED by the LLM in the user's locale
└──────────────────────────────────────────┘   → pass `locale` into the `analyze` node prompt
```

So: **UI chrome is localized via next-intl; the agent's free-form prose is produced in the
user's selected language** by passing the locale into the prompt. A Ukrainian user gets
Ukrainian reflections; the category/bias filters and dashboard still aggregate on the
language-neutral enums.

> **Consequence to track:** a re-analysis after switching language will produce free-form text
> in the new language while older versions remain in the original — which is acceptable
> (version history is a record of what was said at the time), but worth a small UI note.

---

## Accessibility & responsiveness

- Radix primitives give keyboard nav, focus management, and ARIA out of the box; the lint
  config includes a11y rules.
- Responsive web (mobile → desktop); no native apps (a stated non-goal).
- Color choices meet contrast in both themes; status colors (processing/ready/failed) are
  paired with text/icon, not color alone.
</content>
