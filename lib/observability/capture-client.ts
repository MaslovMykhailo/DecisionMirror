import posthog from "posthog-js";

import type { AnalyticsEventMap } from "@/lib/observability/capture";
import { scrubProperties } from "@/lib/observability/scrub";

/** Taxonomy events emitted from the browser (view + mode + locale). */
export type ClientAnalyticsEventName =
  | "dashboard_viewed"
  | "dashboard_mode_changed"
  | "locale_switched";

/**
 * Emit a client-side taxonomy event through the browser PostHog client. A no-op until
 * the client has initialized (no key configured ⇒ never loaded). Properties are scrubbed
 * as a defense-in-depth backstop so prose never reaches PostHog.
 */
export function captureClientEvent<E extends ClientAnalyticsEventName>(
  name: E,
  props: AnalyticsEventMap[E],
): void {
  if (!posthog.__loaded) return;
  posthog.capture(name, scrubProperties(props));
}
