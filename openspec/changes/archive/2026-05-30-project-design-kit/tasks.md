## 1. Dependencies & fonts

- [x] 1.1 Add `next-themes` to `package.json` and install via `pnpm`
- [x] 1.2 Configure Inter (body) and Figtree (display) in `app/[locale]/layout.tsx` via
  `next/font/google` with `display: "swap"`, `latin` + `latin-ext` subsets, and CSS
  variables `--font-sans` / `--font-display`; apply the variables to `<html>`/`<body>`

## 2. Color tokens (light + dark)

- [x] 2.1 Write a failing test asserting that for every semantic token defined under
  `:root` in `app/globals.css` an equivalent is defined under `.dark` (parse the CSS)
- [x] 2.2 Replace the neutral `:root` semantic tokens with the Preply-inspired ink +
  warm-neutral OKLCH values from `design.md`
- [x] 2.3 Replace the `.dark` semantic tokens with the inverted dark values; make 2.1 pass
- [x] 2.4 Write a failing contrast test (e.g. via a WCAG contrast util) covering
  `foreground`/`background`, `primary-foreground`/`primary`,
  `muted-foreground`/`muted`, `accent-foreground`/`accent` in both themes at ≥4.5:1
- [x] 2.5 Tune token values until the contrast test passes in light and dark

## 3. Accent palette & data-viz tokens

- [x] 3.1 Add `--color-brand-sky|mint|pink|yellow` to the `@theme` block in `globals.css`
- [x] 3.2 Map `--color-chart-1..5` to the brand accents + primary so Recharts inherits them
- [x] 3.3 Add a test asserting the four brand accent utilities resolve to defined colors

## 4. Typography scale

- [x] 4.1 Define `--text-*` size tokens with paired line-heights (display → caption) and
  map the display/body families in the `@theme` block; default headings to the display
  family and body to Inter
- [x] 4.2 Add a small typography sample/reference (e.g. a route or Storybook-style page)
  rendering each scale step to verify the scale visually

## 5. Spacing, radius & elevation

- [x] 5.1 Set `--radius: 0.5rem` and confirm the `sm/md/lg/xl` derivations in `@theme`
- [x] 5.2 Add `--shadow-sm/md/lg` elevation tokens and map them in `@theme`
- [x] 5.3 Visually verify default shadcn button/card corners reflect ~8px rounding

## 6. Theming mechanism

- [x] 6.1 Create `components/theme-provider.tsx` wrapping `next-themes` with
  `attribute="class"`, `defaultTheme="system"`, `enableSystem`,
  `disableTransitionOnChange`
- [x] 6.2 Wrap the locale layout in `ThemeProvider`; add `suppressHydrationWarning` to
  `<html>` to prevent theme flash
- [x] 6.3 Write a failing test for a `ThemeToggle` component (renders, cycles
  light/dark/system, calls `setTheme`) with `next-themes` mocked
- [x] 6.4 Implement `components/theme-toggle.tsx` (shadcn dropdown + lucide sun/moon) and
  make 6.3 pass; place the toggle in the app shell/header

## 7. Documentation & gate

- [x] 7.1 Document the design kit (tokens, accents, type scale, usage rules) — update
  `architecture/03-ui-ux.md` to reference the realized token set
- [x] 7.2 Note the realized base color in `components.json` / project docs so future
  shadcn additions inherit the tokens
- [x] 7.3 Run `pnpm lint && pnpm typecheck && pnpm test` and smoke-check key screens in
  both light and dark themes
