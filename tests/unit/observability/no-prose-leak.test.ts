import { describe, expect, it, vi } from "vitest";

import {
  invalidAnalysisOutputs,
  validAnalysisOutput,
} from "@/tests/support/fixtures/analysis-output";

vi.mock("server-only", () => ({}));

// Distinctive prose planted in every free-form decision field. No telemetry payload
// across any of the three sinks may ever contain it.
const PROSE = "ZZZ secret decision prose that must never leave ZZZ";

function createDb() {
  return {
    decision: {
      findUnique: vi.fn().mockResolvedValue({
        id: "decision_1",
        userId: "user_1",
        situation: `${PROSE} situation`,
        decision: `${PROSE} decision`,
        reasoning: `${PROSE} reasoning`,
      }),
    },
    analysis: {
      findFirst: vi.fn().mockResolvedValue({ id: "analysis_1", version: 1, locale: "en" }),
      update: vi.fn().mockResolvedValue({ id: "analysis_1" }),
    },
  };
}

function recordedArgs(...mocks: Array<{ mock: { calls: unknown[][] } }>) {
  return JSON.stringify(mocks.flatMap((m) => m.mock.calls));
}

describe("no decision/analysis prose reaches any observability sink", () => {
  it("keeps prose out of PostHog analytics and Sentry reporting on a successful run", async () => {
    const analytics = { started: vi.fn(), ready: vi.fn(), failed: vi.fn() };
    const reporter = { captureAgentFailure: vi.fn(), captureStalledAnalysis: vi.fn() };
    const memory = {
      recall: vi.fn().mockResolvedValue({ patterns: [`${PROSE} pattern`], recalledIds: ["mem_1"] }),
      remember: vi.fn(),
    };
    const provider = { analyzeDecision: vi.fn().mockResolvedValue(validAnalysisOutput) };
    const { runAgent } = await import("@/agent");

    await runAgent("decision_1", { db: createDb(), provider, memory, analytics, reporter });

    expect(recordedArgs(analytics.started, analytics.ready, analytics.failed)).not.toContain(PROSE);
    expect(
      recordedArgs(reporter.captureAgentFailure, reporter.captureStalledAnalysis),
    ).not.toContain(PROSE);
    expect(analytics.ready).toHaveBeenCalledTimes(1);
  });

  it("keeps prose out of telemetry on a failed (validation) run", async () => {
    const analytics = { started: vi.fn(), ready: vi.fn(), failed: vi.fn() };
    const reporter = { captureAgentFailure: vi.fn(), captureStalledAnalysis: vi.fn() };
    const provider = {
      analyzeDecision: vi.fn().mockResolvedValue(invalidAnalysisOutputs.unknownCategory),
    };
    const { runAgent } = await import("@/agent");

    await runAgent("decision_1", { db: createDb(), provider, analytics, reporter });

    expect(recordedArgs(analytics.started, analytics.ready, analytics.failed)).not.toContain(PROSE);
    expect(recordedArgs(reporter.captureAgentFailure)).not.toContain(PROSE);
  });

  it("strips prose from the Sentry beforeSend hook and LangSmith run metadata", async () => {
    const { scrubSentryEvent } = await import("@/lib/observability/sentry");
    const { attachRunMetadata } = await import("@/lib/observability/langsmith");

    const event = scrubSentryEvent({
      extra: { decisionId: "decision_1", situation: PROSE },
      contexts: { analysis: { version: 1, reasoning: PROSE } },
    });
    expect(JSON.stringify(event)).not.toContain(PROSE);

    const config: { metadata?: Record<string, unknown> } = {};
    attachRunMetadata(config, { recalledMemoryIds: ["mem_1"], summary: PROSE });
    expect(JSON.stringify(config.metadata)).not.toContain(PROSE);
  });
});
