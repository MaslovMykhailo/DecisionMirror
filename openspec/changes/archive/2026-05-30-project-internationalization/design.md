## Context

Decision Mirror is a greenfield Next.js 16 (App Router) + TypeScript app. The skeleton from
`project-foundation` already reserves a `messages/` directory and a `lib/i18n/` directory, but
both are empty (`.gitkeep` only) and `next-intl` is not yet installed. The product requires a
fully localized UI in **English (default) + Ukrainian**, with controlled taxonomies
(`domain-taxonomy`: a fixed category enum + 8 cognitive biases) displayed as translated labels
while stored and aggregated as language-neutral identifiers.

This change is the i18n **foundation** — section 2 of the parent `build-decision-mirror`
breakdown, extracted so it lands before feature UIs (capture form, history, dashboard, UX
states) are built against hard-coded strings. The architecture is already fixed by
`ARCHITECTURE.md` / `architecture/02-stack.md` / `architecture/03-ui-ux.md`: next-intl with an
`app/[locale]/…` segment, messages in `messages/en.json` + `messages/uk.json`, cookie-persisted
preference, `en` default.

Constraint: the project quality gate is offline and deterministic (`pnpm lint && pnpm typecheck
&& pnpm test`), TDD is mandatory, and tests must not depend on a network or a real model. The
i18n layer must therefore be testable offline — message-key parity and taxonomy-label coverage
are unit-testable assertions.

## Goals / Non-Goals

**Goals:**

- Install and configure next-intl for the App Router using the current API
  (`defineRouting` + `createNavigation` + `getRequestConfig` + middleware).
- Move the app under an `app/[locale]/…` segment with per-request locale negotiation.
- Persist the chosen locale across sessions via a cookie; resolve unsupported/missing locales to
  `en`.
- Scaffold `messages/en.json` + `messages/uk.json` with initial UI-chrome namespaces and the
  controlled-taxonomy labels keyed by language-neutral identifiers.
- Provide shared, typed formatting access (dates, numbers, relative times) and a language
  switcher.
- Make message-key parity and taxonomy-label completeness assertable in the offline gate.

**Non-Goals:**

- Generating the agent's free-form LLM prose in the user's locale (owned by the agent change;
  this layer only guarantees the active locale is available to pass downstream).
- Any auth/feature UI strings beyond the minimal chrome needed to exercise the foundation.
- Adding locales beyond `en`/`uk`, or locale-prefix SEO strategies beyond the default.
- Translating data the LLM produces as free-form text, or storing labels in the DB.

## Decisions

### D1 — next-intl with a single routing source of truth

Use `lib/i18n/routing.ts` exporting `defineRouting({locales: ['en','uk'], defaultLocale: 'en'})`
as the one place locales are declared; `lib/i18n/navigation.ts` derives `Link`/`redirect`/
`usePathname`/`useRouter` via `createNavigation(routing)`; `middleware.ts` uses next-intl's
middleware for locale negotiation. This satisfies the spec's "single source of truth" requirement
and keeps the switcher, request config, and routing from drifting.

- *Alternatives considered:* hand-rolled locale context + manual `Intl.*` calls (re-implements
  next-intl's formatters and message loading, more code, loses type-safety); `next-i18next`
  (Pages-Router-oriented, weaker App Router/Server Component story).

### D2 — `app/[locale]/…` segment + request config from the segment, cookie as persistence

Relocate `app/layout.tsx` + `app/page.tsx` under `app/[locale]/`. `lib/i18n/request.ts` uses
`getRequestConfig(async ({requestLocale}) => …)`, validating the requested segment with
`hasLocale(routing.locales, …)` and falling back to `defaultLocale`. The middleware reads/writes a
locale cookie so a returning user lands on their prior language; the segment is the routing truth,
the cookie is the persistence mechanism. The root layout wraps children in
`NextIntlClientProvider` so Client Components (switcher, polling hooks later) get messages.

- *Alternatives considered:* cookie-only with no locale segment (loses shareable per-locale URLs
  and clean static rendering per locale); `localePrefix: 'as-needed'` to hide the default prefix
  (defer — adds redirect edge-cases; revisit if the bare `/` UX matters for the demo).

### D3 — Message catalog structure: namespaced chrome + taxonomy labels keyed by enum id

`messages/en.json` and `messages/uk.json` share an identical key tree: UI-chrome namespaces
(e.g. `Common`, `Nav`, `LanguageSwitcher`, `UXState` for loading/error/empty copy) plus
`Taxonomy.category.<id>` and `Taxonomy.bias.<id>` entries keyed by the **language-neutral
identifiers** imported conceptually from `domain-taxonomy`. The DB never stores a label; the UI
resolves `id → label` through the catalog, so filtering/aggregation stay deterministic across
locales (spec: "Aggregation is language-independent").

- *Alternatives considered:* storing labels alongside enums in code constants (duplicates the
  translation surface and bypasses next-intl tooling/typing); a flat key namespace (harder to keep
  feature ownership clear as the app grows).

### D4 — Formatting via next-intl formatters behind a thin helper

Locale-correct dates/numbers/relative-times go through next-intl's `useFormatter` /
`getFormatter` (server) rather than ad-hoc `Intl.*` or `toLocaleString` calls. A small
`lib/i18n/format.ts` (or documented convention) centralizes the common formats so feature code
calls one helper and never hand-passes a locale.

- *Alternatives considered:* raw `Intl.DateTimeFormat`/`NumberFormat` per call site (locale
  threading by hand, easy to get inconsistent, untyped formats).

### D5 — Offline-testable correctness: key parity + taxonomy coverage

Two deterministic unit tests anchor the gate (TDD, test-first): (a) **key parity** — every key in
`en.json` exists in `uk.json` and vice-versa; (b) **taxonomy coverage** — for every category enum
member and every one of the 8 bias identifiers, a `Taxonomy.*` label exists in both catalogs.
next-intl's TypeScript augmentation (typed messages) provides compile-time key checking as a
second layer. Together these satisfy "Message catalog completeness" without any runtime/model
dependency.

- *Alternatives considered:* relying solely on next-intl type augmentation (catches referenced
  keys at compile time, but not catalog-to-catalog parity or unused-but-required taxonomy keys);
  runtime missing-key warnings (not a gate — surfaces in production, which the spec forbids).

## Risks / Trade-offs

- **Relocating routes under `[locale]` touches the only existing pages** → trivially small now
  (one layout + one page, no public contract); doing it before feature work is precisely why this
  change is sequenced first.
- **Catalog drift between `en` and `uk` as features grow** → the key-parity + taxonomy-coverage
  unit tests fail the gate on any missing key; typed messages catch referenced-key typos at
  compile time.
- **Ukrainian translations may be placeholder-quality at first** → acceptable for the foundation;
  keys and structure are what later feature changes depend on, and copy can be refined without
  structural change. Track as an open item, not a blocker.
- **Default-locale URL ergonomics** (`/` vs `/en`) → deferred (D2); using the standard prefix
  behavior avoids redirect edge-cases now; revisit only if the demo UX needs the bare path.
- **Middleware matcher scope** → must exclude API routes, static assets, and `_next`; a wrong
  matcher can intercept non-page requests. Mitigated by following next-intl's documented matcher
  and an e2e locale-switch check later (out of scope here).

## Migration Plan

Greenfield — no data migration. Steps: (1) add `next-intl`; (2) create `lib/i18n/`
(`routing.ts`, `navigation.ts`, `request.ts`, `format.ts`) and `middleware.ts`; (3) move
`app/layout.tsx`/`app/page.tsx` under `app/[locale]/` and wire `NextIntlClientProvider`;
(4) add `messages/en.json` + `messages/uk.json`; (5) add the `LanguageSwitcher`; (6) add the
parity/coverage unit tests (written first per TDD). Rollback is reverting the commit — no schema
or external state involved.

## Open Questions

- Should the default locale render at `/` (no prefix) for the demo, or keep `/en`? (Deferred per
  D2; default to the standard prefixed behavior unless product wants the bare path.)
- Who owns final Ukrainian copy review (native pass) before the public demo? Foundation ships with
  complete keys; copy quality is tracked separately.
