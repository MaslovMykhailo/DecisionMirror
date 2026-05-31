## Context

The UI works but has accumulated layout and navigation debt. The home/capture page
(`app/[locale]/page.tsx`) defines a header inline with Dashboard / History / Language / Theme /
Logout — but that header lives only on the home page. The history (`app/[locale]/decisions/page.tsx`)
and analytics (`app/[locale]/analytics/page.tsx`) pages have no shared header at all, so there is
no way back to capture a decision. Those two pages also wrap content in
`mx-auto grid min-h-screen … gap-8`; a grid container with a min-height and a single child row
stretches the row (and its nested cards/rows) to fill the viewport, which is the root cause of the
broken empty states and the large vertical gaps in the screenshots. The home page does not have
this problem because it uses `flex min-h-screen flex-col`, where children keep their natural
height and slack collects at the bottom.

The theme (`components/theme-toggle.tsx`, `next-themes`) and language
(`components/language-switcher.tsx`, `next-intl`) controls already exist and work; they are simply
not mounted on the login/signup pages, and the language `<select>` uses `px-2 py-1` which is
shorter than the `size-9` icon button and `size="sm"` buttons next to it. Analysis "complexity" is
already computed by `deriveDecisionComplexity` in `lib/decisions/history.ts` and carried on
`DecisionHistoryItem.complexity`, but it is only used for sorting — never displayed.

Constraints from `AGENTS.md` / `CLAUDE.md`: TDD is mandatory (failing component test first), tests
are offline and deterministic, all UI strings localized in `en` + `uk` catalogs with catalog
completeness enforced by the test gate, no decision content in telemetry, reuse existing shadcn
primitives and existing components over adding dependencies.

## Goals / Non-Goals

**Goals:**
- One shared navigation component mounted on home, history, detail, and analytics pages, with a
  clear path back to home/capture and an active-destination indicator.
- A compact, non-overflowing navigation layout on mobile.
- Theme + language controls on the login and signup pages.
- Language switcher control height aligned with adjacent buttons.
- History and analytics pages laid out from the top without stretched empty states or large gaps.
- Complexity displayed on ready history rows and on the decision detail view.

**Non-Goals:**
- No change to the analysis pipeline, agent, Zod schema, Prisma schema, or how complexity is
  derived.
- No new UI dependency; reuse the existing `Button`, `DropdownMenu`, `ThemeToggle`,
  `LanguageSwitcher`, and i18n navigation helpers.
- No redesign of the capture form, charts, or filter controls beyond the layout container fix.
- No new telemetry beyond reusing existing client-event patterns.

## Decisions

### 1. Extract a shared `AppNav` component rather than duplicate the header
Create `components/app-nav.tsx` (a client component, since it composes the client `ThemeToggle`,
`LanguageSwitcher`, and `LogoutButton` and needs `usePathname` for the active state). It renders
the app name/home link plus Dashboard, History, Language, Theme, and Logout, reusing the exact
markup currently inlined in `app/[locale]/page.tsx`. The home page's app name becomes the
home/capture link so "back to home" is satisfied everywhere. Each linked page mounts `<AppNav />`
at the top of its container.

- *Why:* single source of truth for navigation; fixes "no way back to home" on history/analytics
  in one place.
- *Alternative considered:* a shared route-group `layout.tsx` that wraps the authenticated pages.
  Rejected for this change because the authenticated pages do not currently share a layout segment
  and introducing one risks touching the login/signup layout boundary; mounting `<AppNav />`
  per-page is a smaller, more obvious diff. The component itself can later be lifted into a layout.

### 2. Active-destination indication via `usePathname`
`AppNav` reads the current pathname (locale-aware, from `@/lib/i18n/navigation`) and marks the
matching destination (e.g. `aria-current="page"` and a distinct button variant). Home is active
when the path is the locale root.

- *Why:* spec requires the active destination to be reflected; `aria-current` keeps it accessible
  and testable.

### 3. Mobile compactness with Tailwind responsive classes, no new menu primitive
Keep the controls inline but allow them to wrap/compact via responsive utilities: the nav is
`flex flex-wrap items-center gap-2` on small screens and inline on `sm:`+. Text labels on the
Dashboard/History buttons collapse to icon-only on the smallest breakpoint (`<span className="sr-only sm:not-sr-only">`)
so the row fits without horizontal overflow. The screenshot shows wrapping already works; we make
it intentional and overflow-free.

- *Why:* avoids adding a hamburger/Sheet primitive (not currently in the project) and keeps the
  change minimal while meeting the "compact, no overflow, all destinations reachable" requirement.
- *Alternative considered:* a collapsible drawer/Sheet menu. Rejected as over-engineering for five
  controls; revisit if the nav grows.

### 4. Fix layout by switching the page containers from stretched grid to flex column
Change history and analytics page wrappers from
`mx-auto grid min-h-screen … gap-8` to `mx-auto flex min-h-screen … flex-col gap-8`, matching the
home page. Flex column children keep natural height and slack collects at the bottom, so empty
states and rows render at natural height with no injected gaps. The inner `section className="grid gap-6"`
components are unchanged.

- *Why:* the grid-with-min-height stretch is the exact root cause; flex column is the proven
  pattern already used by the home page.
- *Alternative considered:* `content-start`/`items-start` on the grid. Works, but diverges from the
  home page; using the same flex pattern keeps the three pages consistent.

### 5. Auth pages get theme + language via the existing controls
Mount `ThemeToggle` and `LanguageSwitcher` on the login/signup pages — placed in a small top
corner row above the auth form (or in the shared auth area). They work pre-auth because
`next-themes` is client-side and `next-intl` locale routing/cookie does not require a session.

- *Why:* reuse working controls; the spec only asks that they be present and take effect pre-auth.

### 6. Language switcher alignment
Give the `<select>` in `LanguageSwitcher` a control height matching the buttons (`h-9` / `size-9`
equivalent, e.g. `h-9` and consistent padding/border-radius) instead of `py-1`. Keep the optional
visible label, but ensure the control box aligns on the row.

- *Why:* smallest fix that satisfies the alignment scenario; no structural change to the switcher.

### 7. Complexity display reuses derived value; add a small presentational treatment
History rows and the detail view read the already-present complexity number. Render it with a
localized label (e.g. "Complexity: N"). Optionally map the raw count to a qualitative band
(low/moderate/high) for readability, but the normative requirement is only that the number-derived
complexity is shown for ready analyses and omitted otherwise. New `en`/`uk` catalog strings under
the relevant namespaces (e.g. `DecisionHistory`, decision detail namespace) for the label.

- *Why:* no schema/data change needed; only presentation. Keeping it driven off the existing
  `complexity` field avoids recomputation and keeps list/detail consistent.

## Risks / Trade-offs

- **[`AppNav` is a client component mounted on server pages]** → That is already how the home page
  composes these client controls; mounting one client component inside a server page is supported
  and unchanged in cost.
- **[Icon-only nav buttons on mobile reduce label clarity]** → Keep accessible names via `sr-only`
  text and `aria-label`; tooltips not required by spec.
- **[Adding controls to auth pages could shift the centered login layout]** → Place them in a
  non-flow top row (or header strip) so the form stays centered; cover with a component test that
  the controls render alongside the form.
- **[Catalog completeness gate]** → Every new string must be added to both `en` and `uk` or the
  test gate fails; add them together.
- **[Layout container change could affect footer/scroll on long pages]** → `min-h-screen` is
  retained so short pages still fill the screen; only the stretch behavior changes. Verify both
  empty and populated states.

## Migration Plan

No data migration. Pure frontend change. Ship behind no flag. Rollback is reverting the component
and page edits; no persisted state is affected.

## Open Questions

- Should complexity be shown as a raw count or a qualitative band (low/moderate/high)? Default to
  showing the count with a localized label; banding can be a follow-up if desired.
- Should `AppNav` eventually move into a shared authenticated route-group layout? Out of scope here;
  the extracted component makes that trivial later.
