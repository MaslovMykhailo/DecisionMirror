import type { ErrorEvent, EventHint } from "@sentry/nextjs";

import { resolveSentryRelease } from "@/lib/observability/release";
import { scrubProperties } from "@/lib/observability/scrub";

export { resolveSentryRelease };

/**
 * Central Sentry configuration shared by all three runtime entry points
 * (`instrumentation.ts` server/edge + `instrumentation-client.ts`). Keeping init
 * options and the PII scrub in one place means the non-negotiable "no decision text in
 * Sentry" rule is enforced once, regardless of where an event originates.
 */

// Minimal structural view of the Sentry event we touch in beforeSend. The real type
// from @sentry/nextjs is broader; we only scrub the user-controlled containers.
export type ScrubbableSentryEvent = {
  extra?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  [key: string]: unknown;
};

/**
 * `beforeSend` hook: scrub the user-controlled event containers (`extra`, `tags`,
 * `contexts`) through the shared allowlist so decision/analysis prose never leaves.
 */
export function scrubSentryEvent(event: ScrubbableSentryEvent): ScrubbableSentryEvent {
  const scrubbed: ScrubbableSentryEvent = { ...event };
  if (event.extra) scrubbed.extra = scrubProperties(event.extra);
  if (event.tags) scrubbed.tags = scrubProperties(event.tags);
  if (event.contexts) scrubbed.contexts = scrubProperties(event.contexts);
  return scrubbed;
}

export type SentryInitOptions = {
  dsn: string | undefined;
  enabled: boolean;
  release: string | undefined;
  tracesSampleRate: number;
  beforeSend: (event: ErrorEvent, hint?: EventHint) => ErrorEvent;
};

/**
 * Build the options passed to `Sentry.init` in every runtime. When no DSN is
 * configured the SDK is disabled, so local and test runs neither send events nor throw.
 */
export function sentryInitOptions(env?: Record<string, string | undefined>): SentryInitOptions {
  const dsn = env?.NEXT_PUBLIC_SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? undefined;
  return {
    dsn,
    enabled: Boolean(dsn),
    release: resolveSentryRelease(env),
    tracesSampleRate: 1.0,
    beforeSend: (event) =>
      scrubSentryEvent(event as unknown as ScrubbableSentryEvent) as unknown as ErrorEvent,
  };
}
