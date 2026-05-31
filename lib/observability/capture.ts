import type { DecisionCategory } from "@/lib/taxonomy";
import { scrubProperties } from "@/lib/observability/scrub";

/**
 * The business event taxonomy and the exact privacy-safe property shape each event
 * carries. The map is the single source of truth: `captureEvent` is generic over it,
 * so a call site cannot emit an unknown event or attach a property the taxonomy does
 * not define. Every property here is an id, enum, status, count, duration, or boolean —
 * never prose.
 */
export type AnalyticsEventMap = {
  decision_created: { category?: DecisionCategory; has_reasoning: boolean };
  analysis_started: { version: number };
  analysis_ready: { duration_ms: number; bias_count: number; complexity: number };
  analysis_failed: { reason_class: string };
  analysis_retried: { trigger: "manual" | "stalled" };
  reanalysis_run: { prior_version: number };
  dashboard_viewed: Record<string, never>;
  dashboard_mode_changed: { mode: "latest" | "all" };
  locale_switched: { from: string; to: string };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;

/** Minimal shape of the `posthog-node` client the wrapper depends on. */
export type CaptureClient = {
  capture: (args: {
    distinctId: string;
    event: string;
    properties?: Record<string, unknown>;
  }) => void;
};

export type CaptureContext = {
  distinctId?: string;
  /**
   * The capture client. Pass `null` to force a no-op (e.g. no PostHog key). Omit to
   * resolve the server singleton lazily, which itself returns `null` without a key.
   */
  client?: CaptureClient | null;
};

const ANONYMOUS_DISTINCT_ID = "anonymous";

async function resolveClient(context: CaptureContext): Promise<CaptureClient | null> {
  if ("client" in context) return context.client ?? null;
  const { getServerPostHogClient } = await import("@/lib/observability/posthog-server");
  return getServerPostHogClient();
}

/**
 * Emit a business event, identified to the authenticated user where present. Properties
 * are scrubbed as a second line of defense, so prose never reaches PostHog even if a
 * call site mis-types its payload. A no-op when no client is configured.
 */
export async function captureEvent<E extends AnalyticsEventName>(
  name: E,
  props: AnalyticsEventMap[E],
  context: CaptureContext = {},
): Promise<void> {
  const client = await resolveClient(context);
  if (!client) return;

  client.capture({
    distinctId: context.distinctId ?? ANONYMOUS_DISTINCT_ID,
    event: name,
    properties: scrubProperties(props),
  });
}
