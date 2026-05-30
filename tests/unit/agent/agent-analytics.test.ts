import { describe, expect, it, vi } from "vitest";

import {
  invalidAnalysisOutputs,
  validAnalysisOutput,
} from "@/tests/support/fixtures/analysis-output";

vi.mock("server-only", () => ({}));

function createDb() {
  return {
    decision: {
      findUnique: vi.fn().mockResolvedValue({
        id: "decision_1",
        userId: "user_1",
        situation: "Should I accept the new role?",
        decision: "Accept the offer.",
        reasoning: "It has more scope.",
      }),
    },
    analysis: {
      findFirst: vi.fn().mockResolvedValue({ id: "analysis_1", version: 1, locale: "en" }),
      update: vi.fn().mockResolvedValue({ id: "analysis_1" }),
    },
  };
}

// Clock that advances 5s between the load-memory (start) and persist (ready) reads.
function sequentialClock(values: string[]) {
  let i = 0;
  return () => new Date(values[Math.min(i++, values.length - 1)]!);
}

function createAnalytics() {
  return { started: vi.fn(), ready: vi.fn(), failed: vi.fn() };
}

describe("agent analytics emission", () => {
  it("emits analysis_started then analysis_ready with duration, counts, and complexity", async () => {
    const db = createDb();
    const provider = { analyzeDecision: vi.fn().mockResolvedValue(validAnalysisOutput) };
    const analytics = createAnalytics();
    const now = sequentialClock(["2026-05-30T12:00:00.000Z", "2026-05-30T12:00:05.000Z"]);
    const { runAgent } = await import("@/agent");

    await runAgent("decision_1", { db, provider, analytics, now });

    expect(analytics.started).toHaveBeenCalledWith({ distinctId: "user_1", version: 1 });
    expect(analytics.ready).toHaveBeenCalledWith({
      distinctId: "user_1",
      duration_ms: 5000,
      bias_count: 2,
      complexity: 4,
    });
    expect(analytics.failed).not.toHaveBeenCalled();
  });

  it("emits analysis_failed with reason_class 'validation' on contract failure", async () => {
    const db = createDb();
    const provider = {
      analyzeDecision: vi.fn().mockResolvedValue(invalidAnalysisOutputs.unknownCategory),
    };
    const analytics = createAnalytics();
    const { runAgent } = await import("@/agent");

    await runAgent("decision_1", { db, provider, analytics });

    expect(analytics.failed).toHaveBeenCalledWith({
      distinctId: "user_1",
      reason_class: "validation",
    });
    expect(analytics.ready).not.toHaveBeenCalled();
  });

  it("emits analysis_failed with reason_class 'provider' when the provider throws", async () => {
    const db = createDb();
    const provider = {
      analyzeDecision: vi.fn().mockRejectedValue(new Error("provider unavailable")),
    };
    const analytics = createAnalytics();
    const { runAgent } = await import("@/agent");

    await runAgent("decision_1", { db, provider, analytics });

    expect(analytics.failed).toHaveBeenCalledWith({
      distinctId: "user_1",
      reason_class: "provider",
    });
  });
});
