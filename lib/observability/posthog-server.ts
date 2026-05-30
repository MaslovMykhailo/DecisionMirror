import "server-only";

import { PostHog } from "posthog-node";

import type { CaptureClient } from "@/lib/observability/capture";

/**
 * Server-side PostHog client (`posthog-node`). It is the source of truth for pipeline
 * lifecycle events, which fire in `after()`/server code where the browser client is
 * absent. A singleton so we reuse one batching queue across a serverless invocation.
 *
 * Returns `null` when no key is configured, so local and test runs make no network
 * calls (the typed `captureEvent` wrapper treats a null client as a no-op).
 */
let client: (CaptureClient & { flush: () => Promise<void> }) | null | undefined;

function createClient(): (CaptureClient & { flush: () => Promise<void> }) | null {
  const key = process.env.POSTHOG_KEY;
  if (!key) return null;

  return new PostHog(key, {
    host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
    // Flush is driven explicitly inside the after()/waitUntil window;
    // keep the background flusher from racing serverless teardown.
    flushAt: 1,
    flushInterval: 0,
  }) as unknown as CaptureClient & { flush: () => Promise<void> };
}

export function getServerPostHogClient(): CaptureClient | null {
  if (client === undefined) client = createClient();
  return client;
}

/** Flush queued server events; safe to call when no client is configured. */
export async function flushServerPostHog(): Promise<void> {
  if (client) await client.flush();
}

/** Reset the memoized client — test-only seam. */
export function resetServerPostHogClient(): void {
  client = undefined;
}
