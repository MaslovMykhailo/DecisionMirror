type SentryEnv = Record<string, string | undefined>;

/**
 * Release identifier derived from the deploy's git SHA, for release-health attribution.
 *
 * Kept in its own dependency-free module so it can be imported from `next.config.ts`.
 * Next's config loader does not apply tsconfig path aliases, so pulling this through
 * `sentry.ts` (which imports the scrub allowlist via `@/`) would fail to resolve.
 */
export function resolveSentryRelease(env: SentryEnv = process.env): string | undefined {
  return env.SENTRY_RELEASE || env.VERCEL_GIT_COMMIT_SHA || env.GIT_COMMIT_SHA || undefined;
}
