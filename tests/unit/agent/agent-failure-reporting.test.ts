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

describe("runAgent failure reporting to Sentry", () => {
  it("reports a provider/runtime failure with decisionId, failing node, and class", async () => {
    const db = createDb();
    const provider = {
      analyzeDecision: vi.fn().mockRejectedValue(new Error("provider unavailable")),
    };
    const reporter = { captureAgentFailure: vi.fn(), captureStalledAnalysis: vi.fn() };
    const { runAgent } = await import("@/agent");

    await runAgent("decision_1", { db, provider, reporter });

    expect(reporter.captureAgentFailure).toHaveBeenCalledTimes(1);
    expect(reporter.captureAgentFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        decisionId: "decision_1",
        node: "analyze",
        failureClass: "provider",
      }),
    );
  });

  it("reports a validation failure with the validate node and validation class", async () => {
    const db = createDb();
    const provider = {
      analyzeDecision: vi.fn().mockResolvedValue(invalidAnalysisOutputs.unknownCategory),
    };
    const reporter = { captureAgentFailure: vi.fn(), captureStalledAnalysis: vi.fn() };
    const { runAgent } = await import("@/agent");

    await runAgent("decision_1", { db, provider, reporter });

    expect(reporter.captureAgentFailure).toHaveBeenCalledTimes(1);
    expect(reporter.captureAgentFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        decisionId: "decision_1",
        node: "validate",
        failureClass: "validation",
      }),
    );
  });

  it("does not report when analysis succeeds", async () => {
    const db = createDb();
    const provider = { analyzeDecision: vi.fn().mockResolvedValue(validAnalysisOutput) };
    const reporter = { captureAgentFailure: vi.fn(), captureStalledAnalysis: vi.fn() };
    const { runAgent } = await import("@/agent");

    await runAgent("decision_1", { db, provider, reporter });

    expect(reporter.captureAgentFailure).not.toHaveBeenCalled();
  });
});
