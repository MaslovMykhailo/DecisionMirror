import "server-only";

import * as Sentry from "@sentry/nextjs";

import type { AgentFailureReporter } from "@/agent/nodes";

/**
 * Default agent failure reporter backed by Sentry. Every value attached here is an id,
 * enum, or class label — never decision/analysis prose — and the central `beforeSend`
 * scrub is the backstop. Stalled analyses are reported as a distinct message so they
 * surface separately from agent exceptions.
 */
export const sentryAgentReporter: AgentFailureReporter = {
  captureAgentFailure({ decisionId, node, failureClass, error }) {
    Sentry.captureException(error ?? new Error(`Agent failure at ${node}`), {
      tags: { node, failure_class: failureClass, signal: "agent_failure" },
      extra: { decisionId },
    });
  },
  captureStalledAnalysis({ decisionId, analysisId, version }) {
    Sentry.captureMessage("analysis_stalled", {
      level: "warning",
      tags: { signal: "analysis_stalled" },
      extra: { decisionId, analysisId, version },
    });
  },
};
